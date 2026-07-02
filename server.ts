import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
let supabase: any = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log("Supabase Client initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Supabase Client:", error);
  }
} else {
  console.warn("Supabase credentials not found. Falling back to LocalStorage persistence.");
}

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini API Client initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Gemini API Client:", error);
  }
} else {
  console.warn("GEMINI_API_KEY is not defined. Falling back to local parser.");
}

// ==========================================
// Local Offline Helper Functions (Robust fallback for Gemini API 503/errors)
// ==========================================

function getLocalAnalysis(userInput: string, projects: any[], tasks: any[], userName: string) {
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const text = (userInput || "").toLowerCase();
  let responseText = `状況を把握しました、${userName}さん。`;
  let newProjectProposal = null;
  const updatedProjects: any[] = [];
  const createdTasks: any[] = [];
  const completedTaskIds: string[] = [];

  // Simple matching fallback for the demo/fallback mode
  if (text.includes("050call")) {
    responseText = `050call of 作業ですね。進捗を反映しておきます。`;
    const proj = safeProjects.find((p: any) => p && p.name && p.name.includes("050call"));
    if (proj) {
      updatedProjects.push({
        id: proj.id,
        progress_percent: Math.min(100, (proj.progress_percent || 0) + 10),
        last_worked_at: new Date().toISOString(),
      });
    }
    if (text.includes("エラー") || text.includes("error")) {
      const task = safeTasks.find((t: any) => t && t.title && t.title.includes("エラーハンドリング") && !t.done);
      if (task) {
        completedTaskIds.push(task.id);
      }
    }
  } else if (text.includes("concertante")) {
    responseText = `CONCERTANTEの進行状況を更新しました。着実に進んでいますね。`;
    const proj = safeProjects.find((p: any) => p && p.name && p.name.toLowerCase().includes("concertante"));
    if (proj) {
      updatedProjects.push({
        id: proj.id,
        progress_percent: Math.min(100, (proj.progress_percent || 0) + 5),
        last_worked_at: new Date().toISOString(),
      });
    }
  } else if (text.includes("日記") || text.includes("ブラジル")) {
    responseText = `ブラジル日記ですね。文章の作成を記録しました。`;
    const proj = safeProjects.find((p: any) => p && p.name && p.name.includes("ブラジル日記"));
    if (proj) {
      updatedProjects.push({
        id: proj.id,
        progress_percent: Math.min(100, (proj.progress_percent || 0) + 15),
        last_worked_at: new Date().toISOString(),
      });
    }
  } else if (text.includes("年表") || text.includes("神の栄光")) {
    responseText = `神の栄光の年表ですね。丁寧な記録、素晴らしいです。`;
    const proj = safeProjects.find((p: any) => p && p.name && p.name.includes("年表"));
    if (proj) {
      updatedProjects.push({
        id: proj.id,
        progress_percent: Math.min(100, (proj.progress_percent || 0) + 8),
        last_worked_at: new Date().toISOString(),
      });
    }
  } else {
    // Propose new project if some random name appears
    const words = (userInput || "").split(/[、。\s]+/);
    const potentialName = words[0] || "新規プロジェクト";
    if (potentialName.length > 2 && potentialName.length < 15) {
      newProjectProposal = {
        name: potentialName,
        type: "code" as const,
      };
      responseText = `『${potentialName}』ですね。これは新しいプロジェクトとして登録しますか？`;
    }
  }

  return {
    responseText,
    newProjectProposal,
    updatedProjects,
    createdTasks,
    completedTaskIds,
  };
}

function getLocalSuggestion(projects: any[], tasks: any[]) {
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const activeTasks = safeTasks.filter((t: any) => t && !t.done);
  if (activeTasks.length > 0) {
    // Choose highest priority, or first task
    const highPrio = activeTasks.find((t: any) => t && t.priority === "high");
    const selected = highPrio || activeTasks[0];
    const project = safeProjects.find((p: any) => p && p.id === selected.project_id);
    return {
      task: selected,
      reason: `優先度の高い『${project?.name || ""}』のタスクをおすすめします。`
    };
  } else {
    // Generate a default task suggestion
    const activeProj = safeProjects[0] || { id: "default", name: "マイプロジェクト", type: "code" };
    return {
      task: {
        id: "temp-suggested",
        project_id: activeProj.id,
        title: activeProj.type === "code" ? "技術スタックと主要エンドポイントの整理" : "全体の章構成の組み立て",
        estimated_minutes: 25,
        priority: "medium",
        ai_assignee: activeProj.type === "code" ? "claude" : "chatgpt",
        done: false,
      },
      reason: `プロジェクト『${activeProj.name}』の次のステップとして最適です。`
    };
  }
}

function getLocalSchedule(projects: any[], tasks: any[], userName: string, events: any[] = []) {
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const activeTasks = safeTasks.filter((t: any) => t && !t.done);

  // Sort tasks: high priority first, then medium, then low
  const sortedTasks = [...activeTasks].sort((a, b) => {
    const prioValue = { high: 3, medium: 2, low: 1 };
    const aPrio = prioValue[a.priority as "high" | "medium" | "low"] || 2;
    const bPrio = prioValue[b.priority as "high" | "medium" | "low"] || 2;
    if (aPrio !== bPrio) return bPrio - aPrio;

    const projA = safeProjects.find((p) => p.id === a.project_id);
    const projB = safeProjects.find((p) => p.id === b.project_id);
    if (projA?.deadline && projB?.deadline) {
      return new Date(projA.deadline).getTime() - new Date(projB.deadline).getTime();
    }
    if (projA?.deadline) return -1;
    if (projB?.deadline) return 1;

    const progA = projA?.progress_percent || 0;
    const progB = projB?.progress_percent || 0;
    return progB - progA;
  });

  const schedule: any[] = [];
  let blockCounter = 0;

  // Filter events for "2026-07-01"
  const todayEvents = (events || [])
    .filter((e: any) => e && e.date === "2026-07-01")
    .sort((a: any, b: any) => {
      const timeA = a.time || "00:00";
      const timeB = b.time || "00:00";
      return timeA.localeCompare(timeB);
    });

  let currentMins = 540; // 09:00 in minutes
  let taskIndex = 0;
  let scheduledLunch = false;

  const toMins = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const toTimeStr = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  // Morning kick-off
  schedule.push({
    id: `sc-morning-${blockCounter++}`,
    time: `${toTimeStr(currentMins)} - ${toTimeStr(currentMins + 15)}`,
    title: "1日のキックオフとタスク整理",
    type: "review",
    task_id: null,
    project_id: null,
    duration_minutes: 15,
    reason: "今日のスケジュールと目標を確認し、スムーズなスタートを切ります。"
  });
  currentMins += 15;

  let remainingEvents = [...todayEvents];

  while (currentMins < 1050) { // Keep going until 17:30
    // 1. Handle Lunch Break at or around 12:00 (720 mins)
    if (currentMins >= 720 && !scheduledLunch) {
      const lunchStart = currentMins;
      const lunchEnd = lunchStart + 60;
      schedule.push({
        id: `sc-lunch-${blockCounter++}`,
        time: `${toTimeStr(lunchStart)} - ${toTimeStr(lunchEnd)}`,
        title: "昼食・お昼休み",
        type: "lunch",
        task_id: null,
        project_id: null,
        duration_minutes: 60,
        reason: "午後のエネルギー補給のためにしっかり休憩をとりましょう。"
      });
      currentMins = lunchEnd;
      scheduledLunch = true;
      continue;
    }

    // 2. Check if we have an upcoming user calendar event starting soon (within 20 mins or already passed)
    let eventToSchedule: any = null;
    let eventToScheduleIdx = -1;

    for (let i = 0; i < remainingEvents.length; i++) {
      const ev = remainingEvents[i];
      if (ev.time) {
        const evStart = toMins(ev.time);
        if (evStart <= currentMins + 20) {
          eventToSchedule = ev;
          eventToScheduleIdx = i;
          break;
        }
      }
    }

    if (eventToSchedule) {
      const evStart = toMins(eventToSchedule.time);
      // If there's a gap before the event starts, fill it with a quick review or transition
      if (evStart > currentMins) {
        const gap = evStart - currentMins;
        schedule.push({
          id: `sc-gap-${blockCounter++}`,
          time: `${toTimeStr(currentMins)} - ${toTimeStr(evStart)}`,
          title: "準備 & 移動・待機",
          type: "transit",
          task_id: null,
          project_id: null,
          duration_minutes: gap,
          reason: "次の予定に遅れないよう、余裕を持って移動・準備を行います。"
        });
        currentMins = evStart;
      }

      const duration = eventToSchedule.duration_minutes || 30;
      const evEnd = currentMins + duration;
      const proj = safeProjects.find((p) => p.id === eventToSchedule.project_id);

      schedule.push({
        id: `sc-event-${eventToSchedule.id}-${blockCounter++}`,
        time: `${toTimeStr(currentMins)} - ${toTimeStr(evEnd)}`,
        title: eventToSchedule.title,
        type: eventToSchedule.type || "work",
        task_id: null,
        project_id: eventToSchedule.project_id || null,
        duration_minutes: duration,
        reason: eventToSchedule.description || "カレンダーに登録された確定スケジュールです。"
      });

      currentMins = evEnd;
      remainingEvents.splice(eventToScheduleIdx, 1);
      continue;
    }

    // 3. Normal work/break scheduling
    // Determine how much free time we have before the next big milestone (lunch or next event or 17:30)
    let limitMins = 1050; // default to 17:30
    if (!scheduledLunch && currentMins < 720) {
      limitMins = Math.min(limitMins, 720);
    }
    if (remainingEvents.length > 0 && remainingEvents[0].time) {
      limitMins = Math.min(limitMins, toMins(remainingEvents[0].time));
    }

    const available = limitMins - currentMins;

    if (available >= 25) {
      if (taskIndex < sortedTasks.length) {
        const task = sortedTasks[taskIndex];
        const proj = safeProjects.find((p) => p.id === task.project_id);
        const duration = Math.min(task.estimated_minutes || 25, available, 60);

        const isTransit = task.title.includes("移動") || 
                          task.title.includes("訪問") || 
                          task.title.includes("外出") || 
                          task.title.includes("直行") || 
                          task.title.includes("出張") || 
                          task.title.includes("帰宅");

        schedule.push({
          id: `sc-task-${task.id}-${blockCounter++}`,
          time: `${toTimeStr(currentMins)} - ${toTimeStr(currentMins + duration)}`,
          title: `${proj?.name || "その他"}: ${task.title}`,
          type: isTransit ? "transit" : "work",
          task_id: task.id,
          project_id: task.project_id,
          duration_minutes: duration,
          reason: isTransit 
            ? "外出・移動時間を適切にスケジューリングしています。"
            : (proj?.deadline 
                ? `締切（${proj.deadline}）が設定された重要プロジェクトです。` 
                : `進捗状況（${proj?.progress_percent || 0}%）と優先度を考慮したタスク配分です。`)
        });

        currentMins += duration;
        taskIndex++;

        // Push small break if space remains
        if (limitMins - currentMins >= 15) {
          schedule.push({
            id: `sc-break-${blockCounter++}`,
            time: `${toTimeStr(currentMins)} - ${toTimeStr(currentMins + 10)}`,
            title: "小休憩（リフレッシュ）",
            type: "break",
            task_id: null,
            project_id: null,
            duration_minutes: 10,
            reason: "集中力を維持するための最適な脳のリフレッシュ時間です。"
          });
          currentMins += 10;
        }
      } else {
        // No more tasks, put buffer block
        const duration = Math.min(available, 60);
        schedule.push({
          id: `sc-catchup-${blockCounter++}`,
          time: `${toTimeStr(currentMins)} - ${toTimeStr(currentMins + duration)}`,
          title: "予備時間・自由バッファ",
          type: "review",
          task_id: null,
          project_id: null,
          duration_minutes: duration,
          reason: "予定が押しそうな場合のバッファ、または未完了タスクの処理時間です。"
        });
        currentMins += duration;
      }
    } else if (available > 0) {
      // Small adjust gap
      schedule.push({
        id: `sc-adjust-${blockCounter++}`,
        time: `${toTimeStr(currentMins)} - ${toTimeStr(limitMins)}`,
        title: "ミニ休憩・準備",
        type: "break",
        task_id: null,
        project_id: null,
        duration_minutes: available,
        reason: "次の時間枠に合わせるための調整休憩時間です。"
      });
      currentMins = limitMins;
    } else {
      // Just in case we get stuck, force increment to avoid infinite loop
      currentMins += 15;
    }
  }

  // Evening Wrap-up (17:30 - 18:00)
  const eveningStart = Math.max(1050, currentMins);
  schedule.push({
    id: `sc-evening-${blockCounter++}`,
    time: `${toTimeStr(eveningStart)} - ${toTimeStr(eveningStart + 30)}`,
    title: "1日のふり返りと終業準備",
    type: "review",
    task_id: null,
    project_id: null,
    duration_minutes: 30,
    reason: "今日完了したタスクをふり返り、翌日の計画をテモテに報告する準備をします。"
  });

  const advice = todayEvents.length > 0 
    ? `${userName}さん、本日はカレンダーに登録された ${todayEvents.length} 件の予定を軸に、前後の隙間時間を活用してタスクを進めるスケジュールを編成しました。移動時間やお昼休みを綺麗に確保し、最も脳が活発な午前中に主要タスクをはめ込んでいます。`
    : `${userName}さん、本日は進捗率と優先度のバランスを考慮したスケジュールを組みました。午前中に最もエネルギーを使うタスクを配置し、午後には中優先度のタスクを着実に進める構成です。無理のない休憩を挟むことで、持続的なパフォーマンスを期待できます。`;

  return { schedule, advice };
}

// ==========================================
// API Routes
// ==========================================

// 1. Analyze unstructured daily status updates
app.post("/api/temote/analyze", async (req, res) => {
  const { userInput, projects: rawProjects, tasks: rawTasks, settings } = req.body;
  const projects = Array.isArray(rawProjects) ? rawProjects : [];
  const tasks = Array.isArray(rawTasks) ? rawTasks : [];
  const userName = settings?.name || "ジョアンナ";

  if (!userInput || userInput.trim() === "") {
    return res.status(400).json({ error: "Input is empty" });
  }

  // Fallback local logic if Gemini is not available
  if (!ai) {
    const fallbackResult = getLocalAnalysis(userInput, projects, tasks, userName);
    return res.json(fallbackResult);
  }

  // Gemini API analysis
  try {
    const systemPrompt = `あなたは優秀で控えめなAI秘書「テモテ」です。
ユーザー名: ${userName}
今日の日付: ${new Date().toLocaleDateString("ja-JP")}

【秘書テモテのペルソナ・ルール】
- あなたは秘書であり、説教をしません。
- 長文は厳禁。相手を気遣いつつ、簡潔に一言、二言だけ（50文字以内）で返答します。
- ユーザーの雑な入力から、「どのプロジェクトに関する作業か」「何が進んだか（タスク完了）」「何が新しいタスクか」を識別します。

【既存のプロジェクト一覧】
${JSON.stringify(projects, null, 2)}

【既存の未完了タスク一覧】
${JSON.stringify(tasks.filter((t: any) => !t.done), null, 2)}

ユーザーから入力された現状報告テキストを解析し、以下の項目を含むJSONオブジェクトを厳密に生成してください：
1. responseText: ユーザーへの1〜2言の簡潔で温かみのある返答メッセージ（日本語）。
2. newProjectProposal: 入力内容に既存プロジェクトにない新しいプロジェクトの開発/作成が語られている場合、提案用オブジェクトを作成します。確証がない場合はnullにしてください。
3. updatedProjects: 今回の報告で進捗があったプロジェクト。progress_percent（100を超えない）およびlast_worked_atを更新して返します。
4. createdTasks: 入力から読み取れる、新しく追加すべき次の具体的なタスクや、これからやる予定のタスク。
5. completedTaskIds: 今回報告された内容で、すでに完了したと思われる既存タスクのID。

【出力JSONの形式】
指定された responseSchema に従って、余計なマークダウン文字や解説を一切含めず、純粋なJSONのみを返してください。`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          text: `ユーザー報告: "${userInput}"`
        }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            responseText: {
              type: Type.STRING,
              description: "ユーザーへの1〜2言のシンプルで丁寧な秘書の返答（日本語）。"
            },
            newProjectProposal: {
              type: Type.OBJECT,
              nullable: true,
              description: "新規プロジェクトの提案（該当がなければnull）",
              properties: {
                name: { type: Type.STRING, description: "プロジェクト名" },
                type: { type: Type.STRING, enum: ["code", "writing"], description: "プロジェクトの種別" }
              },
              required: ["name", "type"]
            },
            updatedProjects: {
              type: Type.ARRAY,
              description: "進捗があった既存プロジェクト",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  progress_percent: { type: Type.INTEGER, description: "新しい進捗率（0-100）" },
                  last_worked_at: { type: Type.STRING, description: "現在時刻のISO文字列" }
                },
                required: ["id", "progress_percent", "last_worked_at"]
              }
            },
            createdTasks: {
              type: Type.ARRAY,
              description: "新しく作成するタスク",
              items: {
                type: Type.OBJECT,
                properties: {
                  project_id: { type: Type.STRING, description: "紐づくプロジェクトID。新規プロジェクトの場合は空文字にしてください。" },
                  title: { type: Type.STRING, description: "タスクの具体的なタイトル" },
                  estimated_minutes: { type: Type.INTEGER, description: "予想所要時間（分）" },
                  priority: { type: Type.STRING, enum: ["high", "medium", "low"], description: "優先度" },
                  ai_assignee: { type: Type.STRING, enum: ["claude", "gemini", "chatgpt"], description: "タスク種別に基づく担当AI（コード/実装はclaude、文章/記録はclaudeかchatgpt、画像/デザインはgemini、意思決定はgemini）" }
                },
                required: ["project_id", "title", "estimated_minutes", "priority", "ai_assignee"]
              }
            },
            completedTaskIds: {
              type: Type.ARRAY,
              description: "完了した既存タスクのID一覧",
              items: { type: Type.STRING }
            }
          },
          required: ["responseText", "newProjectProposal", "updatedProjects", "createdTasks", "completedTaskIds"]
        }
      }
    });

    const resultText = response.text || "{}";
    const parsed = JSON.parse(resultText);
    res.json(parsed);
  } catch (error: any) {
    // Graceful fallback to local rule-based analysis on Gemini API Error/503
    const fallbackResult = getLocalAnalysis(userInput, projects, tasks, userName);
    res.json(fallbackResult);
  }
});

// 2. Suggest today's single best task based on 5 rules
app.post("/api/temote/suggest", async (req, res) => {
  const { projects: rawProjects, tasks: rawTasks, settings, lastCompletedTask } = req.body;
  const projects = Array.isArray(rawProjects) ? rawProjects : [];
  const tasks = Array.isArray(rawTasks) ? rawTasks : [];
  const userName = settings?.name || "ジョアンナ";

  if (projects.length === 0) {
    return res.json({
      task: null,
      reason: "プロジェクトが登録されていません。まずは現状入力欄にプロジェクトの状況を書き込んでみましょう。"
    });
  }

  if (!ai) {
    const fallbackResult = getLocalSuggestion(projects, tasks);
    return res.json(fallbackResult);
  }

  try {
    const systemPrompt = `あなたは優秀で謙虚なAI秘書「テモテ」です。
今日、ユーザーが取り組むべき『たった一つのタスク』を以下の優先順位（提案ロジック）に基づいて選び、または新しく考案してください：

【提案ロジックの優先順位】
1. 完成まで近いもの (進捗 progress_percent が 80%〜90% などの高いプロジェクトのタスク)
2. 締切が近いもの (deadline が近いプロジェクトやタスク)
3. 効果が大きいもの (priority が high のタスク)
4. 所要時間が短いもの (短い時間、例えば15〜25分で片付くタスク)
5. ユーザーが最近興味を持っているもの (last_worked_at が最近のプロジェクト)

【既存プロジェクト】
${JSON.stringify(projects, null, 2)}

【既存の未完了タスク】
${JSON.stringify(tasks.filter((t: any) => !t.done), null, 2)}

【最近完了したタスク情報】
${lastCompletedTask ? JSON.stringify(lastCompletedTask, null, 2) : "なし"}

ユーザーに今日提案する最高の一歩を決定し、以下のJSON形式で返してください。
もし既存の未完了タスクに適切なものがない場合は、現在のプロジェクト状況を踏まえて、今日取り組むべき現実的で魅力的なタスクを新規作成（考案）して提案してください！

【出力JSONフォーマット】
{
  "task": {
    "id": "既存のタスクID。新規に考案したタスクの場合は、新規IDとして 'suggested-new-xx' などの形式にしてください。",
    "project_id": "紐づくプロジェクトのID",
    "title": "タスクのタイトル（簡潔・行動を促す1文）",
    "estimated_minutes": 予想時間（数値。例えば25や30など、集中しやすい25分前後を推奨）,,
    "priority": "high" | "medium" | "low",
    "ai_assignee": "claude" | "gemini" | "chatgpt" （コード系タスクは claude、文章は chatgpt/claude、ビジュアル・画像・デザインは gemini、今日の提案等は gemini）,
    "done": false
  },
  "reason": "なぜこのタスクが今おすすめなのかを秘書として丁寧に、かつ1文（35文字以内）で説明した文章。"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "今日のおすすめタスクを選定してください。",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            task: {
              type: Type.OBJECT,
              description: "おすすめするタスク情報",
              properties: {
                id: { type: Type.STRING },
                project_id: { type: Type.STRING },
                title: { type: Type.STRING },
                estimated_minutes: { type: Type.INTEGER },
                priority: { type: Type.STRING, enum: ["high", "medium", "low"] },
                ai_assignee: { type: Type.STRING, enum: ["claude", "gemini", "chatgpt"] },
                done: { type: Type.BOOLEAN }
              },
              required: ["id", "project_id", "title", "estimated_minutes", "priority", "ai_assignee", "done"]
            },
            reason: { type: Type.STRING, description: "おすすめの理由（簡潔な1文）" }
          },
          required: ["task", "reason"]
        }
      }
    });

    const resultText = response.text || "{}";
    const parsed = JSON.parse(resultText);
    res.json(parsed);
  } catch (error: any) {
    // Graceful fallback to local rule-based suggestion on Gemini API Error/503
    const fallbackResult = getLocalSuggestion(projects, tasks);
    res.json(fallbackResult);
  }
});

// 3. Morning Notification generator
app.post("/api/temote/notify", async (req, res) => {
  const { projects: rawProjects, tasks: rawTasks, settings } = req.body;
  const projects = Array.isArray(rawProjects) ? rawProjects : [];
  const tasks = Array.isArray(rawTasks) ? rawTasks : [];
  const userName = settings?.name || "ジョアンナ";

  if (!ai) {
    const activeP = projects?.[0]?.name || "プロジェクト";
    return res.json({
      message: `おはようございます、${userName}さん。今日は${activeP}のエンドポイントや全体の整理から進めると、スムーズに前進します。`
    });
  }

  try {
    const systemPrompt = `あなたは優秀で無駄な言葉を使わないAI秘書「テモテ」です。
ユーザー名: ${userName}
朝の1日1回通知メッセージを生成してください。

【文字数制約】
厳密に【45文字以内】で、今日一番価値の高い一歩を提案してください。
説教をせず、優しく、かつプロフェッショナルな秘書としてのトーンを守ります。

【現在のプロジェクト】
${JSON.stringify(projects, null, 2)}
【現在の未完了タスク】
${JSON.stringify(tasks?.filter((t: any) => !t.done), null, 2)}

例：「おはようございます。今日はCONCERTANTEのAPIエンドポイントを一つ仕上げると前進します。」`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "朝の通知を生成してください。",
      config: {
        systemInstruction: systemPrompt,
      }
    });

    const msg = response.text?.trim() || `おはようございます。今日も一歩ずつ進めましょう。`;
    res.json({ message: msg });
  } catch (error) {
    res.json({ message: `おはようございます、${userName}さん。本日もフォーカスして進めましょう。` });
  }
});

// 4. Propose structured 1-day schedule based on tasks, progress, and deadlines
app.post("/api/temote/schedule", async (req, res) => {
  const { projects: rawProjects, tasks: rawTasks, settings, events: rawEvents } = req.body;
  const projects = Array.isArray(rawProjects) ? rawProjects : [];
  const tasks = Array.isArray(rawTasks) ? rawTasks : [];
  const events = Array.isArray(rawEvents) ? rawEvents : [];
  const userName = settings?.name || "ジョアンナ";

  if (!ai) {
    const fallbackResult = getLocalSchedule(projects, tasks, userName, events);
    return res.json(fallbackResult);
  }

  try {
    const systemPrompt = `あなたは優秀で謙虚なAI秘書「テモテ」です。
ユーザー名: ${userName}
今日のスケジュール（1日、例えば 09:00 〜 18:00）を、ユーザーが持っている「プロジェクト」「タスク（未完了のもの）」「それぞれの進行状況」「締め切り」、および「カレンダーの確定予定（あれば）」を完全に考慮して、最も効率的かつ現実的な1日のタイムスケジュール（スケジュール表）として提案してください。

【既存のプロジェクト一覧】
${JSON.stringify(projects, null, 2)}

【既存の未完了タスク一覧】
${JSON.stringify(tasks.filter((t: any) => !t.done), null, 2)}

【本日のカレンダー確定予定（events）】
※これらの予定はユーザーがカレンダーに自分で登録した「固定予定」です。必ず、指定された時間帯（time）とタイトル（title）、種別（type）をタイムスケジュールにそのまま組み込み、予定が重ならないようにしてください。
${JSON.stringify(events.filter((e: any) => e.date === "2026-07-01"), null, 2)}

【スケジューリングのルール】
- 始業時間は原則 09:00、終業時間は 18:00 とします。
- ユーザーのカレンダー確定予定（上記の本日の確定予定）が指定されている時間帯は、最優先でその確定予定を配置してください。
- 確定予定以外の時間（空き枠）に対して、連続する作業は最大50分〜60分とし、その後に10分程度の小休憩（break）を挟む形で、既存のタスクをはめ込んでください。
- 12:00〜13:00は原則として「昼食・お昼休み（lunch）」として確保してください（もしその時間にどうしても外せない固定予定が入っている場合は例外とします）。
- 09:00〜09:15 は「1日のキックオフとタスク整理（review）」にしてください。
- 17:30〜18:00 は「1日のふり返りと終業準備（review）」にしてください。
- 移動や外出、直行・直帰、訪問などを伴う予定・タスクについては、作業種別「transit」（移動）を割り当ててください。
- 各作業ブロックには、できる限りユーザーが持っている「既存の未完了タスク（task_id, project_id）」を割り当ててください。タスクが少なければ、そのプロジェクトの進捗率や種別を考慮して、新しい現実的な作業タスク（例えば『資料の構成案作成』や『エラーの修正とテスト』など）を補完して割り当ててください。
- 各ブロックには、なぜその時間にその作業が提案されているのか、秘書としての納得感のある短い理由（reason）を記述してください。

【出力JSONの形式】
指定された responseSchema に従って、余計なマークダウン文字や解説を一切含めず、純粋なJSONのみを返してください。`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "今日のスケジュールを提案してください。",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            schedule: {
              type: Type.ARRAY,
              description: "1日のスケジュールタイムラインブロック（時間順）",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "ブロックの一意のID。タスク割り当ての場合は 'sc-task-タスクID'、その他は 'sc-break', 'sc-lunch', 'sc-review', 'sc-transit' など" },
                  time: { type: Type.STRING, description: "時間帯。例: '09:00 - 09:45'" },
                  title: { type: Type.STRING, description: "予定・作業名。例: 'CONCERTANTE: APIエンドポイント設計'" },
                  type: { type: Type.STRING, enum: ["work", "break", "lunch", "review", "transit"], description: "ブロックの種類" },
                  task_id: { type: Type.STRING, nullable: true, description: "割り当てた既存タスクのID（あれば。なければnull）" },
                  project_id: { type: Type.STRING, nullable: true, description: "紐づくプロジェクトのID（あれば。なければnull）" },
                  duration_minutes: { type: Type.INTEGER, description: "そのブロックの所要時間（分）" },
                  reason: { type: Type.STRING, description: "この時間帯にこれを提案する秘書としての理由（簡潔な1文）" }
                },
                required: ["id", "time", "title", "type", "task_id", "project_id", "duration_minutes", "reason"]
              }
            },
            advice: {
              type: Type.STRING,
              description: "今日のスケジュール全体の構成意図や、進捗・締め切りを考慮したテモテからの短いアドバイス（日本語、2〜3文以内）。"
            }
          },
          required: ["schedule", "advice"]
        }
      }
    });

    const resultText = response.text || "{}";
    const parsed = JSON.parse(resultText);
    res.json(parsed);
  } catch (error: any) {
    console.warn("Gemini schedule generation failed, falling back to local generator", error);
    const fallbackResult = getLocalSchedule(projects, tasks, userName, events);
    res.json(fallbackResult);
  }
});

// 5. Get user data from Supabase
app.get("/api/temote/data", async (req, res) => {
  const { email } = req.query;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required" });
  }

  if (!supabase) {
    return res.json({ source: "local", data: null });
  }

  try {
    const { data, error } = await supabase
      .from("temote_user_data")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return res.json({ source: "supabase", data });
  } catch (err: any) {
    console.warn("Supabase fetch debug info:", err?.message || err);
    return res.json({
      source: "local",
      data: null,
      error: err.message,
      suggestion: "Please ensure that the 'temote_user_data' table is created in your Supabase database."
    });
  }
});

// 6. Save or update user data in Supabase (UPSERT)
app.post("/api/temote/data", async (req, res) => {
  const { email, projects, tasks, history, settings, events } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  if (!supabase) {
    return res.json({ success: false, reason: "Supabase not initialized" });
  }

  try {
    const { data, error } = await supabase
      .from("temote_user_data")
      .upsert({
        email,
        projects: projects || [],
        tasks: tasks || [],
        history: history || [],
        settings: settings || {},
        events: events || [],
        updated_at: new Date().toISOString()
      }, { onConflict: "email" })
      .select();

    if (error) {
      throw error;
    }

    return res.json({ success: true, data });
  } catch (err: any) {
    console.warn("Supabase save debug info:", err?.message || err);
    return res.json({
      success: false,
      error: err.message,
      suggestion: "Please ensure that the 'temote_user_data' table is created in your Supabase database."
    });
  }
});

// ==========================================
// Vite / Static Assets Handling
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;

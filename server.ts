import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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

// ==========================================
// Vite / Static Assets Handling
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
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

startServer();

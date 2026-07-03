import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
export let supabase: any = null;

const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`Supabase Client initialized successfully with ${supabaseServiceRoleKey ? "Service Role Key" : "Anon Key"}.`);
  } catch (error) {
    console.error("Failed to initialize Supabase Client:", error);
  }
} else {
  console.warn("Supabase credentials not found. Falling back to LocalStorage/local response.");
}

// Initialize Gemini Client
export let ai: GoogleGenAI | null = null;
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

export { Type };

export function setCorsHeaders(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-GitHub-Token");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }
  return false;
}

// ==========================================
// Local Offline Helper Functions
// ==========================================

export function getLocalAnalysis(userInput: string, projects: any[], tasks: any[], userName: string) {
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const text = (userInput || "").toLowerCase();
  let responseText = `状況を把握しました、${userName}さん。`;
  let newProjectProposal = null;
  const updatedProjects: any[] = [];
  const createdTasks: any[] = [];
  const completedTaskIds: string[] = [];

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

export function getLocalSuggestion(projects: any[], tasks: any[]) {
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const activeTasks = safeTasks.filter((t: any) => t && !t.done);
  if (activeTasks.length > 0) {
    const highPrio = activeTasks.find((t: any) => t && t.priority === "high");
    const selected = highPrio || activeTasks[0];
    const project = safeProjects.find((p: any) => p && p.id === selected.project_id);
    return {
      task: selected,
      reason: `優先度の高い『${project?.name || ""}』のタスクをおすすめします。`
    };
  } else {
    const activeProj = safeProjects[0] || { id: "default", name: "マイプロジェクト", type: "code" };
    return {
      task: {
        id: "temp-suggested",
        project_id: activeProj.id,
        title: activeProj.type === "code" ? "技術スタックと主要エンドポイントの整理" : "全体の章構成の組み立て",
        estimated_minutes: 25,
        priority: "medium",
        ai_assignee: "gemini",
        done: false,
      },
      reason: `プロジェクト『${activeProj.name}』の次のステップとして最適です。`
    };
  }
}

export function toTimeStr(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function getLocalSchedule(projects: any[], tasks: any[], userName: string, events: any[] = [], targetDate: string = "2026-07-01") {
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const activeTasks = safeTasks.filter((t: any) => t && !t.done);

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

  const todayEvents = (events || [])
    .filter((e: any) => e && e.date === targetDate)
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

  while (currentMins < 1050) {
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

    let limitMins = 1050;
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
      currentMins += 15;
    }
  }

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

export function parseGithubRepo(repoStr: string): { owner: string; repo: string } | null {
  if (!repoStr) return null;
  let clean = repoStr.trim();
  try {
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      const url = new URL(clean);
      if (url.hostname === "github.com" || url.hostname.endsWith(".github.com")) {
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts.length >= 2) {
          return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
        }
      }
    }
  } catch (e) {
    // URL failed
  }

  const parts = clean.split("/").filter(Boolean);
  if (parts.length === 2) {
    return { owner: parts[0], repo: parts[1] };
  }
  return null;
}

export async function getGithubInfoHelper(repoStr: string, customToken?: string): Promise<any> {
  const parsed = parseGithubRepo(repoStr);
  if (!parsed) return null;

  const { owner, repo: repoName } = parsed;
  const token = customToken || process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;

  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Temote-App",
  };

  if (token) {
    headers["Authorization"] = `token ${token}`;
  }

  try {
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, { headers });
    if (!repoRes.ok) {
      return null;
    }
    const repoData: any = await repoRes.json();

    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/commits?per_page=1`, { headers });
    let latestCommit = null;
    if (commitRes.ok) {
      const commits: any = await commitRes.json();
      if (Array.isArray(commits) && commits.length > 0) {
        const commitObj = commits[0];
        latestCommit = {
          sha: commitObj.sha,
          message: commitObj.commit?.message,
          author_name: commitObj.commit?.author?.name,
          author_email: commitObj.commit?.author?.email,
          date: commitObj.commit?.author?.date,
          html_url: commitObj.html_url,
        };
      }
    }

    return {
      name: repoData.name,
      full_name: repoData.full_name,
      description: repoData.description,
      html_url: repoData.html_url,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      open_issues: repoData.open_issues_count,
      pushed_at: repoData.pushed_at,
      latestCommit,
    };
  } catch (error) {
    console.warn(`Error in getGithubInfoHelper for ${repoStr}:`, error);
    return null;
  }
}

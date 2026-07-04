import { ai, setCorsHeaders } from "../_shared.js";

export default async function handler(req: any, res: any) {
  if (setCorsHeaders(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { projects: rawProjects, tasks: rawTasks, settings } = req.body || {};
  const projects = Array.isArray(rawProjects) ? rawProjects : [];
  const tasks = Array.isArray(rawTasks) ? rawTasks : [];
  const userName = settings?.name || "ジョアンナ";

  if (!ai) {
    const activeP = projects?.[0]?.name || "プロジェクト";
    return res.status(200).json({
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

例：「おはようございます。今日はCONCERTANTE의 APIエンドポイントを一つ仕上げると前進します。」`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "朝の通知を生成してください。",
      config: {
        systemInstruction: systemPrompt,
      }
    });

    const msg = response.text?.trim() || `おはようございます。今日も一歩ずつ進めましょう。`;
    return res.status(200).json({ message: msg });
  } catch (error: any) {
    console.log("[Temote Engine] Using local notification (API quota limit or connection issue)");
    return res.status(200).json({
      message: `おはようございます、${userName}さん。本日もフォーカスして進めましょう。`,
      isFallback: true,
      apiError: "API quota limit or connection issue. Offline fallback activated."
    });
  }
}

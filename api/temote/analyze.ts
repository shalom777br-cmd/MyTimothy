import { ai, Type, getLocalAnalysis, setCorsHeaders } from "../_shared";

export default async function handler(req: any, res: any) {
  if (setCorsHeaders(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { userInput, projects: rawProjects, tasks: rawTasks, settings } = req.body || {};
  const projects = Array.isArray(rawProjects) ? rawProjects : [];
  const tasks = Array.isArray(rawTasks) ? rawTasks : [];
  const userName = settings?.name || "ジョアンナ";

  if (!userInput || userInput.trim() === "") {
    return res.status(400).json({ error: "Input is empty" });
  }

  // Fallback local logic if Gemini is not available
  if (!ai) {
    const fallbackResult = getLocalAnalysis(userInput, projects, tasks, userName);
    return res.status(200).json(fallbackResult);
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
              description: "完了した既存タスク of ID一覧",
              items: { type: Type.STRING }
            }
          },
          required: ["responseText", "newProjectProposal", "updatedProjects", "createdTasks", "completedTaskIds"]
        }
      }
    });

    const resultText = response.text || "{}";
    const parsed = JSON.parse(resultText);
    return res.status(200).json(parsed);
  } catch (error: any) {
    console.warn("Gemini analyze failed, falling back to local analysis: " + (error?.message || error));
    const fallbackResult = getLocalAnalysis(userInput, projects, tasks, userName);
    return res.status(200).json({
      ...fallbackResult,
      isFallback: true,
      apiError: error?.message || "Gemini API error"
    });
  }
}

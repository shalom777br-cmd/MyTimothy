import { ai, Type, getLocalSchedule, setCorsHeaders } from "../_shared.js";

export default async function handler(req: any, res: any) {
  if (setCorsHeaders(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { projects: rawProjects, tasks: rawTasks, settings, events: rawEvents } = req.body || {};
  const projects = Array.isArray(rawProjects) ? rawProjects : [];
  const tasks = Array.isArray(rawTasks) ? rawTasks : [];
  const events = Array.isArray(rawEvents) ? rawEvents : [];
  const userName = settings?.name || "ジョアンナ";

  if (!ai) {
    const fallbackResult = getLocalSchedule(projects, tasks, userName, events);
    return res.status(200).json(fallbackResult);
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
    return res.status(200).json(parsed);
  } catch (error: any) {
    console.log("[Temote Engine] Using local schedule generator (API quota limit or connection issue)");
    const fallbackResult = getLocalSchedule(projects, tasks, userName, events);
    return res.status(200).json({
      ...fallbackResult,
      isFallback: true,
      apiError: "API quota limit or connection issue. Offline fallback activated."
    });
  }
}

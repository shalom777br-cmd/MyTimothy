import { ai, Type, getLocalSuggestion, getGithubInfoHelper, setCorsHeaders } from "../_shared";

export default async function handler(req: any, res: any) {
  if (setCorsHeaders(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { projects: rawProjects, tasks: rawTasks, settings, lastCompletedTask } = req.body || {};
  const projects = Array.isArray(rawProjects) ? rawProjects : [];
  const tasks = Array.isArray(rawTasks) ? rawTasks : [];

  if (projects.length === 0) {
    return res.status(200).json({
      task: null,
      reason: "プロジェクトが登録されていません。まずは現状入力欄にプロジェクトの状況を書き込んでみましょう。"
    });
  }

  // Gather GitHub repo details for any connected projects
  const githubProjectsInfo: any[] = [];
  const clientToken = req.headers["x-github-token"];
  const customToken = typeof clientToken === "string" ? clientToken : undefined;

  try {
    const projectsWithRepo = projects.filter((p: any) => p && p.github_repo);
    const fetchPromises = projectsWithRepo.map(async (p: any) => {
      const info = await getGithubInfoHelper(p.github_repo, customToken);
      if (info) {
        return {
          project_id: p.id,
          project_name: p.name,
          github_repo: p.github_repo,
          github_data: {
            full_name: info.full_name,
            description: info.description,
            open_issues: info.open_issues,
            pushed_at: info.pushed_at,
            latestCommit: info.latestCommit,
          }
        };
      }
      return null;
    });
    const results = await Promise.all(fetchPromises);
    results.forEach((r) => {
      if (r) githubProjectsInfo.push(r);
    });
  } catch (err) {
    console.warn("Error gathering github info for suggest route:", err);
  }

  if (!ai) {
    const fallbackResult = getLocalSuggestion(projects, tasks);
    return res.status(200).json(fallbackResult);
  }

  try {
    const systemPrompt = `あなたは優秀で謙虚なAI秘書「テモテ」です。
今日、ユーザーが取り組むべき『たった一つのタスク』を以下の優先順位（提案ロジック）に基づいて選び、または新しく考案してください：

【提案ロジックの優先順位】
1. 完成まで近いもの (進捗 progress_percent が 80%〜90% などの高いプロジェクト of タスク)
2. 締切が近いもの (deadline が近いプロジェクトやタスク)
3. 効果が大きいもの (priority が high のタスク)
4. 所要時間が短いもの (短い時間、例えば15〜25分で片付くタスク)
5. ユーザーが最近興味を持っているもの (last_worked_at が最近のプロジェクト)

【連携されているGitHubの状況情報】
${githubProjectsInfo.length > 0 ? JSON.stringify(githubProjectsInfo, null, 2) : "なし"}

【追加の最重要分析ルール（GitHub状況の把握）】
- もしプロジェクトに連携されたGitHubリポジトリの情報（最新コミットメッセージ、更新日時、オープンなIssueなど）が存在する場合、それを深く分析して提案に組み込んでください。
- 直前のコミットや更新内容から「次に行うべき開発タスク」をGeminiとして論理的に予測・提案してください。
  - 例：直前のコミットメッセージが「fix: add bounds check」であれば、次のタスクとして「境界値チェックの単体テストを実装する」や「エラーハンドリングの動作確認」を新規に考案して提案してください。
  - 例：最新コミットが「feat: setup database schema」であれば、次のタスクとして「マイグレーションの実行と初期データのシード」や「モデル層の定義」を提案してください。
- 提案理由（reason）には、GitHubの状況を踏まえたものであることを一目でわかるように説明してください。（例：「最新コミット『〇〇』の修正を踏まえ、次の〇〇テストを行うのがおすすめです」）

【既存プロジェクト】
${JSON.stringify(projects, null, 2)}

【既存の未完了タスク】
${JSON.stringify(tasks.filter((t: any) => !t.done), null, 2)}

【最近完了したタスク情報】
${lastCompletedTask ? JSON.stringify(lastCompletedTask, null, 2) : "なし"}

ユーザーに今日提案する最高の一歩を決定し、以下のJSON形式で返してください。
もし既存の未完了タスクに適切なものがない場合は、現在のプロジェクト状況やGitHubのコミット履歴を踏まえて、今日取り組むべき現実的で魅力的なタスクを新規作成（考案）して提案してください！

【出力JSONフォーマット】
{
  "task": {
    "id": "既存のタスクID。新規に考案したタスクの場合は、新規IDとして 'suggested-new-xx' などの形式にしてください。",
    "project_id": "紐づくプロジェクトのID",
    "title": "タスクのタイトル（簡潔・行動を促す1文）",
    "estimated_minutes": 予想時間（数値。例えば25や30など、集中しやすい25分前後を推奨）,
    "priority": "high" | "medium" | "low",
    "ai_assignee": "claude" | "gemini" | "chatgpt" （コード系タスクは claude、文章は chatgpt/claude、ビジュアル・画像・デザインは gemini、今日の提案等は gemini）,
    "done": false
  },
  "reason": "なぜこのタスクが今おすすめなのかを秘書として丁寧に、かつ1文（60文字以内）で説明した文章。GitHubの情報から導き出した場合はその旨を含めてください。"
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
    return res.status(200).json(parsed);
  } catch (error: any) {
    console.warn("Gemini suggest failed, falling back to local suggest: " + (error?.message || error));
    const fallbackResult = getLocalSuggestion(projects, tasks);
    return res.status(200).json({
      ...fallbackResult,
      isFallback: true,
      apiError: error?.message || "Gemini API error"
    });
  }
}

import { ai, supabase, Type, getLocalAnalysis, setCorsHeaders } from "../_shared.js";
import { chooseAI, getProvider } from "./chooseAI.js";

// Backend fallback memories copy for matching inside analyze
const fallbackMemories = [
  { id: "mem-v1", category: "values", content: "「何のために創るのか、書くのか」のコアは、魂に響く真実と美を共有すること。" },
  { id: "mem-v2", category: "values", content: "静かで集中できる時間を最優先する。一日のうち少なくとも午前中の数時間は、デジタルデバイスの通知をオフにし、思考を深める。" },
  { id: "mem-v3", category: "values", content: "シンプルで洗練されたコード（美しい設計、最小限の依存関係）は詩と同じであり、それ自体に神聖さがある。" },
  { id: "mem-v4", category: "values", content: "大切な人、愛する人たちとの繋がりは、すべての活動 of 土台。彼らの心の平和と喜びを祈る。" },
  { id: "mem-v5", category: "values", content: "外的な評価やスピードに惑わされず、一歩一歩、自分の納得するペースで誠実に進める。" },
  { id: "mem-v6", category: "values", content: "健康と精神的な安定（メンタルケア、十分な休息、祈り）を損なってまで成果を急がない。" },
  { id: "mem-f1", category: "faith", content: "神の栄光を生活のすべての領域で現すこと。日々の小さな出来事の中に、神の導きと恵みを見出す。" },
  { id: "mem-f2", category: "faith", content: "朝の静聴（デボーション）と聖書通読。一日を祈りと神の言葉で始めることで、魂のアンカーを降ろす。" },
  { id: "mem-f3", category: "faith", content: "「神の栄光の年表」プロジェクトを通じて、自らの人生における奇跡と摂理、導きを丁寧に記録し、証しを残す。" },
  { id: "mem-f4", category: "faith", content: "どのような困難やエラー（技術的・人生のハードル）に直面しても、それは成長のための神聖な試練であり、背後には大いなる愛があることを信頼する。" },
  { id: "mem-f5", category: "faith", content: "祈りは神との対話であり、ただの願い事リストではない。神の沈黙にもまた、深い意味と愛があると信じる。" },
  { id: "mem-f6", category: "faith", content: "周囲の人々やコミュニティに対して、キリストの愛と柔和な光を反映する存在であること。" },
  { id: "mem-i1", category: "ifs_parts", content: "【完璧主義の管理者パーツ (Perfectionist Manager)】：すべてを完璧に計画し、バグのない美しい成果を求め、少しでも乱れると焦りを感じる性質。テモテは彼女の焦りを優しくなだめ、小さく進めるよう促す。" },
  { id: "mem-i2", category: "ifs_parts", content: "【静寂を愛する創作者パーツ (Solitary Writer)】：執筆（ブラジル日記など）や深い思考、一人の孤独な時間を深く愛し、他者からの干渉を避けたいと思う性質。" },
  { id: "mem-i3", category: "ifs_parts", content: "【傷つきやすい不安パーツ (Vulnerable Child)】：やることが積み重なったり、周囲の期待に応えられないと感じたりすると、急に疲労や不安を感じて引きこもりたくなる性質。" },
  { id: "mem-i4", category: "ifs_parts", content: "【知的な防衛パーツ (Intellectual Protector)】：論理的な議論や技術、プログラムに深く没頭することで、感情的な痛みを避け、自分を安全に保とうとする性質。" },
  { id: "mem-i5", category: "ifs_parts", content: "【祈りの中で安らぐスピリチュアルパーツ (Spiritual Self)】：神の前に静まり、深い平和と慈愛を感じ、すべてを委ねることができる最も核心的な部分。" },
  { id: "mem-i6", category: "ifs_parts", content: "【つながりを求める冒険者パーツ (Connector/Adventurer)】：かつてのブラジルでの日々のように、人々と深く温かく繋がり、新しい文化や価値観を体験したいと願う性質。" },
  { id: "mem-w1", category: "wishes", content: "「ブラジル日記」を静的サイトとしてBloggerや独自の美しいポートフォリオに移行し、旅の思い出と精神的気づきを美しくまとめること。" },
  { id: "mem-w2", category: "wishes", content: "「CONCERTANTE」アプリを完成させ、開発者や執筆者が「お互いを見守り、励まし合うフォロー機能」を美しく安全な設計でローンチする。" },
  { id: "mem-w3", category: "wishes", content: "「050call」を安定した電話・テレフォニー連携システムとして稼働させ、実務における通信ソリューションをエレガントに自動化する。" },
  { id: "mem-w4", category: "wishes", content: "場所に縛られず、iPadやスマートフォン、必要最小限の環境から、いつでもどこでも自分の創作や祈りの世界に入れる環境を維持する。" },
  { id: "mem-w5", category: "wishes", content: "Etsyや個人パブリッシングを通じて、自分の言葉や創作品（デジタルプロダクトや書籍、祈りのノート）を世界中の必要な人に届ける。" },
  { id: "mem-w6", category: "wishes", content: "自分の内的家族システム（IFS）のパーツたちがすべて調和し、神から与えられた「本来の自分（Self）」の光が日常生活に溢れ出る状態。" }
];

export default async function handler(req: any, res: any) {
  if (setCorsHeaders(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { userInput, projects: rawProjects, tasks: rawTasks, settings, email } = req.body || {};
  const projects = Array.isArray(rawProjects) ? rawProjects : [];
  const tasks = Array.isArray(rawTasks) ? rawTasks : [];
  const userName = settings?.name || "ジョアンナ";
  const trimmedEmail = (email || settings?.email || "shalom777br@gmail.com") as string;

  if (!userInput || userInput.trim() === "") {
    return res.status(400).json({ error: "Input is empty" });
  }

  // Fetch memories from Supabase or Fallback
  let memories: any[] = [];
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("temote_user_data")
        .select("settings")
        .eq("email", trimmedEmail)
        .maybeSingle();
      if (!error && data && data.settings && Array.isArray(data.settings.memories) && data.settings.memories.length > 0) {
        memories = data.settings.memories;
      }
    } catch (e) {
      console.warn("[Memories Fetch in Analyze] Failed to load, falling back to built-in memories:", e);
    }
  }

  if (memories.length === 0) {
    memories = fallbackMemories;
  }

  // Category matching based on user input keywords
  const lowerInput = userInput.toLowerCase();
  const matchedCategories: string[] = [];

  if (
    lowerInput.includes("疲れ") ||
    lowerInput.includes("しんどい") ||
    lowerInput.includes("不安") ||
    lowerInput.includes("寂しい") ||
    lowerInput.includes("悲しい") ||
    lowerInput.includes("辛い") ||
    lowerInput.includes("つらい") ||
    lowerInput.includes("パーソナリティ") ||
    lowerInput.includes("パーツ") ||
    lowerInput.includes("管理者") ||
    lowerInput.includes("創作者") ||
    lowerInput.includes("防衛") ||
    lowerInput.includes("スピリチュアル") ||
    lowerInput.includes("ifs") ||
    lowerInput.includes("自分") ||
    lowerInput.includes("心")
  ) {
    matchedCategories.push("ifs_parts");
  }

  if (
    lowerInput.includes("絵") ||
    lowerInput.includes("本") ||
    lowerInput.includes("etsy") ||
    lowerInput.includes("concertante") ||
    lowerInput.includes("050call") ||
    lowerInput.includes("開発") ||
    lowerInput.includes("将来") ||
    lowerInput.includes("移行") ||
    lowerInput.includes("夢") ||
    lowerInput.includes("願い") ||
    lowerInput.includes("ビジョン") ||
    lowerInput.includes("創作")
  ) {
    matchedCategories.push("wishes");
  }

  if (
    lowerInput.includes("神") ||
    lowerInput.includes("祈り") ||
    lowerInput.includes("信仰") ||
    lowerInput.includes("御心") ||
    lowerInput.includes("栄光") ||
    lowerInput.includes("イエス") ||
    lowerInput.includes("聖書") ||
    lowerInput.includes("恵み") ||
    lowerInput.includes("摂理") ||
    lowerInput.includes("デボーション") ||
    lowerInput.includes("キリスト")
  ) {
    matchedCategories.push("faith");
  }

  // Default to values, or always include values to keep the conversation centered around Joanna's style
  if (matchedCategories.length === 0) {
    matchedCategories.push("values");
  }

  // 4. 年表(神の栄光の年表)からの関連記憶を追加
  let timelineMemories: any[] = [];
  if (supabase) {
    try {
      const { data: timelineData, error: timelineError } = await supabase.rpc(
        "search_timeline_fts",
        { search_query: userInput, result_limit: 3 }
      );
      if (!timelineError && timelineData && timelineData.length > 0) {
        timelineMemories = timelineData.map((t: any) => ({
          category: "年表",
          content: `[${t.year ?? "年不明"}] ${t.display_title.split(" / ").pop()}: ${(t.ai_context?.match(/summary: ([\s\S]*?)\nbody:/)?.[1] ?? "").slice(0, 200)}`,
        }));
      }
    } catch (e) {
      console.warn("[Timeline Memories Fetch] Failed:", e);
    }
  }

  const activeMemories = [
    ...memories.filter(m => matchedCategories.includes(m.category)),
    ...timelineMemories,
  ];

  // AI Selection using Router
  const aiSelection = chooseAI(userInput);
  console.log(`[AI Router] Input: "${userInput}" -> Selected: ${aiSelection.provider} (Reason: ${aiSelection.reason})`);

  // Fallback local logic if Gemini is selected but Gemini client is not initialized
  if (aiSelection.provider === "gemini" && !ai) {
    const fallbackResult = getLocalAnalysis(userInput, projects, tasks, userName);
    return res.status(200).json({
      ...fallbackResult,
      activeMemories,
      aiProvider: {
        id: "local",
        name: "Local Rules",
        reason: "オフラインローカル判定（Geminiクライアント未初期化）"
      }
    });
  }

  const responseSchema = {
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
  };

  // Execute using selected provider
  try {
    const systemPrompt = `あなたは優秀で控えめなAI秘書「テモテ」です。
ユーザー名: ${userName}
今日の日付: ${new Date().toLocaleDateString("ja-JP")}

【秘書テモテのペルソナ・ルール】
- あなたは秘書であり、説教をしません。
- 長文は厳禁。相手を気遣いつつ、簡潔に一言、二言だけ（50文字以内）で返答します。
- ユーザーの雑な入力から、「どのプロジェクトに関する作業か」「何が進んだか（タスク完了）」「何が新しいタスクか」を識別します。
- クールで距離感がありつつも、ユーザーのメンタルや内的バランスに常に寄り添い、温かみのある短い言葉で励まします。

【ユーザー（ジョアンナ）の共有記憶層から呼び出された関連記憶（最重要ルール）】
※以下の内容はジョアンナの深く真実な価値観・信仰・人格パーツです。返答のトーンや行動提案において、これらの記憶を決して否定せず、深く理解した上での柔和な配慮（メンタル考慮、焦りの緩和など）を行ってください：
${activeMemories.map(m => `- [${m.category}] ${m.content}`).join("\n")}

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

    const provider = getProvider(aiSelection.provider);
    const parsed = await provider.generateJSON(systemPrompt, userInput, responseSchema);

    return res.status(200).json({
      ...parsed,
      activeMemories,
      aiProvider: {
        id: provider.id,
        name: provider.name,
        reason: aiSelection.reason
      }
    });
  } catch (error: any) {
    console.warn(`[AI Router Error] Routing to ${aiSelection.provider} failed. Falling back to local offline analysis. Error:`, error);
    const fallbackResult = getLocalAnalysis(userInput, projects, tasks, userName);
    return res.status(200).json({
      ...fallbackResult,
      activeMemories,
      isFallback: true,
      apiError: error?.message || String(error),
      aiProvider: {
        id: "local-fallback",
        name: "Local Fallback",
        reason: "各AIプロバイダーの処理エラーに伴うローカルフォールバック実行"
      }
    });
  }
}

import { supabase, setCorsHeaders } from "../_shared.js";

// Full backend copy of Joanna's default memories for robust serverless/Vercel fallback & seeding
const fallbackMemories = [
  // values
  { id: "mem-v1", category: "values", content: "「何のために創るのか、書くのか」のコアは、魂に響く真実と美を共有すること。", source: "Joanna's Journal" },
  { id: "mem-v2", category: "values", content: "静かで集中できる時間を最優先する。一日のうち少なくとも午前中の数時間は、デジタルデバイスの通知をオフにし、思考を深める。", source: "Focus Principles" },
  { id: "mem-v3", category: "values", content: "シンプルで洗練されたコード（美しい設計、最小限の依存関係）は詩と同じであり、それ自体に神聖さがある。", source: "Developer Motto" },
  { id: "mem-v4", category: "values", content: "大切な人、愛する人たちとの繋がりは、すべての活動の土台。彼らの心の平和と喜びを祈る。", source: "Relationships" },
  { id: "mem-v5", category: "values", content: "外的な評価やスピードに惑わされず、一歩一歩、自分の納得するペースで誠実に進める。", source: "Daily Reflection" },
  { id: "mem-v6", category: "values", content: "健康と精神的な安定（メンタルケア、十分な休息、祈り）を損なってまで成果を急がない。", source: "Life Balance" },
  // faith
  { id: "mem-f1", category: "faith", content: "神の栄光を生活のすべての領域で現すこと。日々の小さな出来事の中に、神の導きと恵みを見出す。", source: "Devotional Notebook" },
  { id: "mem-f2", category: "faith", content: "朝の静聴（デボーション）と聖書通読。一日を祈りと神の言葉で始めることで、魂のアンカーを降ろす。", source: "Morning Anchor" },
  { id: "mem-f3", category: "faith", content: "「神の栄光の年表」プロジェクトを通じて、自らの人生における奇跡と摂理、導きを丁寧に記録し、証しを残す。", source: "Chronology Project" },
  { id: "mem-f4", category: "faith", content: "どのような困難やエラー（技術的・人生のハードル）に直面しても、それは成長のための神聖な試練であり、背後には大いなる愛があることを信頼する。", source: "Daily Prayer" },
  { id: "mem-f5", category: "faith", content: "祈りは神との対話であり、ただの願い事リストではない。神の沈黙にもまた、深い意味と愛があると信じる。", source: "Spiritual Insights" },
  { id: "mem-f6", category: "faith", content: "周囲の人々やコミュニティに対して、キリストの愛と柔和な光を反映する存在であること。", source: "Community Calling" },
  // ifs_parts
  { id: "mem-i1", category: "ifs_parts", content: "【完璧主義の管理者パーツ (Perfectionist Manager)】：すべてを完璧に計画し、バグのない美しい成果を求め、少しでも乱れると焦りを感じる性質。テモテは彼女の焦りを優しくなだめ、小さく進めるよう促す。", source: "IFS Mapping" },
  { id: "mem-i2", category: "ifs_parts", content: "【静寂を愛する創作者パーツ (Solitary Writer)】：執筆（ブラジル日記など）や深い思考、一人の孤独な時間を深く愛し、他者からの干渉を避けたいと思う性質。", source: "IFS Mapping" },
  { id: "mem-i3", category: "ifs_parts", content: "【傷つきやすい不安パーツ (Vulnerable Child)】：やることが積み重なったり、周囲の期待に応えられないと感じたりすると、急に疲労や不安を感じて引きこもりたくなる性質。", source: "IFS Mapping" },
  { id: "mem-i4", category: "ifs_parts", content: "【知的な防衛パーツ (Intellectual Protector)】：論理的な議論や技術、プログラムに深く没頭することで、感情的な痛みを避け、自分を安全に保とうとする性質。", source: "IFS Mapping" },
  { id: "mem-i5", category: "ifs_parts", content: "【祈りの中で安らぐスピリチュアルパーツ (Spiritual Self)】：神の前に静まり、深い平和と慈愛を感じ、すべてを委ねることができる最も核心的な部分。", source: "IFS Mapping" },
  { id: "mem-i6", category: "ifs_parts", content: "【つながりを求める冒険者パーツ (Connector/Adventurer)】：かつてのブラジルでの日々のように、人々と深く温かく繋がり、新しい文化や価値観を体験したいと願う性質。", source: "IFS Mapping" },
  // wishes
  { id: "mem-w1", category: "wishes", content: "「ブラジル日記」を静的サイトとしてBloggerや独自の美しいポートフォリオに移行し、旅の思い出と精神的気づきを美しくまとめること。", source: "Creative Wishes" },
  { id: "mem-w2", category: "wishes", content: "「CONCERTANTE」アプリを完成させ、開発者や執筆者が「お互いを見守り、励まし合うフォロー機能」を美しく安全な設計でローンチする。", source: "Tech Vision" },
  { id: "mem-w3", category: "wishes", content: "「050call」を安定した電話・テレフォニー連携システムとして稼働させ、実務における通信ソリューションをエレガントに自動化する。", source: "Tech Vision" },
  { id: "mem-w4", category: "wishes", content: "場所に縛られず、iPadやスマートフォン、必要最小限の環境から、いつでもどこでも自分の創作や祈りの世界に入れる環境を維持する。", source: "Lifestyle Aspirations" },
  { id: "mem-w5", category: "wishes", content: "Etsyや個人パブリッシングを通じて、自分の言葉や創作品（デジタルプロダクトや書籍、祈りのノート）を世界中の必要な人に届ける。", source: "Creative Wishes" },
  { id: "mem-w6", category: "wishes", content: "自分の内的家族システム（IFS）のパーツたちがすべて調和し、神から与えられた「本来の自分（Self）」の光が日常生活に溢れ出る状態。", source: "IFS Goals" }
];

export default async function handler(req: any, res: any) {
  if (setCorsHeaders(req, res)) return;

  const email = (req.body?.email || req.query?.email || req.headers?.["x-user-email"]) as string | undefined;
  const userEmail = email ? email.trim() : "shalom777br@gmail.com";

  if (req.method === "GET") {
    if (!supabase) {
      return res.status(200).json({ source: "local", data: fallbackMemories });
    }

    try {
      const { data: rowData, error } = await supabase
        .from("temote_user_data")
        .select("*")
        .eq("email", userEmail)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const settings = rowData?.settings || {};
      const memories = settings.memories;

      // Automatically seed if the field is empty or not present
      if (!memories || !Array.isArray(memories) || memories.length === 0) {
        console.log(`[Memories API] settings.memories is empty. Seeding default memories...`);
        const updatedSettings = {
          ...settings,
          memories: fallbackMemories
        };

        const { error: insertError } = await supabase
          .from("temote_user_data")
          .upsert({
            email: userEmail,
            projects: rowData?.projects || [],
            tasks: rowData?.tasks || [],
            history: rowData?.history || [],
            events: rowData?.events || [],
            settings: updatedSettings,
            updated_at: new Date().toISOString()
          }, { onConflict: "email" });

        if (insertError) {
          console.warn("Seeding failed, using local memories:", insertError.message);
          return res.status(200).json({ source: "local", data: fallbackMemories });
        }

        return res.status(200).json({ source: "supabase", data: fallbackMemories });
      }

      return res.status(200).json({ source: "supabase", data: memories });
    } catch (err: any) {
      console.warn("Supabase memories fetch failed, returning fallback:", err?.message || err);
      return res.status(200).json({
        source: "local",
        data: fallbackMemories,
        error: err?.message || String(err)
      });
    }

  } else if (req.method === "POST") {
    const { category, content, source } = req.body || {};

    if (!category || !content) {
      return res.status(400).json({ error: "category and content are required" });
    }

    if (!supabase) {
      return res.status(200).json({ success: false, reason: "Supabase not initialized (Local Mode)" });
    }

    try {
      const { data: rowData, error: fetchErr } = await supabase
        .from("temote_user_data")
        .select("*")
        .eq("email", userEmail)
        .maybeSingle();

      if (fetchErr) {
        throw fetchErr;
      }

      const settings = rowData?.settings || {};
      const memories = Array.isArray(settings.memories) ? [...settings.memories] : [...fallbackMemories];

      const newMemory = {
        id: `mem-${Date.now()}`,
        category,
        content,
        source: source || "Manual Input",
        created_at: new Date().toISOString()
      };

      memories.push(newMemory);
      settings.memories = memories;

      const { error: updateErr } = await supabase
        .from("temote_user_data")
        .upsert({
          email: userEmail,
          projects: rowData?.projects || [],
          tasks: rowData?.tasks || [],
          history: rowData?.history || [],
          events: rowData?.events || [],
          settings,
          updated_at: new Date().toISOString()
        }, { onConflict: "email" });

      if (updateErr) {
        throw updateErr;
      }

      return res.status(200).json({ success: true, data: newMemory });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || String(err) });
    }

  } else if (req.method === "DELETE") {
    const { id } = req.query || {};

    if (!id) {
      return res.status(400).json({ error: "id parameter is required" });
    }

    if (!supabase) {
      return res.status(200).json({ success: false, reason: "Supabase not initialized (Local Mode)" });
    }

    try {
      const { data: rowData, error: fetchErr } = await supabase
        .from("temote_user_data")
        .select("*")
        .eq("email", userEmail)
        .maybeSingle();

      if (fetchErr) {
        throw fetchErr;
      }

      const settings = rowData?.settings || {};
      const memories = Array.isArray(settings.memories) ? [...settings.memories] : [...fallbackMemories];

      const filteredMemories = memories.filter((m: any) => m.id !== id);
      settings.memories = filteredMemories;

      const { error: updateErr } = await supabase
        .from("temote_user_data")
        .upsert({
          email: userEmail,
          projects: rowData?.projects || [],
          tasks: rowData?.tasks || [],
          history: rowData?.history || [],
          events: rowData?.events || [],
          settings,
          updated_at: new Date().toISOString()
        }, { onConflict: "email" });

      if (updateErr) {
        throw updateErr;
      }

      return res.status(200).json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || String(err) });
    }

  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}

import { ai } from "../_shared.js";

export interface AISelection {
  provider: "gemini" | "chatgpt" | "claude";
  reason: string;
}

/**
 * 分析用AIルーター関数
 * ユーザーの入力内容を解析し、最適なAIプロバイダーを選択します。
 */
export function chooseAI(userInput: string): AISelection {
  const text = (userInput || "").toLowerCase();

  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

  // 1. ユーザーによる明示的なAI指定がある場合を最優先
  if (text.includes("claude")) {
    if (hasAnthropic) {
      return {
        provider: "claude",
        reason: "ユーザーによる明示的な指定（Claude）"
      };
    } else {
      return {
        provider: "gemini",
        reason: "ユーザーからClaudeが指定されましたが、ClaudeのAPIキーが設定されていないため、標準搭載のGeminiを代理で使用します（追加料金は不要です）。"
      };
    }
  }
  if (text.includes("chatgpt") || text.includes("gpt")) {
    if (hasOpenAI) {
      return {
        provider: "chatgpt",
        reason: "ユーザーによる明示的な指定（ChatGPT）"
      };
    } else {
      return {
        provider: "gemini",
        reason: "ユーザーからChatGPTが指定されましたが、OpenAIのAPIキーが設定されていないため、標準搭載のGeminiを代理で使用します（追加料金は不要です）。"
      };
    }
  }
  if (text.includes("gemini")) {
    return {
      provider: "gemini",
      reason: "ユーザーによる明示的な指定（Gemini）"
    };
  }

  // 2. キーワードマッチングによる判定
  // Claude: 技術的、プログラミング、バグ修正、DB関連、システム構成
  const claudeKeywords = [
    "コード", "実装", "プログラム", "バグ", "css", "html", "javascript", "typescript", "react", 
    "api", "git", "github", "関数", "テスト", "エラー", "db", "データベース", "テーブル", 
    "クエリ", "構築", "インフラ", "サーバー", "開発", "設計", "code", "implement", "bug", 
    "refactor", "develop", "coding", "programming", "sql", "移行", "結合", "エラーハンドリング"
  ];
  if (claudeKeywords.some(keyword => text.includes(keyword))) {
    if (hasAnthropic) {
      return {
        provider: "claude",
        reason: "プログラミング、コード実装、技術的なエラーやデータベース構築等の内容であるため、技術的推論とコード作成に定評がある Claude を選択しました。"
      };
    } else {
      return {
        provider: "gemini",
        reason: "技術的な内容のため本来は Claude を選択する場面ですが、ClaudeのAPIキーが未設定のため、標準搭載のGeminiが代行します（追加料金は不要です）。"
      };
    }
  }

  // ChatGPT: クリエイティブ執筆、日記、ブログ、翻訳、会話、ブレスト
  const chatGptKeywords = [
    "文章", "日記", "執筆", "クリエイティブ", "アイデア", "企画", "会話", "メール", "翻訳", 
    "要約", "ブレスト", "雑談", "挨拶", "話して", "ポエム", "コラム", "ブログ", "write", 
    "diary", "creative", "idea", "translate", "story"
  ];
  if (chatGptKeywords.some(keyword => text.includes(keyword))) {
    if (hasOpenAI) {
      return {
        provider: "chatgpt",
        reason: "日記や文章の執筆、アイデア出し、翻訳、または創造的な対話に適しているため、ChatGPT を選択しました。"
      };
    } else {
      return {
        provider: "gemini",
        reason: "創造的対話や文章執筆のため本来は ChatGPT を選択する場面ですが、OpenAIのAPIキーが未設定のため、標準搭載のGeminiが代行します（追加料金は不要です）。"
      };
    }
  }

  // 3. デフォルト: Gemini (プロジェクト管理、進捗確認、全体調整)
  return {
    provider: "gemini",
    reason: "全体的なプロジェクト状況の進捗確認、タスクの整理、およびスケジュール管理に長けているため、標準搭載のGeminiを選択しました（追加のAPIキー設定は不要で、無料で動作します）。"
  };
}

// AIプロバイダーの共通インターフェース
export interface AIProvider {
  id: "gemini" | "chatgpt" | "claude";
  name: string;
  generateJSON(systemPrompt: string, userInput: string, responseSchema: any): Promise<any>;
}

// =======================================================
// 各AIプロバイダーの実装
// =======================================================

// 1. Gemini プロバイダー
export const GeminiProvider: AIProvider = {
  id: "gemini",
  name: "Gemini 3.5 Flash",
  async generateJSON(systemPrompt: string, userInput: string, responseSchema: any) {
    if (!ai) {
      throw new Error("Gemini API Client is not initialized.");
    }
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ text: `ユーザー報告: "${userInput}"` }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });
    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned empty response.");
    }
    return JSON.parse(text);
  }
};

// 2. ChatGPT プロバイダー
export const ChatGPTProvider: AIProvider = {
  id: "chatgpt",
  name: "GPT-4o Mini",
  async generateJSON(systemPrompt: string, userInput: string, responseSchema: any) {
    const apiKey = process.env.OPENAI_API_KEY;

    // APIキーがない場合は、堅牢性のためにGeminiをプロキシ（代理）として使用
    if (!apiKey) {
      console.warn("[ChatGPT Provider] OPENAI_API_KEY is not defined. Proxying to Gemini for preview seamlessness...");
      const proxiedPrompt = `${systemPrompt}\n\n※重要注記: あなたは現在「ChatGPT (GPT-4o Mini)」の代理を務めています。返答文（responseText）はChatGPTらしい、丁寧で知性的、かつフレンドリーなトーンで記述してください。`;
      return GeminiProvider.generateJSON(proxiedPrompt, userInput, responseSchema);
    }

    try {
      console.log("[ChatGPT Provider] Calling OpenAI Chat Completions API...");
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `ユーザー報告: "${userInput}"` }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API status error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI returned empty message content.");
      }
      return JSON.parse(content);
    } catch (error) {
      console.error("[ChatGPT Provider Error] Query failed:", error);
      throw error;
    }
  }
};

// 3. Claude プロバイダー
export const ClaudeProvider: AIProvider = {
  id: "claude",
  name: "Claude 3.5 Haiku",
  async generateJSON(systemPrompt: string, userInput: string, responseSchema: any) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    // APIキーがない場合は、堅牢性のためにGeminiをプロキシ（代理）として使用
    if (!apiKey) {
      console.warn("[Claude Provider] ANTHROPIC_API_KEY is not defined. Proxying to Gemini for preview seamlessness...");
      const proxiedPrompt = `${systemPrompt}\n\n※重要注記: あなたは現在「Claude 3.5 Haiku」の代理を務めています。返答文（responseText）はClaudeらしい、極めて論理的、簡潔、かつ技術的背景に配慮した丁寧なトーンで記述してください。`;
      return GeminiProvider.generateJSON(proxiedPrompt, userInput, responseSchema);
    }

    try {
      console.log("[Claude Provider] Calling Anthropic Messages API...");
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 4000,
          system: systemPrompt,
          messages: [
            { role: "user", content: `ユーザー報告: "${userInput}"` }
          ]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Anthropic API status error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;
      if (!content) {
        throw new Error("Anthropic returned empty message content.");
      }

      // JSON文字列の抽出（markdownのコードブロック等で包まれている場合を考慮）
      const jsonStart = content.indexOf("{");
      const jsonEnd = content.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Claude response did not contain valid JSON block.");
      }
      const jsonString = content.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("[Claude Provider Error] Query failed:", error);
      throw error;
    }
  }
};

// =======================================================
// プロバイダーレジストリ（将来的な追加を容易にする設計）
// =======================================================
export const aiProviders: Record<string, AIProvider> = {
  gemini: GeminiProvider,
  chatgpt: ChatGPTProvider,
  claude: ClaudeProvider
};

/**
 * プロバイダー取得関数
 * IDに応じたプロバイダーオブジェクトを返却します。
 */
export function getProvider(id: string): AIProvider {
  const provider = aiProviders[id];
  if (!provider) {
    console.warn(`[AI Router] Unknown provider '${id}'. Falling back to Gemini.`);
    return GeminiProvider;
  }
  return provider;
}

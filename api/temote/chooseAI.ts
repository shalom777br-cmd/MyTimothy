import { ai } from "../_shared.js";

export interface AISelection {
  provider: "gemini" | "chatgpt" | "claude";
  reason: string;
}

/**
 * 分析用AIルーター関数
 * ユーザーのメッセージ傾向を分析し、最適なAIを選択します。
 * OpenAI/Anthropicは無効化されているため、常にGeminiを優先的に案内・選択します。
 */
export function chooseAI(userInput: string): AISelection {
  const text = (userInput || "").toLowerCase();

  // ユーザーが明示的にclaudeやchatgptと言及した場合は、Geminiが代理として動作することを明示します。
  if (text.includes("claude")) {
    return {
      provider: "gemini",
      reason: "ユーザーからClaudeが指定されましたが、現在Claudeは無効化されているため、標準搭載のGeminiが代理で回答を生成します。"
    };
  }

  if (text.includes("chatgpt") || text.includes("gpt")) {
    return {
      provider: "gemini",
      reason: "ユーザーからChatGPTが指定されましたが、現在ChatGPTは無効化されているため、標準搭載のGeminiが代理で回答を生成します。"
    };
  }

  // デフォルト: Gemini (プロジェクト管理、進捗確認、全体調整)
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
  name: "Gemini 2.0 Flash",
  async generateJSON(systemPrompt: string, userInput: string, responseSchema: any) {
    if (!ai) {
      throw new Error("Gemini API Client is not initialized.");
    }
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
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

// 2. ChatGPT プロバイダー (Geminiへプロキシ)
export const ChatGPTProvider: AIProvider = {
  id: "chatgpt",
  name: "GPT-4o Mini (Gemini代理)",
  async generateJSON(systemPrompt: string, userInput: string, responseSchema: any) {
    console.log("[ChatGPT Provider] OpenAI is disabled. Proxying request to Gemini...");
    const proxiedPrompt = `${systemPrompt}\n\n※重要注記: あなたは現在「ChatGPT (GPT-4o Mini)」の代理を務めています。返答文（responseText）はChatGPTらしい、丁寧で知性的、かつフレンドリーなトーンで記述してください。`;
    return GeminiProvider.generateJSON(proxiedPrompt, userInput, responseSchema);
  }
};

// 3. Claude プロバイダー (Geminiへプロキシ)
export const ClaudeProvider: AIProvider = {
  id: "claude",
  name: "Claude 3.5 Haiku (Gemini代理)",
  async generateJSON(systemPrompt: string, userInput: string, responseSchema: any) {
    console.log("[Claude Provider] Anthropic is disabled. Proxying request to Gemini...");
    const proxiedPrompt = `${systemPrompt}\n\n※重要注記: あなたは現在「Claude 3.5 Haiku」の代理を務めています。返答文（responseText）はClaudeらしい、極めて論理的、簡潔、かつ技術的背景に配慮した丁寧なトーンで記述してください。`;
    return GeminiProvider.generateJSON(proxiedPrompt, userInput, responseSchema);
  }
};

// =======================================================
// プロバイダーレジストリ
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

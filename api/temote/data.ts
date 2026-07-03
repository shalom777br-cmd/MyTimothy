import { supabase, setCorsHeaders } from "../_shared.js";

export default async function handler(req: any, res: any) {
  if (setCorsHeaders(req, res)) return;

  // Extract the user's email from request body, query parameters, or headers
  const userEmail = (req.body?.email || req.query?.email || req.headers?.["x-user-email"]) as string | undefined;

  // Validation: email must be provided and not empty
  if (!userEmail || typeof userEmail !== "string" || !userEmail.trim()) {
    return res.status(400).json({ error: "Email is required and must not be empty" });
  }

  const trimmedEmail = userEmail.trim();

  if (req.method === "GET") {
    if (!supabase) {
      return res.status(200).json({ source: "local", data: null });
    }

    try {
      // Query is explicitly scoped to the requested user's email only
      const { data, error } = await supabase
        .from("temote_user_data")
        .select("*")
        .eq("email", trimmedEmail)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return res.status(200).json({ source: "supabase", data });
    } catch (err: any) {
      console.warn("Supabase fetch debug info:", err?.message || err);
      let errMsg = err.message || String(err);
      if (errMsg.toLowerCase().includes("row-level security") || errMsg.toLowerCase().includes("row level security") || errMsg.toLowerCase().includes("policy")) {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
          errMsg += " (⚠️ 注意: サーバー側で SUPABASE_SERVICE_ROLE_KEY が設定されていません。AI StudioのSettingsメニューからこの環境変数を追加するか、もしくはSupabaseのSQL Editorで「alter table temote_user_data disable row level security;」を実行してRLSを無効にしてください。)";
        } else {
          errMsg += " (⚠️ 注意: SUPABASE_SERVICE_ROLE_KEY は設定されていますが、ポリシー違反が発生しました。SupabaseのSQL Editorで「alter table temote_user_data disable row level security;」を実行してRLSを無効にしてください。)";
        }
      }
      return res.status(200).json({
        source: "local",
        data: null,
        error: errMsg,
        suggestion: "Please check your Supabase Row-Level Security (RLS) configurations and ensure SUPABASE_SERVICE_ROLE_KEY is correctly set in AI Studio Settings."
      });
    }
  } else if (req.method === "POST") {
    const { projects, tasks, history, settings, events } = req.body || {};

    if (!supabase) {
      return res.status(200).json({ success: false, reason: "Supabase not initialized" });
    }

    try {
      // Upsert forces the email to be the verified, trimmed email to prevent writing to another user's row
      const { data, error } = await supabase
        .from("temote_user_data")
        .upsert({
          email: trimmedEmail,
          projects: projects || [],
          tasks: tasks || [],
          history: history || [],
          settings: settings || {},
          events: events || [],
          updated_at: new Date().toISOString()
        }, { onConflict: "email" })
        .select();

      if (error) {
        throw error;
      }

      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      console.warn("Supabase save debug info:", err?.message || err);
      let errMsg = err.message || String(err);
      if (errMsg.toLowerCase().includes("row-level security") || errMsg.toLowerCase().includes("row level security") || errMsg.toLowerCase().includes("policy")) {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
          errMsg += " (⚠️ 注意: サーバー側で SUPABASE_SERVICE_ROLE_KEY が設定されていません。AI StudioのSettingsメニューからこの環境変数を追加するか、もしくはSupabaseのSQL Editorで「alter table temote_user_data disable row level security;」を実行してRLSを無効にしてください。)";
        } else {
          errMsg += " (⚠️ 注意: SUPABASE_SERVICE_ROLE_KEY は設定されていますが、ポリシー違反が発生しました。SupabaseのSQL Editorで「alter table temote_user_data disable row level security;」を実行してRLSを無効にしてください。)";
        }
      }
      return res.status(200).json({
        success: false,
        error: errMsg,
        suggestion: "Please check your Supabase Row-Level Security (RLS) configurations and ensure SUPABASE_SERVICE_ROLE_KEY is correctly set in AI Studio Settings."
      });
    }
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}

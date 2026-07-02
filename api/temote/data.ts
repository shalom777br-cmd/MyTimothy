import { supabase, setCorsHeaders } from "../_shared.js";

export default async function handler(req: any, res: any) {
  if (setCorsHeaders(req, res)) return;

  if (req.method === "GET") {
    const { email } = req.query || {};
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    if (!supabase) {
      return res.status(200).json({ source: "local", data: null });
    }

    try {
      const { data, error } = await supabase
        .from("temote_user_data")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return res.status(200).json({ source: "supabase", data });
    } catch (err: any) {
      console.warn("Supabase fetch debug info:", err?.message || err);
      return res.status(200).json({
        source: "local",
        data: null,
        error: err.message,
        suggestion: "Please ensure that the 'temote_user_data' table is created in your Supabase database."
      });
    }
  } else if (req.method === "POST") {
    const { email, projects, tasks, history, settings, events } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    if (!supabase) {
      return res.status(200).json({ success: false, reason: "Supabase not initialized" });
    }

    try {
      const { data, error } = await supabase
        .from("temote_user_data")
        .upsert({
          email,
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
      return res.status(200).json({
        success: false,
        error: err.message,
        suggestion: "Please ensure that the 'temote_user_data' table is created in your Supabase database."
      });
    }
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}

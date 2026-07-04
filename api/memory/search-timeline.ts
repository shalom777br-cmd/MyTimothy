import { createClient } from "@supabase/supabase-js";
import { setCorsHeaders } from "../_shared.js";

let supabase: any = null;

function getSupabase() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required");
    }
    supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  }
  return supabase;
}

export default async function handler(req: any, res: any) {
  if (setCorsHeaders(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query, category, yearFrom, yearTo, limit = 5 } = req.body;

  try {
    const supabaseClient = getSupabase();

    let q = supabaseClient
      .from("memory_timeline_events_for_ai")
      .select("id, display_title, event_date, year, primary_category, categories, locations, ai_context")
      .order("event_date", { ascending: true, nullsFirst: false })
      .limit(limit);

    if (query) {
      // タイトル・本文の部分一致検索(trgmインデックスが効く)
      q = q.or(`title.ilike.%${query}%,body.ilike.%${query}%,summary.ilike.%${query}%`);
    }

    if (category) {
      q = q.contains("categories", [category]);
    }

    if (yearFrom) {
      q = q.gte("year", yearFrom);
    }

    if (yearTo) {
      q = q.lte("year", yearTo);
    }

    const { data, error } = await q;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ results: data, count: data?.length || 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}

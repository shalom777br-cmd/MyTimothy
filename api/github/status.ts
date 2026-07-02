import { setCorsHeaders } from "../_shared.js";

export default async function handler(req: any, res: any) {
  if (setCorsHeaders(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const serverTokenSet = !!(process.env.GITHUB_PAT || process.env.GITHUB_TOKEN);
  const clientToken = req.headers["x-github-token"];
  const token = (typeof clientToken === "string" && clientToken) || process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;

  if (!token) {
    return res.status(200).json({
      authenticated: false,
      serverTokenSet,
      rateLimit: null,
      message: "GitHub Personal Access Token is not configured."
    });
  }

  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Temote-App",
    "Authorization": `token ${token}`
  };

  try {
    const userRes = await fetch("https://api.github.com/user", { headers });
    const rateRes = await fetch("https://api.github.com/rate_limit", { headers });
    
    let username = null;
    let scopes: string[] = [];
    if (userRes.ok) {
      const userData = await userRes.json();
      username = userData.login;
      const scopesHeader = userRes.headers.get("x-oauth-scopes");
      if (scopesHeader) {
        scopes = scopesHeader.split(",").map((s: string) => s.trim());
      }
    }

    let rateLimit = null;
    if (rateRes.ok) {
      const rateData = await rateRes.json();
      rateLimit = rateData.resources?.core;
    }

    return res.status(200).json({
      authenticated: userRes.ok,
      username,
      scopes,
      serverTokenSet,
      rateLimit,
      statusCode: userRes.status
    });
  } catch (error: any) {
    return res.status(200).json({
      authenticated: false,
      serverTokenSet,
      error: error.message
    });
  }
}

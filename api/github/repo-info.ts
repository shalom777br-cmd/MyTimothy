import { getGithubInfoHelper, parseGithubRepo, setCorsHeaders } from "../_shared.js";

export default async function handler(req: any, res: any) {
  if (setCorsHeaders(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { repo } = req.query || {};
  if (!repo || typeof repo !== "string") {
    return res.status(400).json({ error: "Repository identifier or URL is required" });
  }

  const parsed = parseGithubRepo(repo);
  if (!parsed) {
    return res.status(400).json({ error: "Invalid GitHub repository format. Use 'owner/repo' or a full GitHub URL." });
  }

  try {
    const clientToken = req.headers["x-github-token"];
    const customToken = typeof clientToken === "string" ? clientToken : undefined;

    const info = await getGithubInfoHelper(repo, customToken);
    if (!info) {
      return res.status(404).json({ error: `Repository not found or unable to access. Please verify if it is public or check your GITHUB_PAT.` });
    }
    return res.status(200).json(info);
  } catch (error: any) {
    console.warn("Error fetching from GitHub:", error);
    return res.status(500).json({ error: `Failed to fetch from GitHub: ${error.message}` });
  }
}

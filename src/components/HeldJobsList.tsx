import React, { useState, useEffect } from "react";
import { 
  Briefcase, 
  Square, 
  Clock, 
  Github, 
  Save, 
  ExternalLink, 
  GitCommit, 
  Star, 
  Loader2, 
  AlertTriangle,
  Check
} from "lucide-react";
import { Project, Task } from "../types";

interface HeldJobsListProps {
  projects: Project[];
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onUpdateProject?: (projectId: string, updatedFields: Partial<Project>) => void;
}

interface GitHubCommit {
  sha: string;
  message: string;
  author_name: string;
  author_email: string;
  date: string;
  html_url: string;
}

interface GitHubRepoInfo {
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stars: number;
  forks: number;
  open_issues: number;
  pushed_at: string;
  latestCommit: GitHubCommit | null;
}

export const HeldJobsList: React.FC<HeldJobsListProps> = ({
  projects,
  tasks,
  onToggleTask,
  onUpdateProject,
}) => {
  // Filter active projects (not completed or paused, or any project that is active)
  const activeProjects = projects.filter((p) => p.status === "active");

  const [repoInfos, setRepoInfos] = useState<Record<string, { data?: GitHubRepoInfo; loading: boolean; error?: string }>>({});
  const [editingProjId, setEditingProjId] = useState<string | null>(null);
  const [repoInput, setRepoInput] = useState("");

  const getProjectTypeLabel = (type: string) => {
    switch (type) {
      case "code":
        return "開発";
      case "writing":
        return "執筆";
      case "presentation":
        return "資料作成";
      default:
        return "その他";
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-50 text-red-600 border-red-100";
      case "medium":
        return "bg-amber-50 text-amber-600 border-amber-100";
      case "low":
        return "bg-blue-50 text-blue-600 border-blue-100";
      default:
        return "bg-gray-50 text-gray-500 border-gray-100";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "高";
      case "medium":
        return "中";
      case "low":
        return "低";
      default:
        return "並";
    }
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "たった今";
      if (diffMins < 60) return `${diffMins}分前`;
      if (diffHours < 24) return `${diffHours}時間前`;
      if (diffDays < 30) return `${diffDays}日前`;
      
      return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
    } catch (e) {
      return dateStr;
    }
  };

  const fetchRepoInfo = async (repo: string) => {
    if (!repo) return;
    setRepoInfos((prev) => ({
      ...prev,
      [repo]: { ...prev[repo], loading: true, error: undefined },
    }));

    try {
      const storedPat = localStorage.getItem("temote_github_pat") || "";
      const headers: Record<string, string> = {};
      if (storedPat) {
        headers["X-GitHub-Token"] = storedPat;
      }
      const res = await fetch(`/api/github/repo-info?repo=${encodeURIComponent(repo)}`, { headers });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "情報の取得に失敗しました");
      }
      const data = await res.json();
      setRepoInfos((prev) => ({
        ...prev,
        [repo]: { data, loading: false },
      }));
    } catch (err: any) {
      setRepoInfos((prev) => ({
        ...prev,
        [repo]: { loading: false, error: err.message },
      }));
    }
  };

  useEffect(() => {
    activeProjects.forEach((project) => {
      if (project.github_repo && (!repoInfos[project.github_repo] || repoInfos[project.github_repo].error)) {
        fetchRepoInfo(project.github_repo);
      }
    });
  }, [projects]);

  const handleStartEdit = (projectId: string, currentRepo?: string) => {
    setEditingProjId(projectId);
    setRepoInput(currentRepo || "");
  };

  const handleSaveRepo = (projectId: string) => {
    if (onUpdateProject) {
      const val = repoInput.trim();
      onUpdateProject(projectId, { github_repo: val || undefined });
      setEditingProjId(null);
      if (val) {
        fetchRepoInfo(val);
      }
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs transition-all hover:shadow-sm duration-300 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#0071E3]/10 text-[#0071E3] rounded-lg">
            <Briefcase className="w-4 h-4" />
          </div>
          <h2 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider font-display">
            持ってる仕事一覧
          </h2>
        </div>
        <span className="text-[9px] font-mono bg-[#0071E3]/5 text-[#0071E3] border border-[#0071E3]/10 px-2 py-0.5 rounded-full font-bold">
          {activeProjects.length} 案件稼働中
        </span>
      </div>

      {/* Projects and Tasks List */}
      <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
        {activeProjects.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400 font-light">
            現在、抱えているアクティブな案件はありません。
          </div>
        ) : (
          activeProjects.map((project) => {
            // Find incomplete tasks for this project
            const projectTasks = tasks.filter(
              (t) => t.project_id === project.id && !t.done
            );

            const githubRepo = project.github_repo;
            const repoState = githubRepo ? repoInfos[githubRepo] : null;

            return (
              <div key={project.id} className="space-y-2.5 pb-3.5 border-b border-gray-50 last:border-0 last:pb-0">
                {/* Project Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-gray-50 border border-gray-100 text-gray-500 font-medium shrink-0">
                        {getProjectTypeLabel(project.type)}
                      </span>
                      <h3 className="font-semibold text-xs text-gray-900 truncate max-w-[120px] sm:max-w-[160px]">
                        {project.name}
                      </h3>
                      
                      {/* GitHub Icon Indicator / Linker */}
                      {onUpdateProject && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleStartEdit(project.id, project.github_repo)}
                            className={`p-1 rounded-md transition-colors ${
                              project.github_repo 
                                ? "text-[#24292F] hover:bg-gray-100" 
                                : "text-gray-300 hover:text-gray-600 hover:bg-gray-50"
                            }`}
                            title={project.github_repo ? "GitHub連携を編集" : "GitHubリポジトリを連携"}
                          >
                            <Github className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => {
                              if (confirm(`プロジェクト「${project.name}」を完了（100%）にしますか？`)) {
                                onUpdateProject(project.id, {
                                  progress_percent: 100,
                                });
                              }
                            }}
                            className="p-1 rounded-md text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="プロジェクトを完了（100%）にする"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {project.deadline && (
                      <p className="text-[9px] text-gray-400 font-mono">
                        期日: {project.deadline}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-gray-700 shrink-0">
                    {project.progress_percent}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0071E3] h-full rounded-full transition-all duration-500"
                    style={{ width: `${project.progress_percent}%` }}
                  />
                </div>

                {/* GitHub Repo Inline Edit Form */}
                {editingProjId === project.id && (
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">GitHub連携設定</span>
                      <span className="text-[8px] text-gray-400">owner/repo 形式またはURL</span>
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="text"
                        value={repoInput}
                        onChange={(e) => setRepoInput(e.target.value)}
                        placeholder="例: facebook/react"
                        className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#0071E3] flex-1 bg-white text-gray-800"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveRepo(project.id)}
                        className="p-1.5 text-white bg-[#0071E3] rounded-lg hover:bg-[#0071E3]/90 transition-all flex items-center justify-center shrink-0"
                        title="保存"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingProjId(null)}
                        className="p-1.5 text-gray-500 bg-gray-200/60 rounded-lg hover:bg-gray-200 transition-all text-xs font-semibold shrink-0"
                        title="キャンセル"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {/* GitHub Info Display Area */}
                {githubRepo && (
                  <div className="bg-gray-50/70 rounded-xl p-2.5 border border-gray-100 space-y-1.5 font-sans">
                    {repoState?.loading && (
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 py-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>GitHub情報を取得中...</span>
                      </div>
                    )}

                    {repoState?.error && (
                      <div className="flex items-start gap-1.5 text-[9px] text-amber-600 bg-amber-50/50 p-1.5 rounded-lg border border-amber-100/30">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                        <div className="space-y-0.5">
                          <p className="font-semibold">GitHub連携エラー</p>
                          <p className="text-gray-500 leading-tight">{repoState.error}</p>
                        </div>
                      </div>
                    )}

                    {repoState?.data && (
                      <div className="space-y-2 text-[10px]">
                        {/* Repo Title & Stats */}
                        <div className="flex items-center justify-between gap-2">
                          <a
                            href={repoState.data.html_url}
                            target="_blank"
                            referrerPolicy="no-referrer"
                            className="flex items-center gap-1 font-semibold text-gray-700 hover:text-[#0071E3] hover:underline truncate"
                          >
                            <Github className="w-3 h-3 text-[#24292F] shrink-0" />
                            <span className="truncate">{repoState.data.full_name}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-50 shrink-0" />
                          </a>

                          <div className="flex items-center gap-1.5 font-mono text-gray-400 shrink-0 text-[9px]">
                            <span className="flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                              {repoState.data.stars}
                            </span>
                          </div>
                        </div>

                        {/* Latest Commit Details */}
                        {repoState.data.latestCommit ? (
                          <div className="bg-white rounded-lg p-2 border border-gray-50 space-y-1">
                            <div className="flex items-center justify-between gap-1.5 text-[8px] text-gray-400 font-mono">
                              <span className="flex items-center gap-0.5 text-gray-500 font-semibold truncate">
                                <GitCommit className="w-3 h-3 text-emerald-500 shrink-0" />
                                {repoState.data.latestCommit.author_name}
                              </span>
                              <span className="shrink-0">{formatTimeAgo(repoState.data.latestCommit.date)}</span>
                            </div>
                            <p className="text-gray-600 font-light text-[10px] leading-relaxed line-clamp-2">
                              {repoState.data.latestCommit.message}
                            </p>
                            <div className="flex justify-end">
                              <a
                                href={repoState.data.latestCommit.html_url}
                                target="_blank"
                                referrerPolicy="no-referrer"
                                className="text-[8px] font-mono text-gray-400 hover:text-[#0071E3] hover:underline flex items-center gap-0.5"
                              >
                                {repoState.data.latestCommit.sha.substring(0, 7)} <ExternalLink className="w-2 h-2" />
                              </a>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-400 italic text-[9px] pl-1">コミット情報がありません</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Unfinished Tasks list */}
                <div className="pl-1.5 space-y-1.5 pt-1">
                  {projectTasks.length === 0 ? (
                    <p className="text-[10px] text-gray-400 italic font-light pl-2">
                      ✓ 残りのタスクはありません。
                    </p>
                  ) : (
                    projectTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => onToggleTask(task.id)}
                        className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-gray-50/70 border border-transparent hover:border-gray-100 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <button className="text-gray-400 group-hover:text-gray-600 transition-colors shrink-0">
                            <Square className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[11px] text-gray-600 truncate group-hover:text-gray-900 transition-colors">
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Task Time */}
                          <div className="flex items-center gap-0.5 text-gray-400 text-[9px] font-mono">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{task.estimated_minutes}分</span>
                          </div>

                          {/* Priority Badge */}
                          <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full border ${getPriorityBadgeColor(task.priority)}`}>
                            {getPriorityLabel(task.priority)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

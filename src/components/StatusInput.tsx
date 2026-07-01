import React, { useState } from "react";
import { Send, Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Project, Task, Settings } from "../types";

interface StatusInputProps {
  projects: Project[];
  tasks: Task[];
  settings: Settings;
  onAnalysisSuccess: (result: {
    responseText: string;
    newProject: Project | null;
    updatedProjects: { id: string; progress_percent: number; last_worked_at: string }[];
    createdTasks: any[];
    completedTaskIds: string[];
  }) => void;
  isGuest: boolean;
}

export const StatusInput: React.FC<StatusInputProps> = ({
  projects,
  tasks,
  settings,
  onAnalysisSuccess,
  isGuest
}) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{ name: string; type: "code" | "writing" } | null>(null);
  const [proposedResponse, setProposedResponse] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setLoading(true);
    setError(null);
    setProposal(null);

    try {
      const response = await fetch("/api/temote/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInput: input,
          projects,
          tasks,
          settings
        }),
      });

      if (!response.ok) {
        throw new Error("サーバーとの通信に失敗しました。");
      }

      const data = await response.json();

      if (data.newProjectProposal) {
        setProposal({
          name: data.newProjectProposal.name,
          type: data.newProjectProposal.type || "code"
        });
        setProposedResponse(data);
      } else {
        onAnalysisSuccess({
          responseText: data.responseText,
          newProject: null,
          updatedProjects: data.updatedProjects || [],
          createdTasks: data.createdTasks || [],
          completedTaskIds: data.completedTaskIds || []
        });
        setInput("");
      }
    } catch (err: any) {
      setError(err.message || "予期せぬエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptProposal = () => {
    if (!proposal || !proposedResponse) return;

    const newProjId = `proj-${Date.now()}`;
    const newProject: Project = {
      id: newProjId,
      name: proposal.name,
      type: proposal.type,
      status: "active",
      progress_percent: 0,
      last_worked_at: new Date().toISOString()
    };

    const updatedCreatedTasks = (proposedResponse.createdTasks || []).map((t: any) => ({
      ...t,
      project_id: t.project_id === "" ? newProjId : t.project_id
    }));

    onAnalysisSuccess({
      responseText: `新プロジェクト『${proposal.name}』を登録しました。よろしくお願いします。`,
      newProject,
      updatedProjects: proposedResponse.updatedProjects || [],
      createdTasks: updatedCreatedTasks,
      completedTaskIds: proposedResponse.completedTaskIds || []
    });

    setInput("");
    setProposal(null);
    setProposedResponse(null);
  };

  const handleDeclineProposal = () => {
    if (!proposedResponse) return;

    onAnalysisSuccess({
      responseText: `承知しました。今は既存のプロジェクトの完成に向けて注力しましょう。`,
      newProject: null,
      updatedProjects: proposedResponse.updatedProjects || [],
      createdTasks: (proposedResponse.createdTasks || []).filter((t: any) => t.project_id !== ""),
      completedTaskIds: proposedResponse.completedTaskIds || []
    });

    setInput("");
    setProposal(null);
    setProposedResponse(null);
  };

  const activeIncompleteCount = projects.filter(
    (p) => p.status === "active" && p.progress_percent < 100
  ).length;

  const closeToCompleteProj = projects.find(
    (p) => p.status === "active" && p.progress_percent >= 80 && p.progress_percent < 100
  );

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xs hover:shadow-sm transition-all duration-300">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
        <div className="flex items-center gap-1.5">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] font-display">現状入力欄</h4>
        </div>
        <span className="text-[9px] font-mono tracking-widest text-gray-400 uppercase font-bold">
          {isGuest ? "GUEST MODE" : "CONNECTED"}
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-5 leading-relaxed font-light">
        今、何をしていますか？進捗や直近の状況、思いついた課題を自由に入力してください。テモテが内容を自動で解析し、タスクや進捗度へマッピングします。
      </p>

      {proposal ? (
        <div className="bg-[#FFF9E6] border border-[#F4E0A5] rounded-2xl p-5 mb-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
            <div className="space-y-3 flex-1">
              <h4 className="text-xs font-semibold text-[#B45309] uppercase tracking-wider font-display">
                ⚠️ ブレーキ機能：新プロジェクトの確認
              </h4>
              <p className="text-xs text-[#92400E] leading-relaxed font-light">
                『<span className="font-semibold">{proposal.name}</span>』という新しいプロジェクトへの言及を検出しました。
                {closeToCompleteProj ? (
                  <>
                    現在、既存のプロジェクト「<span className="font-semibold">{closeToCompleteProj.name}</span>」は完成（進捗 {closeToCompleteProj.progress_percent}%）まであと少しです。
                    新しいことに着手する前に、こちらを先に完成させませんか？
                  </>
                ) : (
                  <>
                    現在、稼働中のプロジェクトが {activeIncompleteCount} 件あります。新規に追加しても大丈夫ですか？
                  </>
                )}
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAcceptProposal}
                  className="px-4 py-1.5 bg-[#1D1D1F] hover:bg-black text-white rounded-full text-[11px] font-semibold transition-transform hover:scale-[1.02] cursor-pointer"
                >
                  はい、新規追加する
                </button>
                <button
                  onClick={handleDeclineProposal}
                  className="px-4 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-[11px] font-medium transition-colors cursor-pointer"
                >
                  既存プロジェクトに集中
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-gray-50/50 hover:bg-white border border-gray-150 rounded-2xl focus-within:ring-2 focus-within:ring-gray-100 focus-within:border-gray-300 transition-all">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例：050callのエラーハンドリング直してる、次はCONCERTANTEのフォロー機能"
              rows={3}
              disabled={loading}
              className="w-full bg-transparent outline-hidden text-sm text-[#1D1D1F] placeholder:text-gray-300 font-light resize-none transition-all"
            />
          </div>

          {error && (
            <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-1">
            <div className="text-[10px] font-mono text-gray-400">
              {input.length > 0 ? `${input.length} 文字` : "⌘ + Enterで送信"}
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold transition-transform duration-200 ${
                input.trim() && !loading
                  ? "bg-[#1D1D1F] hover:bg-black text-white hover:scale-[1.02] cursor-pointer shadow-sm"
                  : "bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>解析中...</span>
                </>
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  <span>送信</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};


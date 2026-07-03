import React, { useState, useEffect } from "react";
import { 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  Shuffle, 
  Sparkles, 
  Loader2, 
  Compass, 
  Github, 
  X, 
  AlertCircle, 
  Copy 
} from "lucide-react";
import { Project, Task } from "../types";

interface HomeViewProps {
  greeting: string;
  recommendedTask: Task | null;
  recommendationReason: string;
  onCompleteTask: (taskId: string, timeSpentMinutes: number) => void;
  onGetAlternativeSuggestion: () => void;
  loadingSuggestion: boolean;
  projects: Project[];
  tasks: Task[];
  onStartTask: (taskId: string) => void;
  onCancelTask: (taskId: string) => void;
  onExtendTask: (taskId: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  greeting,
  recommendedTask,
  recommendationReason,
  onCompleteTask,
  onGetAlternativeSuggestion,
  loadingSuggestion,
  projects,
  tasks,
  onStartTask,
  onCancelTask,
  onExtendTask,
}) => {
  // Find if there is any active in-progress task
  const activeInProgressTask = tasks.find((t) => t.status === "in_progress" && !t.done);

  // Suggested project details for the recommended task
  const suggestedProject = recommendedTask
    ? projects.find((p) => p.id === recommendedTask.project_id)
    : null;

  // Project details for the in-progress task
  const inProgressProject = activeInProgressTask
    ? projects.find((p) => p.id === activeInProgressTask.project_id)
    : null;

  // Timer local state for countdown
  const [timerNow, setTimerNow] = useState<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Sync remaining seconds when the in-progress task starts/updates
  useEffect(() => {
    if (activeInProgressTask) {
      setTimerNow(Date.now());
      setIsPaused(false);
      setShowConfirmModal(false);
    } else {
      setTimerNow(0);
      setIsPaused(false);
      setShowConfirmModal(false);
    }
  }, [activeInProgressTask?.id, activeInProgressTask?.started_at]);

  const startedAtTime = activeInProgressTask
    ? new Date(activeInProgressTask.started_at || "").getTime()
    : 0;

  const elapsedSeconds = activeInProgressTask
    ? Math.max(0, Math.floor((timerNow - startedAtTime) / 1000))
    : 0;

  const remainingSeconds = activeInProgressTask
    ? Math.max(0, activeInProgressTask.estimated_minutes * 60 - elapsedSeconds)
    : 0;

  // Handle countdown interval
  useEffect(() => {
    if (!activeInProgressTask || isPaused || showConfirmModal) return;

    const interval = setInterval(() => {
      setTimerNow((prev) => prev + 1000);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeInProgressTask?.id, isPaused, showConfirmModal]);

  // Trigger confirmation modal when countdown reaches 0
  useEffect(() => {
    if (activeInProgressTask && remainingSeconds === 0 && !showConfirmModal) {
      setShowConfirmModal(true);
    }
  }, [remainingSeconds, activeInProgressTask, showConfirmModal]);

  // Handle Start Task
  const handleStartTaskClick = () => {
    if (recommendedTask) {
      onStartTask(recommendedTask.id);
    }
  };

  // Pause / Resume Focus
  const handlePauseResume = () => {
    setIsPaused((prev) => !prev);
  };

  // Reset local timer back to full estimated minutes
  const handleResetTimer = () => {
    if (activeInProgressTask) {
      setTimerNow(startedAtTime);
      setIsPaused(true);
    }
  };

  // Complete task manually or from modal
  const handleCompleteTask = () => {
    if (!activeInProgressTask) return;
    const totalEstimatedSeconds = activeInProgressTask.estimated_minutes * 60;
    const elapsedSecondsVal = Math.max(0, totalEstimatedSeconds - remainingSeconds);
    const minutesSpent = Math.max(1, Math.round(elapsedSecondsVal / 60));
    
    onCompleteTask(activeInProgressTask.id, minutesSpent);
    setShowConfirmModal(false);
  };

  // Keep going (extend task countdown)
  const handleKeepGoing = () => {
    if (activeInProgressTask) {
      onExtendTask(activeInProgressTask.id);
      setShowConfirmModal(false);
    }
  };

  // Cancel task progress
  const handleCancelTaskClick = () => {
    if (activeInProgressTask) {
      if (confirm("作業中のステータスをリセットし、ToDoリストに戻しますか？")) {
        onCancelTask(activeInProgressTask.id);
      }
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Convert AI Assignee to readable text with styled labels
  const getAssigneeLabel = (assignee: string) => {
    switch (assignee) {
      case "claude":
        return { name: "Claude 3.5 Sonnet", color: "bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100" };
      case "chatgpt":
        return { name: "ChatGPT-4o", color: "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100" };
      case "gemini":
        return { name: "Gemini 3.5 Flash", color: "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100" };
      default:
        return { name: "Gemini 3.5 Flash", color: "bg-gray-50 text-gray-700 border-gray-100 hover:bg-gray-100" };
    }
  };

  // Clipboard copy and toast notification logic
  const handleAiBadgeClick = (task: Task) => {
    const proj = projects.find(p => p.id === task.project_id);
    const assigneeLabel = getAssigneeLabel(task.ai_assignee).name;
    
    const textToCopy = `以下のタスクとプロジェクトに関する進捗状況を共有します。

■ プロジェクト名: ${proj?.name || "未割当・その他"} (進捗率: ${proj?.progress_percent || 0}%)
■ 集中タスク: ${task.title} (目標時間: ${task.estimated_minutes}分)
■ 優先度: ${task.priority === "high" ? "高" : task.priority === "medium" ? "中" : "低"}
■ 担当推奨AI: ${assigneeLabel}

このタスクの実行において、具体的な手順、サンプル実装、または効果的な進め方についてアドバイスをお願いします！`;

    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        const shortName = task.ai_assignee === "claude" ? "Claude" : 
                          task.ai_assignee === "chatgpt" ? "ChatGPT" : "Gemini";
        setToastMsg(`${shortName}に貼り付ける準備ができました！ 📋`);
        setTimeout(() => setToastMsg(null), 3000);
      })
      .catch((err) => {
        console.error("Clipboard copy failed:", err);
      });
  };

  return (
    <div className="space-y-4">
      {/* Greetings Area */}
      <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-[#0071E3]/10 text-[#0071E3] rounded-xl shrink-0">
          <Sparkles className="w-4 h-4 animate-pulse" />
        </div>
        <div className="space-y-1">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono">SECRETARY FEEDBACK</span>
          <p className="text-[12.5px] font-medium text-gray-800 leading-relaxed font-sans">{greeting}</p>
        </div>
      </div>

      {/* Active Task Focus Mode ("今、これに取り組んでいます") */}
      {activeInProgressTask ? (
        <div className="bg-slate-950 border-2 border-slate-900 rounded-2xl p-5 sm:p-6 shadow-md text-white transition-all duration-300 animate-fade-in relative overflow-hidden">
          {/* Subtle glowing pulse background */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full filter blur-2xl pointer-events-none" />
          
          <div className="text-center space-y-4 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-red-400">
                  今、これに取り組んでいます
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 mt-1 text-xs">
                <span className="font-semibold text-blue-400 tracking-wider font-mono">
                  {inProgressProject?.name || "一般タスク"}
                </span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-400 font-mono">
                  目標時間: {activeInProgressTask.estimated_minutes}分
                </span>
              </div>
              
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white px-4 leading-snug">
                {activeInProgressTask.title}
              </h2>
            </div>

            {/* Countdown / Elapsed Timer */}
            <div className="py-4 select-none">
              <div className="text-5xl sm:text-6xl font-mono font-light text-white tracking-tighter">
                {formatTime(remainingSeconds)}
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="text-[9px] text-gray-400 uppercase font-bold tracking-[0.2em]">
                  残り時間
                </div>
                <div className="text-gray-600">|</div>
                <div className="text-[9px] text-gray-400 font-bold tracking-[0.2em] uppercase">
                  経過時間: {formatTime(elapsedSeconds)}
                </div>
              </div>
            </div>

            {/* AI Assistant helper for active task */}
            <div className="flex justify-center pb-2">
              <button
                onClick={() => handleAiBadgeClick(activeInProgressTask)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                title="タスク情報をコピー"
              >
                <span>推奨担当AI: {getAssigneeLabel(activeInProgressTask.ai_assignee).name}</span>
                <Copy className="w-3 h-3 text-gray-400" />
              </button>
            </div>

            {/* Focus Controls */}
            <div className="flex justify-center items-center gap-3 pt-2">
              <button
                onClick={handlePauseResume}
                className={`p-3 rounded-full border transition-all cursor-pointer ${
                  isPaused
                    ? "bg-emerald-500 hover:bg-emerald-600 text-slate-950 border-emerald-400"
                    : "bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400"
                }`}
                title={isPaused ? "再開" : "一時停止"}
              >
                {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
              </button>
              
              <button
                onClick={handleResetTimer}
                className="p-3 bg-slate-900 hover:bg-slate-800 text-gray-300 border border-slate-800 rounded-full transition-all cursor-pointer"
                title="タイマーリセット"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowConfirmModal(true)}
                className="flex items-center gap-1.5 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold shadow-md hover:scale-[1.02] transition-transform cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>完了して記録する</span>
              </button>

              <button
                onClick={handleCancelTaskClick}
                className="p-3 bg-slate-900 hover:bg-red-950 text-red-400 border border-slate-800 rounded-full transition-all cursor-pointer"
                title="ToDoに戻す"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Today's recommendation view (Only visible if nothing is in_progress) */
        <div className="bg-white border border-gray-100/80 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-sm transition-all duration-300">
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-50">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[10px] font-bold text-[#0071E3] uppercase tracking-[0.2em] font-display">
                今日のおすすめ
              </h3>
            </div>
            {recommendedTask && (
              <span className="px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase border bg-gray-50 border-gray-100 text-gray-400 font-mono">
                優先度: {recommendedTask.priority === "high" ? "高" : recommendedTask.priority === "medium" ? "中" : "低"}
              </span>
            )}
          </div>

          {loadingSuggestion ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
              <p className="text-[11px] text-gray-400 font-light">最適な提案を検討中...</p>
            </div>
          ) : recommendedTask ? (
            <div className="space-y-2.5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="font-mono font-semibold text-[#1D1D1F] border-b border-[#1D1D1F] pb-0.5">
                    {suggestedProject?.name || "新規・その他"}
                  </span>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[9.5px] text-gray-400 uppercase tracking-wider">予想時間</span>
                    <span className="text-base font-mono tracking-tighter italic font-medium text-gray-800">{recommendedTask.estimated_minutes}分</span>
                  </div>
                  {suggestedProject?.github_repo && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border bg-gray-50 border-gray-200 text-[#24292F] font-mono">
                        <Github className="w-3 h-3 text-[#24292F]" />
                        <span>GitHub状況分析</span>
                      </span>
                    </>
                  )}
                </div>

                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#1D1D1F] leading-snug font-display">
                  {recommendedTask.title}
                </h2>

                {recommendationReason && (
                  <p className="text-[10.5px] text-gray-400 italic leading-relaxed font-light pl-2 border-l border-gray-100">
                    💡 {recommendationReason}
                  </p>
                )}
              </div>

              {/* AI Assistant Context (Clickable badge to copy prompt to clipboard) */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">推奨担当AI:</span>
                  <button
                    onClick={() => handleAiBadgeClick(recommendedTask)}
                    className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-semibold tracking-wider uppercase border flex items-center gap-1 transition-colors cursor-pointer ${getAssigneeLabel(recommendedTask.ai_assignee).color}`}
                    title="クリックしてプロンプト文脈をコピー"
                  >
                    <span>{getAssigneeLabel(recommendedTask.ai_assignee).name}</span>
                    <Copy className="w-2.5 h-2.5 shrink-0 opacity-70" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  onClick={handleStartTaskClick}
                  className="px-5 py-1.5 bg-[#1D1D1F] hover:bg-black text-white text-xs font-semibold rounded-full shadow-xs hover:scale-[1.02] transition-transform cursor-pointer flex items-center justify-center gap-1"
                >
                  <Play className="w-3 h-3 shrink-0" />
                  <span>始める</span>
                </button>
                <button
                  onClick={onGetAlternativeSuggestion}
                  className="px-3.5 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full font-semibold text-xs hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer flex items-center justify-center"
                  title="別の提案"
                >
                  <Shuffle className="w-3 h-3 shrink-0" />
                  <span className="ml-1 sm:inline hidden">別の提案</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center space-y-1.5">
              <Compass className="w-5 h-5 text-gray-300 mx-auto" />
              <p className="text-xs text-gray-400 font-light">現在、おすすめできるタスクがありません。</p>
              <p className="text-[9px] text-gray-400 max-w-sm mx-auto leading-relaxed">
                「今持ってる仕事」欄に近況を報告するか、手動でプロジェクト・タスクを追加してみてください。
              </p>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal ("完了しましたか？") */}
      {showConfirmModal && activeInProgressTask && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border-2 border-slate-950 rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 relative">
            <div className="flex items-center gap-2 text-blue-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-base text-slate-900">完了しましたか？</h3>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600">
              <p className="font-medium text-slate-800 line-clamp-2">
                {activeInProgressTask.title}
              </p>
              <p className="text-[10px] text-gray-400">
                所属: {inProgressProject?.name || "一般タスク"}
              </p>
              <p className="leading-relaxed font-light">
                目標時間を完了しました。進捗ステータスを確定してください。引き続き同じ作業を行う場合は延長が可能です。
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                onClick={handleKeepGoing}
                className="flex-1 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                まだ続ける
              </button>
              <button
                onClick={handleCompleteTask}
                className="flex-1 py-2 bg-slate-950 hover:bg-black text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                完了する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smooth Slide-in Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-medium animate-slide-in z-50">
          <span className="p-1 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Check className="w-3.5 h-3.5" />
          </span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};

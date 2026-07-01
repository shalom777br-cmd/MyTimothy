import React, { useState, useEffect } from "react";
import { Clock, Play, Pause, RotateCcw, Check, Shuffle, Sparkles, Loader2, Compass } from "lucide-react";
import { Project, Task } from "../types";

interface HomeViewProps {
  greeting: string;
  recommendedTask: Task | null;
  recommendationReason: string;
  onCompleteTask: (taskId: string, timeSpentMinutes: number) => void;
  onGetAlternativeSuggestion: () => void;
  loadingSuggestion: boolean;
  projects: Project[];
}

export const HomeView: React.FC<HomeViewProps> = ({
  greeting,
  recommendedTask,
  recommendationReason,
  onCompleteTask,
  onGetAlternativeSuggestion,
  loadingSuggestion,
  projects
}) => {
  const [isActiveMode, setIsActiveMode] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  // Suggested project name
  const suggestedProject = recommendedTask
    ? projects.find((p) => p.id === recommendedTask.project_id)
    : null;

  // Track time
  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const handleStartTask = () => {
    setIsActiveMode(true);
    setTimerSeconds(0);
    setTimerRunning(true);
  };

  const handlePauseResume = () => {
    setTimerRunning((prev) => !prev);
  };

  const handleResetTimer = () => {
    setTimerSeconds(0);
    setTimerRunning(false);
  };

  const handleCompleteTask = () => {
    if (!recommendedTask) return;
    const minutesSpent = Math.max(1, Math.round(timerSeconds / 60));
    onCompleteTask(recommendedTask.id, minutesSpent);
    setIsActiveMode(false);
    setTimerSeconds(0);
    setTimerRunning(false);
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
        return { name: "Claude 3.5 Sonnet", color: "bg-orange-50 text-orange-700 border-orange-100" };
      case "chatgpt":
        return { name: "ChatGPT-4o", color: "bg-emerald-50 text-emerald-700 border-emerald-100" };
      case "gemini":
        return { name: "Gemini 3.5 Flash", color: "bg-blue-50 text-blue-700 border-blue-100" };
      default:
        return { name: "Gemini 3.5 Flash", color: "bg-gray-50 text-gray-700 border-gray-100" };
    }
  };

  return (
    <div className="space-y-4">
      {/* Focus Timer or Today's Recommendation */}
      {isActiveMode && recommendedTask ? (
        // Active Task Focus Mode (Styled elegantly as Apple-like interface)
        <div className="bg-white border-2 border-[#1D1D1F] rounded-2xl p-5 shadow-sm transition-all duration-300 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <span className="px-3 py-0.5 rounded-full text-[9px] font-bold tracking-[0.15em] uppercase border bg-gray-50 border-gray-100 text-gray-400">
                FOCUS MODE
              </span>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-xs font-semibold text-[#0071E3] tracking-wider uppercase font-mono">
                  {suggestedProject?.name || "一般タスク"}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-400 font-mono">
                  目標: {recommendedTask.estimated_minutes}分
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-[#1D1D1F] px-4">
                {recommendedTask.title}
              </h2>
            </div>

            {/* Big Stopwatch Timer */}
            <div className="py-4 select-none">
              <div className="text-4xl sm:text-5xl font-mono font-light text-[#1D1D1F] tracking-tighter">
                {formatTime(timerSeconds)}
              </div>
              <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold tracking-[0.2em]">
                経過時間
              </p>
            </div>

            {/* Focus Controls */}
            <div className="flex justify-center items-center gap-3 pt-1">
              <button
                onClick={handlePauseResume}
                className={`p-2.5 rounded-full border transition-all cursor-pointer ${
                  timerRunning
                    ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                }`}
                title={timerRunning ? "一時停止" : "再開"}
              >
                {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              
              <button
                onClick={handleResetTimer}
                className="p-2.5 bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 rounded-full transition-all cursor-pointer"
                title="タイマーリセット"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleCompleteTask}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-[#1D1D1F] hover:bg-black text-white rounded-full text-xs font-semibold shadow-xs hover:scale-[1.02] transition-transform cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>完了して記録する</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Standard Today's recommendation view
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

              {/* AI Assistant context */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">推奨担当AI:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase border ${getAssigneeLabel(recommendedTask.ai_assignee).color}`}>
                    {getAssigneeLabel(recommendedTask.ai_assignee).name}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  onClick={handleStartTask}
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
    </div>
  );
};


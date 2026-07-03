import React, { useState } from "react";
import { Calendar, Clock, Coffee, Utensils, BookOpen, Sparkles, Loader2, Play, AlertCircle, RefreshCw, MapPin } from "lucide-react";
import { Project, Task, CalendarEvent } from "../types";

interface ScheduleBlock {
  id: string;
  time: string;
  title: string;
  type: "work" | "break" | "lunch" | "review" | "transit";
  task_id: string | null;
  project_id: string | null;
  duration_minutes: number;
  reason: string;
}

interface DailySchedulePanelProps {
  projects: Project[];
  tasks: Task[];
  events: CalendarEvent[];
  selectedDateStr: string;
  onSelectTaskToFocus: (task: Task) => void;
}

export const DailySchedulePanel: React.FC<DailySchedulePanelProps> = ({
  projects,
  tasks,
  events,
  selectedDateStr,
  onSelectTaskToFocus,
}) => {
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleBlock[] | null>(null);
  const [advice, setAdvice] = useState<string>("");
  const [error, setError] = useState<string>("");

  React.useEffect(() => {
    setSchedule(null);
    setAdvice("");
    setError("");
  }, [selectedDateStr]);

  const handleGenerateSchedule = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/temote/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projects,
          tasks,
          events,
          targetDate: selectedDateStr,
        }),
      });

      if (!response.ok) {
        throw new Error("スケジュール提案の取得に失敗しました。");
      }

      const data = await response.json();
      if (data.schedule && data.schedule.length > 0) {
        setSchedule(data.schedule);
        setAdvice(data.advice || "");
      } else {
        throw new Error("スケジュール情報が空でした。");
      }
    } catch (err: any) {
      console.error(err);
      setError("スケジュールの自動生成中に問題が発生しました。しばらくしてから再度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const getBlockStyles = (type: ScheduleBlock["type"]) => {
    switch (type) {
      case "work":
        return {
          icon: <Clock className="w-4 h-4 text-amber-600" />,
          bg: "bg-amber-50/50 hover:bg-amber-50 border-amber-100",
          badge: "bg-amber-100 text-amber-800 border-amber-200",
          label: "作業"
        };
      case "break":
        return {
          icon: <Coffee className="w-4 h-4 text-emerald-600" />,
          bg: "bg-emerald-50/30 hover:bg-emerald-50/60 border-emerald-100/50",
          badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
          label: "休憩"
        };
      case "lunch":
        return {
          icon: <Utensils className="w-4 h-4 text-blue-600" />,
          bg: "bg-blue-50/30 hover:bg-blue-50/60 border-blue-100/50",
          badge: "bg-blue-50 text-blue-700 border-blue-100",
          label: "お昼"
        };
      case "review":
        return {
          icon: <BookOpen className="w-4 h-4 text-purple-600" />,
          bg: "bg-purple-50/40 hover:bg-purple-50 border-purple-150",
          badge: "bg-purple-50 text-purple-700 border-purple-100",
          label: "整理"
        };
      case "transit":
        return {
          icon: <MapPin className="w-4 h-4 text-rose-600" />,
          bg: "bg-rose-50/40 hover:bg-rose-50 border-rose-100",
          badge: "bg-rose-50 text-rose-700 border-rose-100",
          label: "移動"
        };
    }
  };

  const handleStartTask = (taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (targetTask) {
      onSelectTaskToFocus(targetTask);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs transition-all hover:shadow-sm duration-300">
      <div className="flex items-center justify-between mb-4 pb-1.5 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#0071E3]" />
          <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] font-display">
            1日のタイムスケジュール提案
          </h2>
        </div>
        {schedule && (
          <button
            onClick={handleGenerateSchedule}
            disabled={loading}
            className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1 cursor-pointer transition-colors"
            title="スケジュールを再生成"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0071E3]" : ""}`} />
            <span>再生成</span>
          </button>
        )}
      </div>

      {!schedule && !loading && (
        <div className="text-center py-6 space-y-3.5">
          <div className="bg-gray-50 max-w-sm mx-auto p-4 rounded-xl space-y-2">
            <p className="text-xs text-gray-700 font-light leading-relaxed">
              登録されている仕事、それぞれの進捗（%）、締切スケジュール、優先度を分析して、あなただけの無理のない1日スケジュール（9:00〜18:00）を自動構成します。
            </p>
          </div>
          <button
            onClick={handleGenerateSchedule}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1D1D1F] hover:bg-black text-white rounded-full text-xs font-semibold shadow-xs hover:scale-[1.02] transition-transform cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>{selectedDateStr} のスケジュール表を提案してもらう</span>
          </button>
        </div>
      )}

      {loading && (
        <div className="py-12 flex flex-col items-center justify-center gap-2.5">
          <Loader2 className="w-6 h-6 text-[#0071E3] animate-spin" />
          <p className="text-xs text-gray-400 font-light">
            仕事の重み、進行、締切をふまえて最適なタイムテーブルを編成中...
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50/50 border border-red-100 rounded-xl p-3.5 flex gap-2.5 text-xs text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="font-light">{error}</p>
        </div>
      )}

      {schedule && !loading && (
        <div className="space-y-4 animate-fade-in">
          {/* Advice card from Temote */}
          {advice && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1.5 relative overflow-hidden">
              <div className="flex items-center gap-1.5 text-[#1D1D1F] font-semibold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>秘書テモテの分析とアドバイス</span>
              </div>
              <p className="text-xs text-gray-600 font-light leading-relaxed pl-5">
                {advice}
              </p>
            </div>
          )}

          {/* Timeline list */}
          <div className="relative border-l border-gray-100 pl-4 ml-1.5 space-y-3.5 py-1">
            {schedule.map((block, idx) => {
              const styles = getBlockStyles(block.type);
              const showPlayButton = block.type === "work" && block.task_id;

              return (
                <div key={`${block.id}-${idx}`} className="relative group">
                  {/* Timeline node */}
                  <div className="absolute -left-[25px] top-1.5 bg-white p-1 rounded-full border border-gray-150 shadow-2xs group-hover:border-gray-300 transition-colors">
                    {styles.icon}
                  </div>

                  {/* Block Card */}
                  <div className={`p-3 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${styles.bg}`}>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-gray-700 tracking-tight">
                          {block.time}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${styles.badge}`}>
                          {styles.label} ({block.duration_minutes}分)
                        </span>
                      </div>
                      
                      <h3 className="font-semibold text-gray-800 text-[12px] tracking-tight">
                        {block.title}
                      </h3>

                      {block.reason && (
                        <p className="text-[10px] text-gray-400 font-light leading-snug">
                          {block.reason}
                        </p>
                      )}
                    </div>

                    {showPlayButton && block.task_id && (
                      <button
                        onClick={() => handleStartTask(block.task_id!)}
                        className="self-start sm:self-center shrink-0 flex items-center gap-1 px-3 py-1 bg-white hover:bg-[#1D1D1F] hover:text-white border border-gray-200 hover:border-[#1D1D1F] text-[#1D1D1F] rounded-full text-[10px] font-semibold transition-all cursor-pointer shadow-2xs hover:scale-102"
                        title="このタスクにフォーカス"
                      >
                        <Play className="w-3 h-3 shrink-0" />
                        <span>フォーカス</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

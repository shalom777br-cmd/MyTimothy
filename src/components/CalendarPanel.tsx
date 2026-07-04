import React, { useState } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Clock, 
  MapPin, 
  Briefcase, 
  Video, 
  Coffee, 
  BookOpen, 
  User, 
  Tag,
  AlertCircle
} from "lucide-react";
import { Project, CalendarEvent } from "../types";

interface CalendarPanelProps {
  projects: Project[];
  events: CalendarEvent[];
  selectedDateStr: string;
  onSelectDate: (dateStr: string) => void;
  onAddEvent: (event: Omit<CalendarEvent, "id">) => void;
  onDeleteEvent: (eventId: string) => void;
}

export const CalendarPanel: React.FC<CalendarPanelProps> = ({
  projects,
  events,
  selectedDateStr,
  onSelectDate,
  onAddEvent,
  onDeleteEvent,
}) => {
  // Navigation states for year & month
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  // Synchronize year & month view when selectedDateStr changes
  React.useEffect(() => {
    if (selectedDateStr) {
      const parts = selectedDateStr.split("-").map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        setCurrentYear(parts[0]);
        setCurrentMonth(parts[1] - 1);
      }
    }
  }, [selectedDateStr]);


  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("10:00");
  const [newDuration, setNewDuration] = useState("30");
  const [newType, setNewType] = useState<CalendarEvent["type"]>("work");
  const [newProjectId, setNewProjectId] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [formError, setFormError] = useState("");

  // Helpers for month rendering
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Sun) to 6 (Sat)
  
  const monthNames = [
    "1月", "2月", "3月", "4月", "5月", "6月", 
    "7月", "8月", "9月", "10月", "11月", "12月"
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // Build grid data
  const gridCells: { dateStr: string; dayNum: number | null; isToday: boolean; isSelected: boolean }[] = [];
  
  // Fill empty leading cells
  for (let i = 0; i < firstDayIndex; i++) {
    gridCells.push({ dateStr: "", dayNum: null, isToday: false, isSelected: false });
  }

  // Fill actual day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isToday = today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day;
    const isSelected = selectedDateStr === formattedDate;
    
    gridCells.push({
      dateStr: formattedDate,
      dayNum: day,
      isToday,
      isSelected
    });
  }

  // Event category helpers
  const getCategoryStyles = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "work":
        return {
          icon: <Briefcase className="w-3.5 h-3.5 text-amber-600" />,
          dotColor: "bg-amber-400",
          bg: "bg-amber-50/50 hover:bg-amber-50 border-amber-150",
          badge: "bg-amber-100 text-amber-800 border-amber-200",
          label: "作業"
        };
      case "meeting":
        return {
          icon: <Video className="w-3.5 h-3.5 text-blue-600" />,
          dotColor: "bg-blue-400",
          bg: "bg-blue-50/50 hover:bg-blue-50 border-blue-150",
          badge: "bg-blue-100 text-blue-800 border-blue-200",
          label: "会議"
        };
      case "transit":
        return {
          icon: <MapPin className="w-3.5 h-3.5 text-rose-600" />,
          dotColor: "bg-rose-400",
          bg: "bg-rose-50/50 hover:bg-rose-50 border-rose-150",
          badge: "bg-rose-100 text-rose-800 border-rose-200",
          label: "移動"
        };
      case "break":
        return {
          icon: <Coffee className="w-3.5 h-3.5 text-emerald-600" />,
          dotColor: "bg-emerald-400",
          bg: "bg-emerald-50/50 hover:bg-emerald-50 border-emerald-150",
          badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
          label: "休憩"
        };
      case "lunch":
        return {
          icon: <Coffee className="w-3.5 h-3.5 text-indigo-600" />,
          dotColor: "bg-indigo-400",
          bg: "bg-indigo-50/50 hover:bg-indigo-50 border-indigo-150",
          badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
          label: "昼食"
        };
      case "review":
        return {
          icon: <BookOpen className="w-3.5 h-3.5 text-purple-600" />,
          dotColor: "bg-purple-400",
          bg: "bg-purple-50/50 hover:bg-purple-50 border-purple-150",
          badge: "bg-purple-100 text-purple-800 border-purple-200",
          label: "ふり返り"
        };
      case "personal":
        return {
          icon: <User className="w-3.5 h-3.5 text-teal-600" />,
          dotColor: "bg-teal-400",
          bg: "bg-teal-50/50 hover:bg-teal-50 border-teal-150",
          badge: "bg-teal-100 text-teal-800 border-teal-200",
          label: "個人用事"
        };
    }
  };

  // Get events for a specific date
  const getEventsForDate = (dateStr: string) => {
    return events.filter((e) => e.date === dateStr).sort((a, b) => {
      const timeA = a.time || "00:00";
      const timeB = b.time || "00:00";
      return timeA.localeCompare(timeB);
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!newTitle.trim()) {
      setFormError("予定のタイトルを入力してください。");
      return;
    }

    onAddEvent({
      title: newTitle.trim(),
      date: selectedDateStr,
      time: newTime || undefined,
      duration_minutes: newDuration ? parseInt(newDuration, 10) : undefined,
      type: newType,
      project_id: newProjectId || undefined,
      description: newDescription.trim() || undefined,
    });

    // Reset Form
    setNewTitle("");
    setNewTime("10:00");
    setNewDuration("30");
    setNewProjectId("");
    setNewDescription("");
    setShowAddForm(false);
  };

  const selectedDateEvents = getEventsForDate(selectedDateStr);
  const formattedSelectedDate = () => {
    try {
      const [y, m, d] = selectedDateStr.split("-").map(Number);
      const dObj = new Date(y, m - 1, d);
      const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
      return `${y}年${m}月${d}日 (${weekDays[dObj.getDay()]})`;
    } catch (e) {
      return selectedDateStr;
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs transition-all hover:shadow-sm duration-300 space-y-5">
      {/* Header section with icon and title */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-[#0071E3]" />
          <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] font-display">
            カレンダー & 予定表
          </h2>
        </div>
        
        {/* Month Switcher */}
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrevMonth}
            className="p-1 rounded-full border border-gray-150 hover:bg-gray-50 text-gray-500 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-semibold font-mono text-gray-700 min-w-[70px] text-center">
            {currentYear}年 {monthNames[currentMonth]}
          </span>
          <button 
            onClick={handleNextMonth}
            className="p-1 rounded-full border border-gray-150 hover:bg-gray-50 text-gray-500 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 tracking-wider">
          <span>日</span>
          <span>月</span>
          <span>火</span>
          <span>水</span>
          <span>木</span>
          <span>金</span>
          <span>土</span>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {gridCells.map((cell, idx) => {
            const hasDay = cell.dayNum !== null;
            const dayEvents = hasDay ? getEventsForDate(cell.dateStr) : [];
            const uniqueTypes = Array.from(new Set(dayEvents.map(e => e.type)));

            return (
              <div 
                key={idx}
                onClick={() => {
                  if (hasDay) {
                    onSelectDate(cell.dateStr);
                  }
                }}
                className={`relative aspect-square flex flex-col justify-between p-1 rounded-lg border text-xs transition-all ${
                  hasDay ? "cursor-pointer" : "border-transparent select-none pointer-events-none"
                } ${
                  cell.isSelected 
                    ? "bg-[#1D1D1F] border-[#1D1D1F] text-white" 
                    : cell.isToday 
                      ? "bg-blue-50/50 border-blue-200 text-blue-600 hover:bg-blue-50 font-semibold" 
                      : "bg-white border-gray-100 hover:bg-gray-50 text-gray-800"
                }`}
              >
                {hasDay ? (
                  <>
                    {/* Day Number */}
                    <span className="self-start text-[10px] font-mono leading-none">
                      {cell.dayNum}
                    </span>
                    
                    {/* Event indicators (micro dots) */}
                    {dayEvents.length > 0 && (
                      <div className="flex items-center justify-center gap-0.5 mt-auto flex-wrap max-h-[12px] overflow-hidden">
                        {uniqueTypes.slice(0, 4).map((type, dIdx) => {
                          const cat = getCategoryStyles(type as any);
                          return (
                            <span 
                              key={dIdx} 
                              className={`w-1 h-1 rounded-full ${cell.isSelected ? "bg-white" : cat.dotColor}`} 
                            />
                          );
                        })}
                        {uniqueTypes.length > 4 && (
                          <span className={`text-[6px] font-bold leading-none ${cell.isSelected ? "text-white" : "text-gray-400"}`}>+</span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Timeline & Planner */}
      <div className="border-t border-gray-50 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 flex items-center gap-3">
            <div>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Selected Date</span>
              <h3 className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-[#0071E3]" />
                {formattedSelectedDate()}
              </h3>
            </div>
            
            {/* Quick Today Snap button */}
            <button
              onClick={() => {
                const d = new Date();
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const todayStr = `${yyyy}-${mm}-${dd}`;
                onSelectDate(todayStr);
              }}
              className="px-2.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100/50 rounded-full text-[9px] font-bold transition-all cursor-pointer select-none"
              title="今日のシステム日付に移動"
            >
              今日
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-[#1D1D1F] border border-gray-200 rounded-full text-[10px] font-semibold transition-all cursor-pointer"
          >
            <Plus className={`w-3 h-3 transition-transform ${showAddForm ? "rotate-45 text-red-500" : ""}`} />
            <span>{showAddForm ? "閉じる" : "予定を入れる"}</span>
          </button>
        </div>

        {/* Collapsible Add Event Form */}
        {showAddForm && (
          <form onSubmit={handleFormSubmit} className="bg-gray-50/50 border border-gray-100 rounded-xl p-3.5 space-y-3 animate-fade-in text-xs">
            <h4 className="font-semibold text-gray-800 text-[11px] pb-1 border-b border-gray-100">新しい予定を登録</h4>
            
            {formError && (
              <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-2 flex items-start gap-1.5 text-[10px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <p>{formError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Title */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">予定タイトル *</label>
                <input
                  type="text"
                  placeholder="例: A社キックオフ、移動、午後休憩"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:border-gray-400 bg-white"
                />
              </div>

              {/* Time */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">開始時間</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:border-gray-400 bg-white font-mono"
                />
              </div>

              {/* Duration */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">所要時間 (分)</label>
                <input
                  type="number"
                  min="5"
                  max="480"
                  placeholder="30"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:border-gray-400 bg-white font-mono"
                />
              </div>

              {/* Category / Type */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">作業種別</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as CalendarEvent["type"])}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:border-gray-400 bg-white text-xs"
                >
                  <option value="work">作業 (Work)</option>
                  <option value="meeting">会議 (Meeting)</option>
                  <option value="transit">移動 (Transit)</option>
                  <option value="break">休憩 (Break)</option>
                  <option value="lunch">昼食 (Lunch)</option>
                  <option value="review">整理・ふり返り (Review)</option>
                  <option value="personal">個人用事 (Personal)</option>
                </select>
              </div>

              {/* Linked Project */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">関連プロジェクト</label>
                <select
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:border-gray-400 bg-white text-xs"
                >
                  <option value="">-- なし --</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>{proj.name}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">メモ (説明など)</label>
                <textarea
                  rows={2}
                  placeholder="追加の詳細情報や詳細など"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:border-gray-400 bg-white resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3.5 py-1.5 bg-white border border-gray-200 text-gray-500 rounded-full hover:bg-gray-50 hover:text-gray-700 font-semibold"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#1D1D1F] hover:bg-black text-white rounded-full font-semibold"
              >
                追加する
              </button>
            </div>
          </form>
        )}

        {/* Selected Day Events List */}
        <div className="space-y-2">
          {selectedDateEvents.length === 0 ? (
            <div className="text-center py-6 text-[10px] text-gray-400 font-light bg-gray-50/30 border border-dashed border-gray-150 rounded-xl">
              この日の予定は登録されていません。
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {selectedDateEvents.map((event) => {
                const styles = getCategoryStyles(event.type);
                const proj = event.project_id ? projects.find(p => p.id === event.project_id) : null;

                return (
                  <div 
                    key={event.id}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition-colors ${styles.bg}`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {event.time && (
                          <span className="font-mono font-bold text-gray-700 tracking-tight flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {event.time}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-bold border uppercase tracking-wider ${styles.badge}`}>
                          {styles.label} {event.duration_minutes ? `(${event.duration_minutes}分)` : ""}
                        </span>
                        {proj && (
                          <span className="px-2 py-0.5 rounded-full text-[8.5px] font-semibold border bg-white border-gray-150 text-gray-500 font-mono">
                            {proj.name}
                          </span>
                        )}
                      </div>

                      <h4 className="font-semibold text-gray-800 text-[11.5px] tracking-tight">
                        {event.title}
                      </h4>

                      {event.description && (
                        <p className="text-[10px] text-gray-400 font-light leading-relaxed pl-1.5 border-l border-gray-200">
                          {event.description}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => onDeleteEvent(event.id)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                      title="予定を削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

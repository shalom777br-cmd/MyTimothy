import React, { useState, useEffect } from "react";
import { Brain, Plus, Trash2, Sliders, CheckCircle, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Memory } from "../types";
import { initialMemories } from "../data/initialMemories";

interface MemoriesPanelProps {
  userEmail: string;
  isLoggedIn: boolean;
}

export const MemoriesPanel: React.FC<MemoriesPanelProps> = ({ userEmail, isLoggedIn }) => {
  const [memories, setMemories] = useState<Memory[]>(initialMemories);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "values" | "faith" | "ifs_parts" | "wishes">("all");
  
  // Add memory form state
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<"values" | "faith" | "ifs_parts" | "wishes">("values");
  const [newSource, setNewSource] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  // Fetch memories on mount and when user email changes
  useEffect(() => {
    fetchMemories();
  }, [userEmail, isLoggedIn]);

  const fetchMemories = async () => {
    setLoading(true);
    setError(null);
    try {
      const emailParam = isLoggedIn ? userEmail : "shalom777br@gmail.com";
      const response = await fetch(`/api/temote/memories?email=${encodeURIComponent(emailParam)}`);
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setMemories(result.data);
        }
      } else {
        throw new Error("HTTP connection failed");
      }
    } catch (err: any) {
      console.warn("Could not fetch memories from server. Falling back to local data.", err);
      // Fallback: load from local storage if available
      const cached = localStorage.getItem(`temote_user_${userEmail || "guest"}_memories`);
      if (cached) {
        try {
          setMemories(JSON.parse(cached));
        } catch (e) {
          setMemories(initialMemories);
        }
      } else {
        setMemories(initialMemories);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsAdding(true);
    setError(null);

    const newMemObj: Omit<Memory, "id"> = {
      category: newCategory,
      content: newContent.trim(),
      source: newSource.trim() || "Manual Entry",
      email: isLoggedIn ? userEmail : "shalom777br@gmail.com"
    };

    try {
      const response = await fetch("/api/temote/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMemObj)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const updated = [...memories, result.data];
          setMemories(updated);
          localStorage.setItem(`temote_user_${userEmail || "guest"}_memories`, JSON.stringify(updated));
        } else {
          // Fallback manually adding for guest / local mode
          const localNew: Memory = {
            id: `mem-${Date.now()}`,
            category: newCategory,
            content: newContent.trim(),
            source: newSource.trim() || "Manual Entry",
            created_at: new Date().toISOString()
          };
          const updated = [...memories, localNew];
          setMemories(updated);
          localStorage.setItem(`temote_user_${userEmail || "guest"}_memories`, JSON.stringify(updated));
        }
        
        // Reset form
        setNewContent("");
        setNewSource("");
        setAddSuccess(true);
        setTimeout(() => setAddSuccess(false), 2000);
      } else {
        throw new Error("POST request failed");
      }
    } catch (err) {
      // Local fallback mode
      const localNew: Memory = {
        id: `mem-${Date.now()}`,
        category: newCategory,
        content: newContent.trim(),
        source: newSource.trim() || "Manual Entry",
        created_at: new Date().toISOString()
      };
      const updated = [...memories, localNew];
      setMemories(updated);
      localStorage.setItem(`temote_user_${userEmail || "guest"}_memories`, JSON.stringify(updated));
      
      setNewContent("");
      setNewSource("");
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 2000);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!confirm("この記憶データを削除してもよろしいですか？")) return;

    try {
      const response = await fetch(`/api/temote/memories?id=${encodeURIComponent(id)}&email=${encodeURIComponent(userEmail || "shalom777br@gmail.com")}`, {
        method: "DELETE"
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const updated = memories.filter(m => m.id !== id);
          setMemories(updated);
          localStorage.setItem(`temote_user_${userEmail || "guest"}_memories`, JSON.stringify(updated));
        } else {
          // Fallback manual filter for local mode
          const updated = memories.filter(m => m.id !== id);
          setMemories(updated);
          localStorage.setItem(`temote_user_${userEmail || "guest"}_memories`, JSON.stringify(updated));
        }
      } else {
        throw new Error("DELETE request failed");
      }
    } catch (err) {
      // Local mode fallback
      const updated = memories.filter(m => m.id !== id);
      setMemories(updated);
      localStorage.setItem(`temote_user_${userEmail || "guest"}_memories`, JSON.stringify(updated));
    }
  };

  const filteredMemories = memories.filter(m => activeTab === "all" || m.category === activeTab);

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case "values":
        return {
          bg: "bg-teal-50",
          text: "text-teal-700",
          border: "border-teal-100",
          label: "🌿 価値観・生き方"
        };
      case "faith":
        return {
          bg: "bg-blue-50",
          text: "text-blue-700",
          border: "border-blue-100",
          label: "🕊️ 信仰・霊的歩み"
        };
      case "ifs_parts":
        return {
          bg: "bg-rose-50",
          text: "text-rose-700",
          border: "border-rose-100",
          label: "👤 内的パーツ (IFS)"
        };
      case "wishes":
        return {
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-100",
          label: "🌠 願い・ビジョン"
        };
      default:
        return {
          bg: "bg-gray-50",
          text: "text-gray-700",
          border: "border-gray-100",
          label: "その他"
        };
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs transition-all hover:shadow-sm duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-1.5 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Brain className="w-4 h-4" />
          </span>
          <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] font-display">
            共有記憶層 (Memory Core)
          </h2>
        </div>
        <span className="text-[10px] text-gray-400 font-mono">
          計 {memories.length} 件の記憶
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-3 mb-3 scrollbar-none border-b border-gray-50/50">
        {[
          { id: "all", label: "全て" },
          { id: "values", label: "🌿 価値観" },
          { id: "faith", label: "🕊️ 信仰" },
          { id: "ifs_parts", label: "👤 パーツ" },
          { id: "wishes", label: "🌠 願い" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1 text-[10px] font-semibold rounded-full shrink-0 transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-gray-900 text-white"
                : "bg-gray-50 hover:bg-gray-100 text-gray-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Add Memory Form */}
      <form onSubmit={handleAddMemory} className="bg-gray-50/50 border border-gray-150/40 rounded-xl p-3.5 mb-4 space-y-3">
        <div className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
          <Plus className="w-3 h-3" />
          <span>新しい記憶・気づきを追加</span>
        </div>

        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="ジョアンナの新しい価値観や信仰の歩み、気づいた内的パーツなどを記録します。会話時に自動参照されます。"
          className="w-full text-xs text-gray-800 bg-white border border-gray-150 focus:border-gray-900 rounded-xl px-3 py-2.5 min-h-[60px] max-h-[120px] transition-all outline-hidden font-light leading-relaxed resize-none"
          required
        />

        <div className="grid grid-cols-2 gap-2">
          {/* Category Selector */}
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as any)}
            className="text-[10px] text-gray-700 bg-white border border-gray-150 focus:border-gray-900 rounded-lg px-2 py-1.5 transition-all outline-hidden cursor-pointer font-semibold"
          >
            <option value="values">🌿 価値観・生き方</option>
            <option value="faith">🕊️ 信仰・霊的歩み</option>
            <option value="ifs_parts">👤 内的パーツ (IFS)</option>
            <option value="wishes">🌠 願い・ビジョン</option>
          </select>

          {/* Source Input */}
          <input
            type="text"
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            placeholder="出典 (例: デボーション日記)"
            className="text-[10px] text-gray-700 bg-white border border-gray-150 focus:border-gray-900 rounded-lg px-2 py-1.5 transition-all outline-hidden font-light"
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isAdding || !newContent.trim()}
            className={`px-4 py-1.5 rounded-full text-[10px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              addSuccess
                ? "bg-emerald-600 text-white"
                : "bg-gray-900 text-white hover:bg-black disabled:opacity-50"
            }`}
          >
            {isAdding ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>保存中...</span>
              </>
            ) : addSuccess ? (
              <>
                <CheckCircle className="w-3 h-3 animate-bounce" />
                <span>記録しました</span>
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" />
                <span>記憶に統合する</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Memory List */}
      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center py-8 text-gray-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            <span className="text-[10px]">記憶データを同期中...</span>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="text-center py-10 text-xs text-gray-400 italic font-light">
            登録された記憶はありません。
          </div>
        ) : (
          filteredMemories.map((mem) => {
            const styles = getCategoryStyles(mem.category);
            return (
              <div
                key={mem.id}
                className="group border border-gray-100 rounded-xl p-3 hover:border-gray-200 transition-all duration-200 flex items-start gap-2.5 bg-gray-50/20"
              >
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${styles.bg} ${styles.text} ${styles.border}`}>
                      {styles.label}
                    </span>
                    {mem.source && (
                      <span className="text-[8px] font-mono text-gray-400">
                        {mem.source}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 text-[11px] font-light leading-relaxed select-text">
                    {mem.content}
                  </p>
                </div>
                
                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleDeleteMemory(mem.id)}
                  className="p-1 hover:bg-rose-50 hover:text-rose-600 text-gray-300 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer shrink-0 mt-0.5"
                  title="記憶から削除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-1.5 text-[9px] text-gray-400">
        <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse shrink-0" />
        <span>報告の入力内容に応じて、関係するカテゴリーの記憶が自動的にテモテの推論プロンプトに注入されます。</span>
      </div>
    </div>
  );
};

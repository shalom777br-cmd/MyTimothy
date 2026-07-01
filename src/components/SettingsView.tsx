import React, { useState } from "react";
import { User, Bell, Cpu, Moon, Sun, Save, Check } from "lucide-react";
import { Settings } from "../types";

interface SettingsViewProps {
  settings: Settings;
  onUpdateSettings: (newSettings: Settings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings }) => {
  const [name, setName] = useState(settings.name);
  const [aiModel, setAiModel] = useState(settings.ai_model);
  const [notificationEnabled, setNotificationEnabled] = useState(settings.notification_enabled);
  const [darkMode, setDarkMode] = useState(settings.dark_mode);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      name,
      ai_model: aiModel,
      notification_enabled: notificationEnabled,
      dark_mode: darkMode,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const aiModelsList = [
    "Gemini 3.5 Flash",
    "Gemini 3.1 Pro (Paid)",
    "Claude 3.5 Sonnet",
    "GPT-4o"
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xs hover:shadow-sm transition-all duration-300">
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-50">
        <div className="flex items-center gap-1.5">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] font-display">Settings</h4>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* User Name input */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-display flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <span>表示名（テモテの呼称）</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-xs text-gray-800 bg-gray-50/50 hover:bg-white border border-gray-150 focus:border-gray-900 rounded-xl px-4 py-3 transition-all outline-hidden"
            placeholder="例: ジョアンナ"
          />
        </div>

        {/* AI Model dropdown */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-display flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-gray-400" />
            <span>今日の提案ロジックAIモデル</span>
          </label>
          <select
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            className="w-full text-xs text-gray-800 bg-gray-50/50 hover:bg-white border border-gray-150 focus:border-gray-900 rounded-xl px-4 py-3 transition-all outline-hidden cursor-pointer"
          >
            {aiModelsList.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Notifications Checkbox */}
        <div className="flex items-center justify-between py-2 border-t border-gray-50">
          <div className="flex items-start gap-3">
            <Bell className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-gray-700 block">朝のプッシュ通知</span>
              <span className="text-[10px] text-gray-400 block font-light leading-relaxed">1日1回、朝に今日最も価値のある一歩を通知します。</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotificationEnabled(!notificationEnabled)}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-hidden cursor-pointer ${
              notificationEnabled ? "bg-[#1D1D1F]" : "bg-gray-250"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                notificationEnabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between py-2 border-t border-b border-gray-50">
          <div className="flex items-start gap-3">
            {darkMode ? (
              <Moon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            ) : (
              <Sun className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-gray-700 block">ダークモード</span>
              <span className="text-[10px] text-gray-400 block font-light leading-relaxed">白基調のApple風デザインをダークトーンに変更します。</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-hidden cursor-pointer ${
              darkMode ? "bg-[#1D1D1F]" : "bg-gray-250"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                darkMode ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold transition-transform duration-250 hover:scale-[1.02] cursor-pointer ${
              saved
                ? "bg-emerald-600 text-white"
                : "bg-[#1D1D1F] hover:bg-black text-white shadow-xs"
            }`}
          >
            {saved ? (
              <>
                <Check className="w-3.5 h-3.5 animate-bounce" />
                <span>保存しました</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>設定を保存する</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};


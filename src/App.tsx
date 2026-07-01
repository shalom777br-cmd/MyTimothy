import { useState, useEffect } from "react";
import { Sparkles, Bell, LayoutDashboard, History, Settings as SettingsIcon, LogIn, LogOut, Loader2, Info } from "lucide-react";
import { Project, Task, HistoryItem, Settings } from "./types";
import { initialProjects, initialTasks, initialHistory, initialSettings } from "./data/initialData";
import { StatusInput } from "./components/StatusInput";
import { HomeView } from "./components/HomeView";
import { ProjectsPanel } from "./components/ProjectsPanel";
import { SettingsView } from "./components/SettingsView";
import { AuthModal } from "./components/AuthModal";

export default function App() {
  // Session Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Core Databases (State)
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
  const [settings, setSettings] = useState<Settings>(initialSettings);

  // Temote Greetings & Suggestions
  const [temoteGreeting, setTemoteGreeting] = useState<string>(
    "おはようございます。昨日は050callのプロバイダー切り替え処理を確認しました。本日も一歩ずつ進めましょう。"
  );
  const [morningNotification, setMorningNotification] = useState<string>("");
  const [showNotificationBanner, setShowNotificationBanner] = useState(true);

  const [recommendedTask, setRecommendedTask] = useState<Task | null>(null);
  const [recommendationReason, setRecommendationReason] = useState<string>("");
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // Active view tab (for compact layout / mobile responsiveness)
  const [activeTab, setActiveTab] = useState<"dashboard" | "history" | "settings">("dashboard");

  // Load and Save Session from localStorage based on user
  useEffect(() => {
    const session = localStorage.getItem("temote_session");
    if (session) {
      const parsed = JSON.parse(session);
      setIsLoggedIn(true);
      setUserEmail(parsed.email);
      loadUserData(parsed.email);
    } else {
      // Load Guest Sandbox state
      const sandboxProj = localStorage.getItem("temote_sandbox_projects");
      const sandboxTasks = localStorage.getItem("temote_sandbox_tasks");
      const sandboxHist = localStorage.getItem("temote_sandbox_history");
      const sandboxSett = localStorage.getItem("temote_sandbox_settings");

      if (sandboxProj && sandboxTasks && sandboxHist && sandboxSett) {
        setProjects(JSON.parse(sandboxProj));
        setTasks(JSON.parse(sandboxTasks));
        setHistory(JSON.parse(sandboxHist));
        setSettings(JSON.parse(sandboxSett));
      }
    }
  }, []);

  // Save guest sandbox states to keep session alive during sandbox play
  useEffect(() => {
    if (!isLoggedIn) {
      localStorage.setItem("temote_sandbox_projects", JSON.stringify(projects));
      localStorage.setItem("temote_sandbox_tasks", JSON.stringify(tasks));
      localStorage.setItem("temote_sandbox_history", JSON.stringify(history));
      localStorage.setItem("temote_sandbox_settings", JSON.stringify(settings));
    }
  }, [projects, tasks, history, settings, isLoggedIn]);

  // Fetch initial AI recommendation & morning notification on mount/session changes
  useEffect(() => {
    fetchAINotification();
    fetchAISuggestion(projects, tasks);
  }, [isLoggedIn, userEmail]);

  // Handle load from specific user email
  const loadUserData = (email: string) => {
    const keyPrefix = `temote_user_${email}`;
    const userProj = localStorage.getItem(`${keyPrefix}_projects`);
    const userTasks = localStorage.getItem(`${keyPrefix}_tasks`);
    const userHist = localStorage.getItem(`${keyPrefix}_history`);
    const userSett = localStorage.getItem(`${keyPrefix}_settings`);

    if (userProj && userTasks && userHist && userSett) {
      setProjects(JSON.parse(userProj));
      setTasks(JSON.parse(userTasks));
      setHistory(JSON.parse(userHist));
      setSettings(JSON.parse(userSett));
    } else {
      // Setup initial dummy database for new registered users
      setProjects(initialProjects);
      setTasks(initialTasks);
      setHistory(initialHistory);
      setSettings(initialSettings);
      saveUserData(email, initialProjects, initialTasks, initialHistory, initialSettings);
    }
  };

  // Save specific user data to simulate RLS
  const saveUserData = (
    email: string,
    p: Project[],
    t: Task[],
    h: HistoryItem[],
    s: Settings
  ) => {
    const keyPrefix = `temote_user_${email}`;
    localStorage.setItem(`${keyPrefix}_projects`, JSON.stringify(p));
    localStorage.setItem(`${keyPrefix}_tasks`, JSON.stringify(t));
    localStorage.setItem(`${keyPrefix}_history`, JSON.stringify(h));
    localStorage.setItem(`${keyPrefix}_settings`, JSON.stringify(s));
  };

  // Auto-save when logged-in data changes
  const updateProjectsAndSave = (updatedProjList: Project[]) => {
    setProjects(updatedProjList);
    if (isLoggedIn) {
      saveUserData(userEmail, updatedProjList, tasks, history, settings);
    }
    // Update suggestion immediately
    fetchAISuggestion(updatedProjList, tasks);
  };

  const updateTasksAndSave = (updatedTaskList: Task[]) => {
    setTasks(updatedTaskList);
    if (isLoggedIn) {
      saveUserData(userEmail, projects, updatedTaskList, history, settings);
    }
    // Update suggestion immediately
    fetchAISuggestion(projects, updatedTaskList);
  };

  const updateHistoryAndSave = (updatedHistoryList: HistoryItem[]) => {
    setHistory(updatedHistoryList);
    if (isLoggedIn) {
      saveUserData(userEmail, projects, tasks, updatedHistoryList, settings);
    }
  };

  const updateSettingsAndSave = (updatedSettings: Settings) => {
    setSettings(updatedSettings);
    if (isLoggedIn) {
      saveUserData(userEmail, projects, tasks, history, updatedSettings);
    }
  };

  // Fetch morning notification (one task to focus)
  const fetchAINotification = async () => {
    try {
      const response = await fetch("/api/temote/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projects,
          tasks,
          settings,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setMorningNotification(data.message);
        setShowNotificationBanner(true);
      }
    } catch (e) {
      console.warn("Could not fetch morning notification.", e);
    }
  };

  // Fetch AI recommended task
  const fetchAISuggestion = async (currentProj: Project[], currentTasks: Task[], lastDoneTask: any = null) => {
    setLoadingSuggestion(true);
    try {
      const response = await fetch("/api/temote/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projects: currentProj,
          tasks: currentTasks,
          settings,
          lastCompletedTask: lastDoneTask,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.task) {
          // If suggestion returned a brand new suggested task, merge it or use it as is
          setRecommendedTask(data.task);
          setRecommendationReason(data.reason);
        } else {
          setRecommendedTask(null);
          setRecommendationReason("");
        }
      }
    } catch (e) {
      console.warn("Could not fetch suggestion.", e);
    } finally {
      setLoadingSuggestion(false);
    }
  };

  // Auth Operations
  const handleLogin = (email: string) => {
    setIsLoggedIn(true);
    setUserEmail(email);
    localStorage.setItem("temote_session", JSON.stringify({ email }));
    loadUserData(email);
    setTemoteGreeting(`ようこそ、${email.split("@")[0]}さん。テモテがお手伝いします。`);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail("");
    localStorage.removeItem("temote_session");
    // Reset to defaults or sandbox
    setProjects(initialProjects);
    setTasks(initialTasks);
    setHistory(initialHistory);
    setSettings(initialSettings);
    setTemoteGreeting("ゲストモードに切り替わりました。サンドボックスデータはブラウザに一時保存されます。");
  };

  // Handle AI analysis parsed result
  const handleAnalysisSuccess = (result: {
    responseText: string;
    newProject: Project | null;
    updatedProjects: { id: string; progress_percent: number; last_worked_at: string }[];
    createdTasks: any[];
    completedTaskIds: string[];
  }) => {
    // 1. Update text
    setTemoteGreeting(result.responseText);

    // Create copies
    let nextProjects = [...projects];
    let nextTasks = [...tasks];
    let nextHistory = [...history];

    // 2. Insert new project if present
    if (result.newProject) {
      nextProjects.push(result.newProject);
    }

    // 3. Update existing projects progress
    result.updatedProjects.forEach((up) => {
      nextProjects = nextProjects.map((p) => {
        if (p.id === up.id) {
          return {
            ...p,
            progress_percent: up.progress_percent,
            last_worked_at: up.last_worked_at,
          };
        }
        return p;
      });
    });

    // 4. Mark tasks completed
    result.completedTaskIds.forEach((id) => {
      nextTasks = nextTasks.map((t) => {
        if (t.id === id) {
          return { ...t, done: true };
        }
        return t;
      });

      // Add to completed history logs
      const compTask = tasks.find((t) => t.id === id);
      if (compTask) {
        const proj = projects.find((p) => p.id === compTask.project_id);
        nextHistory.unshift({
          id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          task_id: compTask.id,
          project_name: proj?.name || "その他",
          task_title: compTask.title,
          completed_at: new Date().toISOString(),
          note: "現状入力欄からのAI自動完了処理",
        });
      }
    });

    // 5. Create new tasks
    result.createdTasks.forEach((ct) => {
      nextTasks.push({
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        project_id: ct.project_id || (result.newProject ? result.newProject.id : ""),
        title: ct.title,
        estimated_minutes: ct.estimated_minutes,
        priority: ct.priority || "medium",
        ai_assignee: ct.ai_assignee || "claude",
        done: false,
      });
    });

    // 6. Recalculate progress for projects that had completed tasks
    const impactedProjectIds = new Set<string>();
    result.completedTaskIds.forEach((id) => {
      const t = tasks.find((tk) => tk.id === id);
      if (t) impactedProjectIds.add(t.project_id);
    });

    impactedProjectIds.forEach((pId) => {
      const projTasks = nextTasks.filter((t) => t.project_id === pId);
      const doneProjTasks = projTasks.filter((t) => t.done);
      if (projTasks.length > 0) {
        const nextPercent = Math.round((doneProjTasks.length / projTasks.length) * 100);
        nextProjects = nextProjects.map((p) => {
          if (p.id === pId) {
            return { ...p, progress_percent: nextPercent };
          }
          return p;
        });
      }
    });

    // Save state
    setProjects(nextProjects);
    setTasks(nextTasks);
    setHistory(nextHistory);

    if (isLoggedIn) {
      saveUserData(userEmail, nextProjects, nextTasks, nextHistory, settings);
    }

    // Refresh suggestion
    fetchAISuggestion(nextProjects, nextTasks);
  };

  // Handle task manual toggling or complete from Active timer
  const handleToggleTask = (taskId: string) => {
    let nextTasks = tasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, done: !t.done };
      }
      return t;
    });

    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    let nextHistory = [...history];
    if (!targetTask.done) {
      // Completed, add to history
      const proj = projects.find((p) => p.id === targetTask.project_id);
      nextHistory.unshift({
        id: `hist-${Date.now()}`,
        task_id: targetTask.id,
        project_name: proj?.name || "その他",
        task_title: targetTask.title,
        completed_at: new Date().toISOString(),
        note: "手動完了処理",
      });
    } else {
      // Un-completed, remove from history
      nextHistory = nextHistory.filter((h) => h.task_id !== taskId);
    }

    // Recalculate project progress
    let nextProjects = [...projects];
    const projTasks = nextTasks.filter((t) => t.project_id === targetTask.project_id);
    const doneTasks = projTasks.filter((t) => t.done);
    if (projTasks.length > 0) {
      const nextPercent = Math.round((doneTasks.length / projTasks.length) * 100);
      nextProjects = nextProjects.map((p) => {
        if (p.id === targetTask.project_id) {
          return {
            ...p,
            progress_percent: nextPercent,
            last_worked_at: new Date().toISOString(),
          };
        }
        return p;
      });
    }

    setProjects(nextProjects);
    setTasks(nextTasks);
    setHistory(nextHistory);

    if (isLoggedIn) {
      saveUserData(userEmail, nextProjects, nextTasks, nextHistory, settings);
    }

    // Refresh suggestion
    fetchAISuggestion(nextProjects, nextTasks);
  };

  // Complete task from the Deep Focus stopwatch timer
  const handleCompleteTaskFromTimer = (taskId: string, timeSpentMinutes: number) => {
    // Check if suggested task is completely new or existing
    const isExisting = tasks.some((t) => t.id === taskId);

    let nextTasks = [...tasks];
    let nextProjects = [...projects];

    let targetTask: Task;

    if (isExisting) {
      nextTasks = nextTasks.map((t) => {
        if (t.id === taskId) {
          return { ...t, done: true };
        }
        return t;
      });
      targetTask = tasks.find((t) => t.id === taskId)!;
    } else if (recommendedTask) {
      // It's a newly suggested task, add it directly to database as completed!
      targetTask = {
        ...recommendedTask,
        done: true,
      };
      nextTasks.push(targetTask);
    } else {
      return;
    }

    // Recalculate project progress
    const projTasks = nextTasks.filter((t) => t.project_id === targetTask.project_id);
    const doneTasks = projTasks.filter((t) => t.done);
    if (projTasks.length > 0) {
      const nextPercent = Math.round((doneTasks.length / projTasks.length) * 100);
      nextProjects = nextProjects.map((p) => {
        if (p.id === targetTask.project_id) {
          return {
            ...p,
            progress_percent: nextPercent,
            last_worked_at: new Date().toISOString(),
          };
        }
        return p;
      });
    }

    // Add to completed history logs
    const proj = projects.find((p) => p.id === targetTask.project_id);
    const nextHistory = [
      {
        id: `hist-${Date.now()}`,
        task_id: targetTask.id,
        project_name: proj?.name || "その他",
        task_title: targetTask.title,
        completed_at: new Date().toISOString(),
        note: `テモテの提案から完了（所要時間: ${timeSpentMinutes}分）`,
      },
      ...history,
    ];

    // Set praise greeting
    const compliments = [
      "お疲れ様でした。素晴らしい集中力です。次はこちらがおすすめです。",
      "完成に向けて着実な前進ですね。お見事です。次はこちらをどうぞ。",
      "素晴らしい作業効率です。ジョアンナさん、次はこの一歩がおすすめです。",
    ];
    setTemoteGreeting(compliments[Math.floor(Math.random() * compliments.length)]);

    setProjects(nextProjects);
    setTasks(nextTasks);
    setHistory(nextHistory);

    if (isLoggedIn) {
      saveUserData(userEmail, nextProjects, nextTasks, nextHistory, settings);
    }

    // Refresh suggestion with info about completed task to avoid immediate re-suggest
    fetchAISuggestion(nextProjects, nextTasks, targetTask);
  };

  // Get other alternative recommendation
  const handleGetAlternativeSuggestion = () => {
    fetchAISuggestion(projects, tasks);
  };

  // Manual Project Add
  const handleAddProject = (newProj: Omit<Project, "id">) => {
    const nextProjects = [
      ...projects,
      {
        ...newProj,
        id: `proj-${Date.now()}`,
        progress_percent: 0,
      },
    ];
    updateProjectsAndSave(nextProjects);
  };

  // Manual Task Add
  const handleAddTask = (newTask: Omit<Task, "id" | "done">) => {
    const nextTasks = [
      ...tasks,
      {
        ...newTask,
        id: `task-${Date.now()}`,
        done: false,
      },
    ];
    updateTasksAndSave(nextTasks);
  };

  // Delete Project
  const handleDeleteProject = (projectId: string) => {
    const nextProjects = projects.filter((p) => p.id !== projectId);
    const nextTasks = tasks.filter((t) => t.project_id !== projectId);
    setProjects(nextProjects);
    setTasks(nextTasks);
    if (isLoggedIn) {
      saveUserData(userEmail, nextProjects, nextTasks, history, settings);
    }
    fetchAISuggestion(nextProjects, nextTasks);
  };

  // Delete Task
  const handleDeleteTask = (taskId: string) => {
    const nextTasks = tasks.filter((t) => t.id !== taskId);
    updateTasksAndSave(nextTasks);
  };

  // Dark Mode styling classes helper
  const wrapperClass = settings.dark_mode ? "dark bg-[#0d0e11] text-gray-100" : "bg-[#fdfdfd] text-[#1D1D1F]";

  return (
    <div className={`min-h-screen transition-colors duration-300 ${wrapperClass} font-sans antialiased`}>
      
      {/* Top Header Bar */}
      <header className="border-b border-gray-100 bg-white/85 backdrop-blur-md sticky top-0 z-40 transition-all">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-[#1D1D1F] text-white flex items-center justify-center font-display font-semibold text-xs shadow-xs">テ</span>
            <h1 className="font-display font-bold text-sm tracking-tight text-[#1D1D1F]">AI秘書 テモテ</h1>
          </div>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-[10px] font-mono tracking-wider text-gray-400">
                  {userEmail}
                </span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest font-mono">
                  CONNECTED
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-3 py-1 text-gray-400 hover:text-red-500 text-[11px] font-semibold hover:bg-red-50 rounded-full transition-all cursor-pointer"
                  title="ログアウト"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ログアウト</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="bg-gray-100 text-gray-500 border border-gray-150 text-[8px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest font-mono">
                  GUEST MODE
                </span>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-1 px-4 py-1.5 bg-[#1D1D1F] hover:bg-black text-white hover:scale-[1.02] text-[11px] font-semibold rounded-full transition-transform shadow-xs cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>ログイン</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        
        {/* Navigation Tabs (Mobile Compact Helper) */}
        <div className="flex gap-1 bg-gray-100/80 p-1 rounded-full mb-6 sm:hidden">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-full transition-all ${
              activeTab === "dashboard" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500"
            }`}
          >
            ホーム・提案
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-full transition-all ${
              activeTab === "history" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500"
            }`}
          >
            プロジェクト
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-full transition-all ${
              activeTab === "settings" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500"
            }`}
          >
            設定
          </button>
        </div>

        {/* Dashboard Grid (Bento Layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          
          {/* Main Workspace (Left Area on desktop) */}
          <div className={`sm:col-span-2 space-y-6 ${activeTab !== "dashboard" ? "hidden sm:block" : ""}`}>
            
            {/* Unstructured Status Input */}
            <StatusInput
              projects={projects}
              tasks={tasks}
              settings={settings}
              onAnalysisSuccess={handleAnalysisSuccess}
              isGuest={!isLoggedIn}
            />

            {/* AI Greeting, suggestion, timer */}
            <HomeView
              greeting={temoteGreeting}
              recommendedTask={recommendedTask}
              recommendationReason={recommendationReason}
              onCompleteTask={handleCompleteTaskFromTimer}
              onGetAlternativeSuggestion={handleGetAlternativeSuggestion}
              loadingSuggestion={loadingSuggestion}
              projects={projects}
            />
          </div>

          {/* Side Panels (Right Area on desktop) */}
          <div className={`space-y-6 ${activeTab === "dashboard" ? "hidden sm:block" : activeTab === "history" ? "block" : "hidden sm:block"}`}>
            
            {/* Project List & Task Manager */}
            <ProjectsPanel
              projects={projects}
              tasks={tasks}
              onAddProject={handleAddProject}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onDeleteProject={handleDeleteProject}
              onDeleteTask={handleDeleteTask}
            />

            {/* History Logs */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs transition-all hover:shadow-sm duration-300">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
                <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] font-display">History</h2>
              </div>
              <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <div className="text-center py-6 text-[10px] text-gray-400 font-light">
                    完了履歴がありません。
                  </div>
                ) : (
                  history.slice(0, 5).map((hist) => (
                    <div key={hist.id} className="text-xs space-y-1 border-b border-gray-50 pb-2.5 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#1D1D1F]">{hist.project_name}</span>
                        <span className="text-[9px] font-mono text-gray-400">
                          {new Date(hist.completed_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-gray-500 text-[11px] font-light truncate">{hist.task_title}</p>
                      {hist.note && (
                        <p className="text-[9px] text-gray-400 italic font-mono leading-tight">{hist.note}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Settings panel tab screen */}
          <div className={`${activeTab === "settings" ? "block" : "hidden sm:block"}`}>
            <SettingsView
              settings={settings}
              onUpdateSettings={updateSettingsAndSave}
            />
          </div>

        </div>
      </main>

      {/* Auth Simulation Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLogin}
      />
      
    </div>
  );
}

import { useState, useEffect } from "react";
import { Sparkles, Bell, LayoutDashboard, History, Settings as SettingsIcon, LogIn, LogOut, Loader2, Info, AlertTriangle } from "lucide-react";
import { Project, Task, HistoryItem, Settings, CalendarEvent } from "./types";
import { initialProjects, initialTasks, initialHistory, initialSettings } from "./data/initialData";
import { StatusInput } from "./components/StatusInput";
import { HomeView } from "./components/HomeView";
import { SettingsView } from "./components/SettingsView";
import { AuthModal } from "./components/AuthModal";
import { CuteTemoteLogo } from "./components/CuteTemoteLogo";
import { DailySchedulePanel } from "./components/DailySchedulePanel";
import { CalendarPanel } from "./components/CalendarPanel";
import { HeldJobsList } from "./components/HeldJobsList";
import { GithubSettings } from "./components/GithubSettings";

export default function App() {
  // Session Authentication State (Synchronous initialization to prevent race conditions on reload)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const session = localStorage.getItem("temote_session");
    return !!session;
  });
  
  const [userEmail, setUserEmail] = useState<string>(() => {
    const session = localStorage.getItem("temote_session");
    if (session) {
      try {
        const parsed = JSON.parse(session);
        return parsed.email || "";
      } catch (e) {
        return "";
      }
    }
    return "";
  });

  const [showAuthModal, setShowAuthModal] = useState(false);

  // Core Databases (State) initialized synchronously from active session / sandbox
  const [projects, setProjects] = useState<Project[]>(() => {
    const session = localStorage.getItem("temote_session");
    if (session) {
      try {
        const parsed = JSON.parse(session);
        const userProj = localStorage.getItem(`temote_user_${parsed.email}_projects`);
        if (userProj) return JSON.parse(userProj);
      } catch (e) {}
    } else {
      const sandboxProj = localStorage.getItem("temote_sandbox_projects");
      if (sandboxProj) return JSON.parse(sandboxProj);
    }
    return initialProjects;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const session = localStorage.getItem("temote_session");
    if (session) {
      try {
        const parsed = JSON.parse(session);
        const userTasks = localStorage.getItem(`temote_user_${parsed.email}_tasks`);
        if (userTasks) return JSON.parse(userTasks);
      } catch (e) {}
    } else {
      const sandboxTasks = localStorage.getItem("temote_sandbox_tasks");
      if (sandboxTasks) return JSON.parse(sandboxTasks);
    }
    return initialTasks;
  });

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const session = localStorage.getItem("temote_session");
    if (session) {
      try {
        const parsed = JSON.parse(session);
        const userHist = localStorage.getItem(`temote_user_${parsed.email}_history`);
        if (userHist) return JSON.parse(userHist);
      } catch (e) {}
    } else {
      const sandboxHist = localStorage.getItem("temote_sandbox_history");
      if (sandboxHist) return JSON.parse(sandboxHist);
    }
    return initialHistory;
  });

  const [settings, setSettings] = useState<Settings>(() => {
    const session = localStorage.getItem("temote_session");
    if (session) {
      try {
        const parsed = JSON.parse(session);
        const userSett = localStorage.getItem(`temote_user_${parsed.email}_settings`);
        if (userSett) return JSON.parse(userSett);
      } catch (e) {}
    } else {
      const sandboxSett = localStorage.getItem("temote_sandbox_settings");
      if (sandboxSett) return JSON.parse(sandboxSett);
    }
    return initialSettings;
  });

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const session = localStorage.getItem("temote_session");
    if (session) {
      try {
        const parsed = JSON.parse(session);
        const userEvents = localStorage.getItem(`temote_user_${parsed.email}_events`);
        if (userEvents) return JSON.parse(userEvents);
      } catch (e) {}
    } else {
      const sandboxEvents = localStorage.getItem("temote_sandbox_events");
      if (sandboxEvents) return JSON.parse(sandboxEvents);
    }
    // Return sample calendar events
    return [
      {
        id: "evt-initial-1",
        title: "A社キックオフ・要件定義ミーティング",
        date: "2026-07-01",
        time: "10:00",
        duration_minutes: 60,
        project_id: "proj-050call",
        type: "meeting",
        description: "新規コールシステムの要件についての初顔合わせMTG"
      },
      {
        id: "evt-initial-2",
        title: "渋谷オフィス訪問 & 打合せ",
        date: "2026-07-01",
        time: "14:00",
        duration_minutes: 90,
        project_id: "proj-concertante",
        type: "transit",
        description: "渋谷オフィスにて実装方針の擦り合わせ。移動時間を伴います。"
      },
      {
        id: "evt-initial-3",
        title: "ブラジル日記 第3章 執筆完了目標",
        date: "2026-07-05",
        time: "15:00",
        duration_minutes: 60,
        project_id: "proj-brazil-diary",
        type: "work",
        description: "静的サイト化の移行にむけた、第3章の編集作業。"
      }
    ];
  });

  // Temote Greetings & Suggestions
  const [temoteGreeting, setTemoteGreeting] = useState<string>(
    "おはようございます。昨日は050callのプロバイダー切り替え処理を確認しました。本日も一歩ずつ進めましょう。"
  );
  const [morningNotification, setMorningNotification] = useState<string>("");
  const [showNotificationBanner, setShowNotificationBanner] = useState(true);

  const [recommendedTask, setRecommendedTask] = useState<Task | null>(null);
  const [recommendationReason, setRecommendationReason] = useState<string>(
    ""
  );
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [geminiFallbackActive, setGeminiFallbackActive] = useState<boolean>(false);
  const [geminiErrorMsg, setGeminiErrorMsg] = useState<string>("");

  // Save guest sandbox states to keep session alive during sandbox play
  useEffect(() => {
    if (!isLoggedIn) {
      localStorage.setItem("temote_sandbox_projects", JSON.stringify(projects));
      localStorage.setItem("temote_sandbox_tasks", JSON.stringify(tasks));
      localStorage.setItem("temote_sandbox_history", JSON.stringify(history));
      localStorage.setItem("temote_sandbox_settings", JSON.stringify(settings));
      localStorage.setItem("temote_sandbox_events", JSON.stringify(events));
    }
  }, [projects, tasks, history, settings, events, isLoggedIn]);

  // Fetch initial AI recommendation & morning notification on mount/session changes
  useEffect(() => {
    const init = async () => {
      if (isLoggedIn && userEmail) {
        await loadUserData(userEmail);
      }
      fetchAINotification();
      fetchAISuggestion(projects, tasks);
    };
    init();
  }, [isLoggedIn, userEmail]);

  // Handle load from specific user email
  const loadUserData = async (email: string) => {
    const keyPrefix = `temote_user_${email}`;
    const userProj = localStorage.getItem(`${keyPrefix}_projects`);
    const userTasks = localStorage.getItem(`${keyPrefix}_tasks`);
    const userHist = localStorage.getItem(`${keyPrefix}_history`);
    const userSett = localStorage.getItem(`${keyPrefix}_settings`);
    const userEvents = localStorage.getItem(`${keyPrefix}_events`);

    let activeProj = initialProjects;
    let activeTasks = initialTasks;
    let activeHist = initialHistory;
    let activeSett = initialSettings;
    let activeEvents: CalendarEvent[] = [
      {
        id: "evt-initial-1",
        title: "A社キックオフ・要件定義ミーティング",
        date: "2026-07-01",
        time: "10:00",
        duration_minutes: 60,
        project_id: "proj-050call",
        type: "meeting",
        description: "新規コールシステムの要件についての初顔合わせMTG"
      },
      {
        id: "evt-initial-2",
        title: "渋谷オフィス訪問 & 打合せ",
        date: "2026-07-01",
        time: "14:00",
        duration_minutes: 90,
        project_id: "proj-concertante",
        type: "transit",
        description: "渋谷オフィスにて実装方針の擦り合わせ。移動時間を伴います。"
      },
      {
        id: "evt-initial-3",
        title: "ブラジル日記 第3章 執筆完了目標",
        date: "2026-07-05",
        time: "15:00",
        duration_minutes: 60,
        project_id: "proj-brazil-diary",
        type: "work",
        description: "静的サイト化の移行にむけた、第3章の編集作業。"
      }
    ];

    if (userProj && userTasks && userHist && userSett) {
      activeProj = JSON.parse(userProj);
      activeTasks = JSON.parse(userTasks);
      activeHist = JSON.parse(userHist);
      activeSett = JSON.parse(userSett);
      if (userEvents) {
        activeEvents = JSON.parse(userEvents);
      }
    }

    setProjects(activeProj);
    setTasks(activeTasks);
    setHistory(activeHist);
    setSettings(activeSett);
    setEvents(activeEvents);

    // Sync with Supabase asynchronously
    try {
      const response = await fetch(`/api/temote/data?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const result = await response.json();
        if (result.error) {
          setSupabaseError(result.error);
        } else {
          setSupabaseError(null);
        }
        if (result.source === "supabase" && result.data) {
          const sData = result.data;
          const parsedProj = sData.projects || activeProj;
          const parsedTasks = sData.tasks || activeTasks;
          const parsedHist = sData.history || activeHist;
          const parsedSett = sData.settings || activeSett;
          const parsedEvents = sData.events || activeEvents;

          setProjects(parsedProj);
          setTasks(parsedTasks);
          setHistory(parsedHist);
          setSettings(parsedSett);
          setEvents(parsedEvents);

          localStorage.setItem(`${keyPrefix}_projects`, JSON.stringify(parsedProj));
          localStorage.setItem(`${keyPrefix}_tasks`, JSON.stringify(parsedTasks));
          localStorage.setItem(`${keyPrefix}_history`, JSON.stringify(parsedHist));
          localStorage.setItem(`${keyPrefix}_settings`, JSON.stringify(parsedSett));
          localStorage.setItem(`${keyPrefix}_events`, JSON.stringify(parsedEvents));
        } else if (result.source === "supabase" && !result.data) {
          // No record on Supabase yet, populate it with current active data
          await saveUserData(email, activeProj, activeTasks, activeHist, activeSett, activeEvents);
        }
      }
    } catch (e) {
      console.warn("Could not sync with Supabase.", e);
    }
  };

  // Save specific user data to simulate RLS
  const saveUserData = async (
    email: string,
    p: Project[],
    t: Task[],
    h: HistoryItem[],
    s: Settings,
    evts: CalendarEvent[] = events
  ) => {
    const keyPrefix = `temote_user_${email}`;
    localStorage.setItem(`${keyPrefix}_projects`, JSON.stringify(p));
    localStorage.setItem(`${keyPrefix}_tasks`, JSON.stringify(t));
    localStorage.setItem(`${keyPrefix}_history`, JSON.stringify(h));
    localStorage.setItem(`${keyPrefix}_settings`, JSON.stringify(s));
    localStorage.setItem(`${keyPrefix}_events`, JSON.stringify(evts));

    try {
      const response = await fetch("/api/temote/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          projects: p,
          tasks: t,
          history: h,
          settings: s,
          events: evts,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.error) {
          setSupabaseError(result.error);
        } else {
          setSupabaseError(null);
        }
      }
    } catch (e) {
      console.warn("Could not save to Supabase.", e);
    }
  };

  // Auto-save when logged-in data changes
  const updateProjectsAndSave = (updatedProjList: Project[]) => {
    setProjects(updatedProjList);
    if (isLoggedIn) {
      saveUserData(userEmail, updatedProjList, tasks, history, settings, events);
    }
    // Update suggestion immediately
    fetchAISuggestion(updatedProjList, tasks);
  };

  const updateTasksAndSave = (updatedTaskList: Task[]) => {
    setTasks(updatedTaskList);
    if (isLoggedIn) {
      saveUserData(userEmail, projects, updatedTaskList, history, settings, events);
    }
    // Update suggestion immediately
    fetchAISuggestion(projects, updatedTaskList);
  };

  const updateHistoryAndSave = (updatedHistoryList: HistoryItem[]) => {
    setHistory(updatedHistoryList);
    if (isLoggedIn) {
      saveUserData(userEmail, projects, tasks, updatedHistoryList, settings, events);
    }
  };

  const updateSettingsAndSave = (updatedSettings: Settings) => {
    setSettings(updatedSettings);
    if (isLoggedIn) {
      saveUserData(userEmail, projects, tasks, history, updatedSettings, events);
    }
  };

  const updateEventsAndSave = (updatedEventsList: CalendarEvent[]) => {
    setEvents(updatedEventsList);
    if (isLoggedIn) {
      saveUserData(userEmail, projects, tasks, history, settings, updatedEventsList);
    }
  };

  // Fetch morning notification (one task to focus)
  const fetchAINotification = async () => {
    try {
      const notifyStateKey = JSON.stringify({
        projects: projects.map(p => ({ id: p.id, progress_percent: p.progress_percent })),
        tasks: tasks.map(t => ({ id: t.id, done: t.done })),
        date: new Date().toISOString().split('T')[0] // today's date
      });

      const cachedNotifyHash = localStorage.getItem("temote_notify_state_hash");
      const cachedNotifyMsg = localStorage.getItem("temote_notify_cached_msg");

      if (cachedNotifyHash === notifyStateKey && cachedNotifyMsg) {
        setMorningNotification(cachedNotifyMsg);
        setShowNotificationBanner(true);
        return;
      }

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
        if (data.isFallback) {
          setGeminiFallbackActive(true);
          setGeminiErrorMsg(data.apiError || "");
        } else {
          localStorage.setItem("temote_notify_state_hash", notifyStateKey);
          localStorage.setItem("temote_notify_cached_msg", data.message);
        }
      }
    } catch (e) {
      console.warn("Could not fetch morning notification.", e);
    }
  };

  // Fetch AI recommended task
  const fetchAISuggestion = async (currentProj: Project[], currentTasks: Task[], lastDoneTask: any = null) => {
    setLoadingSuggestion(true);
    try {
      const stateKey = JSON.stringify({
        projects: currentProj.map(p => ({ id: p.id, progress_percent: p.progress_percent })),
        tasks: currentTasks.map(t => ({ id: t.id, done: t.done })),
        lastCompleted: lastDoneTask ? lastDoneTask.id : null
      });

      const cachedHash = localStorage.getItem("temote_suggestion_state_hash");
      const cachedData = localStorage.getItem("temote_suggestion_cached_data");

      if (cachedHash === stateKey && cachedData && !lastDoneTask) {
        const parsed = JSON.parse(cachedData);
        setRecommendedTask(parsed.task);
        setRecommendationReason(parsed.reason);
        setLoadingSuggestion(false);
        return;
      }

      const storedPat = localStorage.getItem("temote_github_pat") || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (storedPat) {
        headers["X-GitHub-Token"] = storedPat;
      }
      const response = await fetch("/api/temote/suggest", {
        method: "POST",
        headers,
        body: JSON.stringify({
          projects: currentProj,
          tasks: currentTasks,
          settings,
          lastCompletedTask: lastDoneTask,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.isFallback) {
          setGeminiFallbackActive(true);
          setGeminiErrorMsg(data.apiError || "");
        }
        if (data.task) {
          // If suggestion returned a brand new suggested task, merge it or use it as is
          setRecommendedTask(data.task);
          setRecommendationReason(data.reason);
          if (!data.isFallback) {
            localStorage.setItem("temote_suggestion_state_hash", stateKey);
            localStorage.setItem("temote_suggestion_cached_data", JSON.stringify({
              task: data.task,
              reason: data.reason
            }));
          }
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
    
    const sandboxEvents = localStorage.getItem("temote_sandbox_events");
    if (sandboxEvents) {
      setEvents(JSON.parse(sandboxEvents));
    } else {
      setEvents([
        {
          id: "evt-initial-1",
          title: "A社キックオフ・要件定義ミーティング",
          date: "2026-07-01",
          time: "10:00",
          duration_minutes: 60,
          project_id: "proj-050call",
          type: "meeting",
          description: "新規コールシステムの要件についての初顔合わせMTG"
        },
        {
          id: "evt-initial-2",
          title: "渋谷オフィス訪問 & 打合せ",
          date: "2026-07-01",
          time: "14:00",
          duration_minutes: 90,
          project_id: "proj-concertante",
          type: "transit",
          description: "渋谷オフィスにて実装方針の擦り合わせ。移動時間を伴います。"
        },
        {
          id: "evt-initial-3",
          title: "ブラジル日記 第3章 執筆完了目標",
          date: "2026-07-05",
          time: "15:00",
          duration_minutes: 60,
          project_id: "proj-brazil-diary",
          type: "work",
          description: "静的サイト化の移行にむけた、第3章の編集作業。"
        }
      ]);
    }
    setTemoteGreeting("ゲストモードに切り替わりました。サンドボックスデータはブラウザに一時保存されます。");
  };

  // Handle AI analysis parsed result
  const handleAnalysisSuccess = (result: {
    responseText: string;
    newProject: Project | null;
    updatedProjects: { id: string; progress_percent: number; last_worked_at: string }[];
    createdTasks: any[];
    completedTaskIds: string[];
    isFallback?: boolean;
    apiError?: string;
  }) => {
    if (result.isFallback) {
      setGeminiFallbackActive(true);
      setGeminiErrorMsg(result.apiError || "");
    }

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
          note: "「今持ってる仕事」欄からのAI自動完了処理",
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
      saveUserData(userEmail, nextProjects, nextTasks, nextHistory, settings, events);
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
      saveUserData(userEmail, nextProjects, nextTasks, nextHistory, settings, events);
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
      saveUserData(userEmail, nextProjects, nextTasks, nextHistory, settings, events);
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

  // Calendar Event Operations
  const handleCalendarAddEvent = (evtData: Omit<CalendarEvent, "id">) => {
    const newEvt: CalendarEvent = {
      ...evtData,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
    const nextEvents = [...events, newEvt];
    updateEventsAndSave(nextEvents);
  };

  const handleCalendarDeleteEvent = (eventId: string) => {
    const nextEvents = events.filter((e) => e.id !== eventId);
    updateEventsAndSave(nextEvents);
  };

  // Update Project Details
  const handleUpdateProject = (projectId: string, updatedFields: Partial<Project>) => {
    const nextProjects = projects.map((p) => {
      if (p.id === projectId) {
        return { ...p, ...updatedFields };
      }
      return p;
    });
    updateProjectsAndSave(nextProjects);
  };

  // Update Task Details
  const handleUpdateTask = (taskId: string, updatedFields: Partial<Task>) => {
    const nextTasks = tasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, ...updatedFields };
      }
      return t;
    });

    const targetTask = tasks.find((t) => t.id === taskId);
    if (targetTask) {
      let nextProjects = [...projects];
      const pId = updatedFields.project_id || targetTask.project_id;
      const projTasks = nextTasks.filter((t) => t.project_id === pId);
      const doneTasks = projTasks.filter((t) => t.done);
      if (projTasks.length > 0) {
        const nextPercent = Math.round((doneTasks.length / projTasks.length) * 100);
        nextProjects = nextProjects.map((p) => {
          if (p.id === pId) {
            return {
              ...p,
              progress_percent: nextPercent,
            };
          }
          return p;
        });
      }
      setProjects(nextProjects);
      if (isLoggedIn) {
        saveUserData(userEmail, nextProjects, nextTasks, history, settings, events);
      }
    }

    setTasks(nextTasks);
    if (isLoggedIn) {
      saveUserData(userEmail, projects, nextTasks, history, settings, events);
    }
    fetchAISuggestion(projects, nextTasks);
  };

  // Delete Project
  const handleDeleteProject = (projectId: string) => {
    const nextProjects = projects.filter((p) => p.id !== projectId);
    const nextTasks = tasks.filter((t) => t.project_id !== projectId);
    setProjects(nextProjects);
    setTasks(nextTasks);
    if (isLoggedIn) {
      saveUserData(userEmail, nextProjects, nextTasks, history, settings, events);
    }
    fetchAISuggestion(nextProjects, nextTasks);
  };

  // Delete Task
  const handleDeleteTask = (taskId: string) => {
    const nextTasks = tasks.filter((t) => t.id !== taskId);
    updateTasksAndSave(nextTasks);
  };

  // Delete Dummy Data (keeping custom-added data)
  const handleDeleteDummyData = () => {
    const dummyProjectIds = ["proj-050call", "proj-concertante", "proj-brazil-diary", "proj-god-glory"];
    const nextProjects = projects.filter((p) => !dummyProjectIds.includes(p.id));
    const nextTasks = tasks.filter((t) => !dummyProjectIds.includes(t.project_id));
    const dummyHistoryIds = ["hist-1", "hist-2"];
    const nextHistory = history.filter((h) => !dummyHistoryIds.includes(h.id));
    const dummyEventIds = ["evt-initial-1", "evt-initial-2", "evt-initial-3"];
    const nextEvents = events.filter((e) => !dummyEventIds.includes(e.id));

    setProjects(nextProjects);
    setTasks(nextTasks);
    setHistory(nextHistory);
    setEvents(nextEvents);

    if (isLoggedIn) {
      saveUserData(userEmail, nextProjects, nextTasks, nextHistory, settings, nextEvents);
    } else {
      localStorage.setItem("temote_sandbox_projects", JSON.stringify(nextProjects));
      localStorage.setItem("temote_sandbox_tasks", JSON.stringify(nextTasks));
      localStorage.setItem("temote_sandbox_history", JSON.stringify(nextHistory));
      localStorage.setItem("temote_sandbox_events", JSON.stringify(nextEvents));
    }
    
    // Reset AI suggestions / greet if no projects left
    if (nextProjects.length === 0) {
      setRecommendedTask(null);
      setRecommendationReason("プロジェクトやタスクがありません。まずはプロジェクトを登録しましょう。");
    } else {
      fetchAISuggestion(nextProjects, nextTasks);
    }
  };

  // Clear All Data Completely
  const handleClearAllData = () => {
    setProjects([]);
    setTasks([]);
    setHistory([]);
    setEvents([]);

    if (isLoggedIn) {
      saveUserData(userEmail, [], [], [], settings, []);
    } else {
      localStorage.setItem("temote_sandbox_projects", JSON.stringify([]));
      localStorage.setItem("temote_sandbox_tasks", JSON.stringify([]));
      localStorage.setItem("temote_sandbox_history", JSON.stringify([]));
      localStorage.setItem("temote_sandbox_events", JSON.stringify([]));
    }

    setRecommendedTask(null);
    setRecommendationReason("プロジェクトやタスクがありません。まずはプロジェクトを登録しましょう。");
  };

  // Dark Mode styling classes helper
  const wrapperClass = settings.dark_mode ? "dark bg-[#0d0e11] text-gray-100" : "bg-[#fdfdfd] text-[#1D1D1F]";

  return (
    <div className={`min-h-screen transition-colors duration-300 ${wrapperClass} font-sans antialiased`}>
      
      {/* Top Header Bar */}
      <header className="border-b border-gray-100 bg-white/85 backdrop-blur-md sticky top-0 z-40 transition-all">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CuteTemoteLogo size={28} />
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-5">

        {/* Supabase Error / SQL Schema Setup Banner */}
        {supabaseError && (
          <div className="bg-amber-50/95 border border-amber-200 rounded-2xl p-5 mb-5 text-xs text-amber-900 animate-fade-in relative shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-3 flex-1">
                <h3 className="font-bold text-sm text-amber-950">Supabaseのテーブル設定が必要です</h3>
                <p className="text-amber-800 leading-relaxed text-xs">
                  Supabaseの接続情報（URLとANON KEY）は設定されていますが、データを格納するためのテーブル <code>temote_user_data</code> がデータベース内に存在しない、またはポリシーが不適切です。現在データはローカルストレージに安全に保存されています。
                </p>
                <div className="space-y-1.5">
                  <span className="font-bold text-[10px] text-amber-900 uppercase tracking-wider block">【解決方法】SupabaseのSQL Editorで以下のSQLを実行してください：</span>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto text-[10px] font-mono leading-relaxed select-all">
{`create table if not exists temote_user_data (
  email text primary key,
  projects jsonb default '[]'::jsonb,
  tasks jsonb default '[]'::jsonb,
  history jsonb default '[]'::jsonb,
  settings jsonb default '{}'::jsonb,
  events jsonb default '[]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS（Row Level Security）を有効にして、ログイン中ユーザーが自身のemailデータのみアクセス可能にする
alter table temote_user_data enable row level security;

create policy "Users can select their own row"
  on temote_user_data for select
  using (auth.email() = email);

create policy "Users can insert their own row"
  on temote_user_data for insert
  with check (auth.email() = email);

create policy "Users can update their own row"
  on temote_user_data for update
  using (auth.email() = email)
  with check (auth.email() = email);`}
                  </pre>
                </div>
              </div>
              <button 
                onClick={() => setSupabaseError(null)} 
                className="text-amber-500 hover:text-amber-700 font-bold px-2 py-1 rounded-lg hover:bg-amber-100/50 absolute top-4 right-4 text-sm transition-colors"
                title="閉じる"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Gemini API Fallback Banner */}
        {geminiFallbackActive && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5 text-xs text-amber-900 animate-fade-in relative shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-600 shrink-0">
                <Sparkles className="w-5 h-5 text-amber-600" />
              </div>
              <div className="space-y-1 flex-1 pr-6">
                <h3 className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
                  ローカルオフライン自動判定モードで稼働中
                </h3>
                <p className="text-amber-800 leading-relaxed text-xs">
                  Gemini APIの無料枠制限（429 Quota Exceeded）または接続エラーが発生したため、テモテは一時的に
                  <strong>安全なローカルオフライン自動判定ロジック</strong>
                  で動作しています。プロジェクトやタスクの登録、進捗の手動更新、カレンダー管理などのコア機能はすべて通常どおり稼働しています。
                </p>
                {geminiErrorMsg && (
                  <p className="text-[10px] text-amber-600 font-mono italic">
                    エラー詳細: {geminiErrorMsg}
                  </p>
                )}
              </div>
              <button 
                onClick={() => setGeminiFallbackActive(false)} 
                className="text-amber-500 hover:text-amber-700 font-bold px-2 py-1 rounded-lg hover:bg-amber-100/50 absolute top-4 right-4 text-sm transition-colors cursor-pointer"
                title="閉じる"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        {/* Dashboard Grid (Bento Layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           
          {/* Main Workspace (Left Area on desktop) */}
          <div className="sm:col-span-2 space-y-4">
            
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

            {/* Calendar & Fixed Appointments Panel */}
            <CalendarPanel
              projects={projects}
              events={events}
              onAddEvent={handleCalendarAddEvent}
              onDeleteEvent={handleCalendarDeleteEvent}
            />

            {/* Daily Schedule Generator */}
            <DailySchedulePanel
              projects={projects}
              tasks={tasks}
              events={events}
              onSelectTaskToFocus={(task) => {
                setRecommendedTask(task);
                setRecommendationReason("スケジュールから選択された今日の集中タスクです。");
              }}
            />
          </div>

          {/* Side Panels (Right Area on desktop) */}
          <div className="space-y-4">
            
            {/* Unstructured Status Input */}
            <StatusInput
              projects={projects}
              tasks={tasks}
              settings={settings}
              onAnalysisSuccess={handleAnalysisSuccess}
              isGuest={!isLoggedIn}
              latestFeedback={temoteGreeting}
            />

            {/* List of Held Jobs / Active Projects & Tasks */}
            <HeldJobsList
              projects={projects}
              tasks={tasks}
              onToggleTask={handleToggleTask}
              onUpdateProject={handleUpdateProject}
            />

            {/* History Logs */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs transition-all hover:shadow-sm duration-300">
              <div className="flex items-center justify-between mb-3.5 pb-1.5 border-b border-gray-50">
                <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] font-display">History</h2>
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
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

            {/* Settings View */}
            <SettingsView
              settings={settings}
              onUpdateSettings={updateSettingsAndSave}
              onDeleteDummyData={handleDeleteDummyData}
              onClearAllData={handleClearAllData}
            />

            {/* GitHub Settings & Indicator */}
            <GithubSettings 
              onTokenChange={() => {
                fetchAISuggestion(projects, tasks);
              }}
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

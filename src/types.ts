export type ProjectType = "code" | "writing" | "presentation";

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  status: "active" | "paused" | "completed";
  progress_percent: number;
  deadline?: string;
  last_worked_at?: string;
  github_repo?: string; // e.g. "owner/repo" or "https://github.com/owner/repo"
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  estimated_minutes: number;
  priority: "high" | "medium" | "low";
  deadline?: string;
  ai_assignee: "claude" | "gemini" | "chatgpt";
  done: boolean;
  status?: "todo" | "in_progress" | "done";
  started_at?: string;
}

export interface HistoryItem {
  id: string;
  task_id: string;
  project_name: string;
  task_title: string;
  completed_at: string;
  note?: string;
}

export interface Settings {
  name: string;
  ai_model: string;
  notification_enabled: boolean;
  dark_mode: boolean;
}

export interface AnalyzeResult {
  responseText: string;
  newProjectProposal: { name: string; type: ProjectType } | null;
  updatedProjects: { id: string; progress_percent: number; last_worked_at: string }[];
  createdTasks: {
    project_id: string;
    title: string;
    estimated_minutes: number;
    priority: "high" | "medium" | "low";
    ai_assignee: "claude" | "gemini" | "chatgpt";
  }[];
  completedTaskIds: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  time?: string; // "HH:MM"
  duration_minutes?: number;
  project_id?: string; // Optional reference to a project
  type: "work" | "break" | "lunch" | "review" | "transit" | "meeting" | "personal";
  description?: string;
}

export interface Memory {
  id: string;
  category: "values" | "faith" | "ifs_parts" | "wishes";
  content: string;
  source?: string;
  created_at?: string;
  email?: string;
}


import { Project, Task, HistoryItem, Settings } from "../types";

export const initialProjects: Project[] = [
  {
    id: "proj-050call",
    name: "050call",
    type: "code",
    status: "active",
    progress_percent: 85,
    deadline: "2026-07-15",
    last_worked_at: "2026-06-30T15:30:00Z",
  },
  {
    id: "proj-concertante",
    name: "CONCERTANTE",
    type: "code",
    status: "active",
    progress_percent: 45,
    deadline: "2026-07-30",
    last_worked_at: "2026-06-29T18:45:00Z",
  },
  {
    id: "proj-brazil-diary",
    name: "ブラジル日記",
    type: "writing",
    status: "active",
    progress_percent: 70,
    deadline: "2026-08-15",
    last_worked_at: "2026-06-28T10:15:00Z",
  },
  {
    id: "proj-god-glory",
    name: "神の栄光の年表",
    type: "writing",
    status: "active",
    progress_percent: 92,
    deadline: "2026-07-08",
    last_worked_at: "2026-06-25T14:20:00Z",
  }
];

export const initialTasks: Task[] = [
  {
    id: "task-twilio-error",
    project_id: "proj-050call",
    title: "Twilioのエラーハンドリングを整える",
    estimated_minutes: 25,
    priority: "high",
    deadline: "2026-07-10",
    ai_assignee: "gemini",
    done: false,
  },
  {
    id: "task-telnyx-test",
    project_id: "proj-050call",
    title: "Telnyxのプロバイダー抽象化レイヤーのテスト",
    estimated_minutes: 35,
    priority: "medium",
    deadline: "2026-07-12",
    ai_assignee: "gemini",
    done: true,
  },
  {
    id: "task-drizzle-schema",
    project_id: "proj-concertante",
    title: "フォロー機能のDrizzleスキーマを詰める",
    estimated_minutes: 45,
    priority: "high",
    deadline: "2026-07-20",
    ai_assignee: "gemini",
    done: false,
  },
  {
    id: "task-follow-api",
    project_id: "proj-concertante",
    title: "フォロー機能のAPIエンドポイント設計",
    estimated_minutes: 30,
    priority: "medium",
    deadline: "2026-07-25",
    ai_assignee: "gemini",
    done: false,
  },
  {
    id: "task-brazil-static",
    project_id: "proj-brazil-diary",
    title: "静的サイト化のBlogger移行プラン作成",
    estimated_minutes: 40,
    priority: "medium",
    deadline: "2026-08-01",
    ai_assignee: "gemini",
    done: false,
  },
  {
    id: "task-brazil-chap3",
    project_id: "proj-brazil-diary",
    title: "第3章（サンパウロ編）の下書き校正",
    estimated_minutes: 50,
    priority: "low",
    deadline: "2026-08-05",
    ai_assignee: "gemini",
    done: true,
  },
  {
    id: "task-god-lastweek",
    project_id: "proj-god-glory",
    title: "先週の出来事を追記する",
    estimated_minutes: 15,
    priority: "high",
    deadline: "2026-07-05",
    ai_assignee: "gemini",
    done: false,
  }
];

export const initialHistory: HistoryItem[] = [
  {
    id: "hist-1",
    task_id: "task-telnyx-test",
    project_name: "050call",
    task_title: "Telnyxのプロバイダー抽象化レイヤーのテスト",
    completed_at: "2026-06-30T15:30:00Z",
    note: "すべての結合テストケースに合格しました。"
  },
  {
    id: "hist-2",
    task_id: "task-brazil-chap3",
    project_name: "ブラジル日記",
    task_title: "第3章（サンパウロ編）の下書き校正",
    completed_at: "2026-06-28T10:15:00Z",
    note: "誤字脱字の修正、および画像の配置調整を完了。"
  }
];

export const initialSettings: Settings = {
  name: "ジョアンナ",
  ai_model: "Gemini 3.5 Flash",
  notification_enabled: true,
  dark_mode: false,
};

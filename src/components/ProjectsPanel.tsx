import React, { useState } from "react";
import { FolderPlus, Plus, ChevronDown, ChevronRight, Calendar, CheckSquare, Square, Trash2, Clock, AlertCircle, Pencil, Check, X } from "lucide-react";
import { Project, Task, ProjectType } from "../types";

interface ProjectsPanelProps {
  projects: Project[];
  tasks: Task[];
  onAddProject: (project: Omit<Project, "id">) => void;
  onAddTask: (task: Omit<Task, "id" | "done">) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteDummyData?: () => void;
  onUpdateProject: (projectId: string, updated: Partial<Project>) => void;
  onUpdateTask: (taskId: string, updated: Partial<Task>) => void;
}

export const ProjectsPanel: React.FC<ProjectsPanelProps> = ({
  projects,
  tasks,
  onAddProject,
  onAddTask,
  onToggleTask,
  onDeleteProject,
  onDeleteTask,
  onDeleteDummyData,
  onUpdateProject,
  onUpdateTask
}) => {
  const [expandedProject, setExpandedProject] = useState<string | null>("proj-050call");
  
  // Handlers for adding a new project
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjType, setNewProjType] = useState<ProjectType>("code");
  const [newProjDeadline, setNewProjDeadline] = useState("");

  // Handlers for adding a new task
  const [showAddTaskForProject, setShowAddTaskForProject] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskMinutes, setNewTaskMinutes] = useState(25);
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [newTaskAssignee, setNewTaskAssignee] = useState<"claude" | "gemini" | "chatgpt">("gemini");

  // State for Editing Tasks
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskEditTitle, setTaskEditTitle] = useState("");
  const [taskEditMinutes, setTaskEditMinutes] = useState(25);
  const [taskEditPriority, setTaskEditPriority] = useState<"high" | "medium" | "low">("medium");
  const [taskEditAssignee, setTaskEditAssignee] = useState<"claude" | "gemini" | "chatgpt">("gemini");

  // State for Editing Projects
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectEditName, setProjectEditName] = useState("");
  const [projectEditType, setProjectEditType] = useState<ProjectType>("code");
  const [projectEditDeadline, setProjectEditDeadline] = useState("");

  const startEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setTaskEditTitle(task.title);
    setTaskEditMinutes(task.estimated_minutes);
    setTaskEditPriority(task.priority);
    setTaskEditAssignee(task.ai_assignee);
  };

  const handleSaveTaskEdit = (taskId: string) => {
    if (!taskEditTitle.trim()) return;
    onUpdateTask(taskId, {
      title: taskEditTitle.trim(),
      estimated_minutes: Number(taskEditMinutes),
      priority: taskEditPriority,
      ai_assignee: taskEditAssignee,
    });
    setEditingTaskId(null);
  };

  const startEditProject = (project: Project) => {
    setEditingProjectId(project.id);
    setProjectEditName(project.name);
    setProjectEditType(project.type);
    setProjectEditDeadline(project.deadline || "");
  };

  const handleSaveProjectEdit = (projectId: string) => {
    if (!projectEditName.trim()) return;
    onUpdateProject(projectId, {
      name: projectEditName.trim(),
      type: projectEditType,
      deadline: projectEditDeadline || undefined,
    });
    setEditingProjectId(null);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    onAddProject({
      name: newProjName.trim(),
      type: newProjType,
      status: "active",
      progress_percent: 0,
      deadline: newProjDeadline || undefined,
    });

    setNewProjName("");
    setNewProjDeadline("");
    setShowAddProject(false);
  };

  const handleCreateTask = (projectId: string) => {
    if (!newTaskTitle.trim()) return;

    onAddTask({
      project_id: projectId,
      title: newTaskTitle.trim(),
      estimated_minutes: Number(newTaskMinutes),
      priority: newTaskPriority,
      ai_assignee: newTaskAssignee,
    });

    setNewTaskTitle("");
    setNewTaskMinutes(25);
    setNewTaskPriority("medium");
    setShowAddTaskForProject(null);
  };

  const toggleExpand = (projectId: string) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
  };

  const hasDummyData = projects.some((p) =>
    ["proj-050call", "proj-concertante", "proj-brazil-diary", "proj-god-glory"].includes(p.id)
  );

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs transition-all duration-300">
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-50">
        <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] font-display">Projects</h2>
        <div className="flex items-center gap-1.5">
          {hasDummyData && onDeleteDummyData && (
            <button
              onClick={() => {
                if (confirm("デフォルトのダミープロジェクトとタスクをすべて削除しますか？")) {
                  onDeleteDummyData();
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-semibold rounded-full transition-colors cursor-pointer"
              title="ダミーデータをすべて削除"
            >
              <Trash2 className="w-3 h-3" />
              <span>ダミー削除</span>
            </button>
          )}
          <button
            onClick={() => setShowAddProject(!showAddProject)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1D1D1F] hover:bg-black text-white text-[11px] font-semibold rounded-full hover:scale-[1.02] transition-transform cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>追加</span>
          </button>
        </div>
      </div>

      {/* Manual Project Creation Form */}
      {showAddProject && (
        <form onSubmit={handleCreateProject} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-4 space-y-3.5 animate-fade-in">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] font-display">新しいプロジェクトの登録</div>
          <div className="space-y-2.5">
            <input
              type="text"
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              placeholder="プロジェクト名 (例: 050call)"
              className="w-full text-xs text-gray-800 bg-white border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-100 rounded-xl px-3 py-2 transition-all outline-hidden"
              required
            />
            
            <div className="flex gap-2">
              <select
                value={newProjType}
                onChange={(e) => setNewProjType(e.target.value as ProjectType)}
                className="flex-1 text-xs text-gray-800 bg-white border border-gray-200 focus:border-gray-900 rounded-xl px-2.5 py-2 transition-all outline-hidden cursor-pointer"
              >
                <option value="code">実装・コード (code)</option>
                <option value="writing">文章・記録 (writing)</option>
                <option value="presentation">プレゼン・発表 (presentation)</option>
              </select>

              <input
                type="date"
                value={newProjDeadline}
                onChange={(e) => setNewProjDeadline(e.target.value)}
                className="flex-1 text-xs text-gray-800 bg-white border border-gray-200 focus:border-gray-900 rounded-xl px-2.5 py-2 transition-all outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddProject(false)}
                className="px-4 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-500 rounded-full text-[10px] font-semibold transition-all cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#1D1D1F] hover:bg-black text-white rounded-full text-[10px] font-semibold transition-transform hover:scale-[1.02] cursor-pointer"
              >
                登録する
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Projects List */}
      <div className="space-y-4">
        {projects.length === 0 ? (
          <div className="text-center py-8 px-4 bg-gray-50 border border-dashed border-gray-150 rounded-2xl">
            <FolderPlus className="w-7 h-7 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-700">プロジェクトがありません</p>
            <p className="text-[10px] text-gray-400 font-light mt-1 leading-relaxed">
              「追加」ボタン、または「今持ってる仕事」欄に<br />「〇〇プロジェクトをはじめました」と入力して作成してください。
            </p>
          </div>
        ) : (
          projects.map((project) => {
            const projectTasks = tasks.filter((t) => t.project_id === project.id);
            const completedTasks = projectTasks.filter((t) => t.done);
            const isExpanded = expandedProject === project.id;

            return (
              <div key={project.id} className="border border-gray-100 rounded-2xl overflow-hidden transition-all duration-200 hover:border-gray-200">
              {/* Project Header Row or Edit Form */}
              {editingProjectId === project.id ? (
                <div 
                  onClick={(e) => e.stopPropagation()} 
                  className="flex flex-col gap-2.5 p-4 bg-gray-50/50 border-b border-gray-100"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={projectEditName}
                      onChange={(e) => setProjectEditName(e.target.value)}
                      className="text-xs text-gray-800 bg-white border border-gray-200 focus:border-gray-900 rounded-xl px-2.5 py-1.5 flex-1 outline-hidden"
                      required
                    />
                    <select
                      value={projectEditType}
                      onChange={(e) => setProjectEditType(e.target.value as ProjectType)}
                      className="text-xs text-gray-800 bg-white border border-gray-200 rounded-xl px-2 py-1.5 outline-hidden"
                    >
                      <option value="code">Code</option>
                      <option value="writing">Writing</option>
                      <option value="presentation">Presentation</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <input
                      type="date"
                      value={projectEditDeadline}
                      onChange={(e) => setProjectEditDeadline(e.target.value)}
                      className="text-xs text-gray-800 bg-white border border-gray-200 rounded-xl px-2 py-1 outline-hidden"
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setEditingProjectId(null)}
                        className="p-1 hover:bg-gray-100 text-gray-500 rounded-full cursor-pointer"
                        title="キャンセル"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleSaveProjectEdit(project.id)}
                        className="p-1.5 bg-[#1D1D1F] hover:bg-black text-white rounded-full cursor-pointer flex items-center justify-center"
                        title="保存"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => toggleExpand(project.id)}
                  className="flex items-center justify-between p-4 bg-gray-50/20 hover:bg-gray-50/50 cursor-pointer select-none transition-all"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-semibold text-sm text-[#1D1D1F] truncate">
                          {project.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border ${
                          project.type === "code" 
                            ? "bg-amber-50 text-amber-700 border-amber-100" 
                            : project.type === "writing"
                            ? "bg-purple-50 text-purple-700 border-purple-100"
                            : "bg-blue-50 text-blue-700 border-blue-100"
                        }`}>
                          {project.type === "code" ? "Code" : project.type === "writing" ? "Writing" : "Presentation"}
                        </span>
                      </div>
                      {project.deadline && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1 font-light">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>締切: {project.deadline}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-sm font-mono font-medium text-gray-800">
                        {project.progress_percent}%
                      </span>
                      <span className="text-[10px] text-gray-400 block font-light">
                        {completedTasks.length}/{projectTasks.length} 完了
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditProject(project);
                      }}
                      className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-full transition-all shrink-0 cursor-pointer"
                      title="プロジェクト編集"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`プロジェクト「${project.name}」を削除しますか？`)) {
                          onDeleteProject(project.id);
                        }
                      }}
                      className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-full transition-all shrink-0 cursor-pointer"
                      title="プロジェクト削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Progress Bar (Super minimal sleek black bar) */}
              <div className="w-full bg-gray-100 h-[2px]">
                <div
                  className="h-full bg-[#1D1D1F] transition-all duration-500"
                  style={{ width: `${project.progress_percent}%` }}
                />
              </div>

              {/* Tasks Sub-list (when expanded) */}
              {isExpanded && (
                <div className="p-4 bg-white border-t border-gray-100/50 space-y-3.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] font-display">
                      タスク一覧
                    </span>
                    <button
                      onClick={() => setShowAddTaskForProject(showAddTaskForProject === project.id ? null : project.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-50 hover:bg-gray-100 text-[#1D1D1F] text-[10px] font-semibold rounded-full border border-gray-200 transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>追加</span>
                    </button>
                  </div>

                  {/* Add Task Sub-form */}
                  {showAddTaskForProject === project.id && (
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3.5 mb-2 space-y-3 animate-fade-in">
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="タスク名 (例: Twilioのエラー処理)"
                        className="w-full text-xs text-gray-800 bg-white border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-100 rounded-xl px-3 py-1.5 transition-all outline-hidden"
                      />
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] text-gray-400 block font-bold uppercase tracking-wider mb-1 font-display">時間(分)</label>
                          <input
                            type="number"
                            value={newTaskMinutes}
                            onChange={(e) => setNewTaskMinutes(Number(e.target.value))}
                            className="w-full text-xs text-gray-800 bg-white border border-gray-200 rounded-lg px-2 py-1 outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-400 block font-bold uppercase tracking-wider mb-1 font-display">優先度</label>
                          <select
                            value={newTaskPriority}
                            onChange={(e) => setNewTaskPriority(e.target.value as any)}
                            className="w-full text-xs text-gray-800 bg-white border border-gray-200 rounded-lg px-1.5 py-1 outline-hidden"
                          >
                            <option value="high">高</option>
                            <option value="medium">中</option>
                            <option value="low">低</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-400 block font-bold uppercase tracking-wider mb-1 font-display">担当AI</label>
                          <select
                            value={newTaskAssignee}
                            onChange={(e) => setNewTaskAssignee(e.target.value as any)}
                            className="w-full text-xs text-gray-800 bg-white border border-gray-200 rounded-lg px-1.5 py-1 outline-hidden"
                          >
                            <option value="gemini">Gemini (標準)</option>
                            <option value="claude">Claude (Gemini代理)</option>
                            <option value="chatgpt">ChatGPT (Gemini代理)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1">
                        <button
                          onClick={() => setShowAddTaskForProject(null)}
                          className="px-3 py-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-500 rounded-full text-[10px] font-semibold cursor-pointer"
                        >
                          キャンセル
                        </button>
                        <button
                          onClick={() => handleCreateTask(project.id)}
                          className="px-4 py-1 bg-[#1D1D1F] hover:bg-black text-white rounded-full text-[10px] font-semibold hover:scale-[1.02] transition-transform cursor-pointer"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tasks list inside project */}
                  {projectTasks.length === 0 ? (
                    <div className="text-center py-4 text-[10px] text-gray-400 font-light">
                      タスクがありません。
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {projectTasks.map((task) => {
                        const isEditing = editingTaskId === task.id;

                        if (isEditing) {
                          return (
                            <div
                              key={task.id}
                              className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2.5 animate-fade-in"
                            >
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={taskEditTitle}
                                  onChange={(e) => setTaskEditTitle(e.target.value)}
                                  className="w-full text-xs text-gray-800 bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-2.5 py-1.5 outline-hidden"
                                  placeholder="タスク名"
                                  required
                                />
                              </div>
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={taskEditMinutes}
                                      onChange={(e) => setTaskEditMinutes(Number(e.target.value))}
                                      className="w-12 text-center text-xs text-gray-800 bg-white border border-gray-200 rounded-lg px-1 py-1 outline-hidden"
                                    />
                                    <span className="text-[10px] text-gray-400 font-light">分</span>
                                  </div>

                                  <select
                                    value={taskEditPriority}
                                    onChange={(e) => setTaskEditPriority(e.target.value as any)}
                                    className="text-xs text-gray-800 bg-white border border-gray-200 rounded-lg px-1.5 py-1 outline-hidden cursor-pointer"
                                  >
                                    <option value="high">優先度: 高</option>
                                    <option value="medium">優先度: 中</option>
                                    <option value="low">優先度: 低</option>
                                  </select>

                                  <select
                                    value={taskEditAssignee}
                                    onChange={(e) => setTaskEditAssignee(e.target.value as any)}
                                    className="text-xs text-gray-800 bg-white border border-gray-200 rounded-lg px-1.5 py-1 outline-hidden cursor-pointer"
                                  >
                                    <option value="gemini">Gemini (標準)</option>
                                    <option value="claude">Claude (Gemini代理)</option>
                                    <option value="chatgpt">ChatGPT (Gemini代理)</option>
                                  </select>
                                </div>

                                <div className="flex items-center gap-1.5 ml-auto">
                                  <button
                                    onClick={() => setEditingTaskId(null)}
                                    className="p-1 hover:bg-gray-250 text-gray-500 rounded-full transition-colors cursor-pointer"
                                    title="キャンセル"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleSaveTaskEdit(task.id)}
                                    className="p-1 bg-[#1D1D1F] hover:bg-black text-white rounded-full transition-colors cursor-pointer flex items-center justify-center"
                                    title="保存"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={task.id}
                            className={`flex items-center justify-between p-3 rounded-xl text-xs transition-colors border ${
                              task.done
                                ? "bg-gray-50/40 border-gray-100/50 text-gray-400 line-through"
                                : "bg-white border-gray-100 text-gray-800 hover:border-gray-200 hover:shadow-xs"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <button
                                onClick={() => onToggleTask(task.id)}
                                className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 cursor-pointer"
                              >
                                {task.done ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-gray-300 hover:text-[#1D1D1F]" />
                                )}
                              </button>
                              <span className="truncate pr-1 font-light">{task.title}</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-mono text-gray-400 flex items-center gap-0.5">
                                <Clock className="w-3 h-3 text-gray-300" />
                                <span>{task.estimated_minutes}分</span>
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                task.priority === "high" 
                                  ? "bg-red-50 text-red-600 border-red-100" 
                                  : task.priority === "medium" 
                                  ? "bg-amber-50 text-amber-600 border-amber-100" 
                                  : "bg-gray-50 text-gray-500 border-gray-150"
                              }`}>
                                {task.priority === "high" ? "高" : task.priority === "medium" ? "中" : "低"}
                              </span>
                              
                              <button
                                onClick={() => startEditTask(task)}
                                className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-full transition-colors cursor-pointer"
                                title="タスク編集"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => onDeleteTask(task.id)}
                                className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-full transition-colors cursor-pointer"
                                title="タスク削除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
      </div>
    </div>
  );
};


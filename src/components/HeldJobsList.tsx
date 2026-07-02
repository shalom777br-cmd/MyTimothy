import React from "react";
import { Briefcase, CheckSquare, Square, Clock, AlertCircle, ChevronRight, Check } from "lucide-react";
import { Project, Task } from "../types";

interface HeldJobsListProps {
  projects: Project[];
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
}

export const HeldJobsList: React.FC<HeldJobsListProps> = ({
  projects,
  tasks,
  onToggleTask,
}) => {
  // Filter active projects (not completed or paused, or any project that is active)
  const activeProjects = projects.filter((p) => p.status === "active");

  const getProjectTypeLabel = (type: string) => {
    switch (type) {
      case "code":
        return "開発";
      case "writing":
        return "執筆";
      case "presentation":
        return "資料作成";
      default:
        return "その他";
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-50 text-red-600 border-red-100";
      case "medium":
        return "bg-amber-50 text-amber-600 border-amber-100";
      case "low":
        return "bg-blue-50 text-blue-600 border-blue-100";
      default:
        return "bg-gray-50 text-gray-500 border-gray-100";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "高";
      case "medium":
        return "中";
      case "low":
        return "低";
      default:
        return "並";
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs transition-all hover:shadow-sm duration-300 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#0071E3]/10 text-[#0071E3] rounded-lg">
            <Briefcase className="w-4 h-4" />
          </div>
          <h2 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider font-display">
            持ってる仕事一覧
          </h2>
        </div>
        <span className="text-[9px] font-mono bg-[#0071E3]/5 text-[#0071E3] border border-[#0071E3]/10 px-2 py-0.5 rounded-full font-bold">
          {activeProjects.length} 案件稼働中
        </span>
      </div>

      {/* Projects and Tasks List */}
      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
        {activeProjects.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400 font-light">
            現在、抱えているアクティブな案件はありません。
          </div>
        ) : (
          activeProjects.map((project) => {
            // Find incomplete tasks for this project
            const projectTasks = tasks.filter(
              (t) => t.project_id === project.id && !t.done
            );

            return (
              <div key={project.id} className="space-y-2 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                {/* Project Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-gray-50 border border-gray-100 text-gray-500 font-medium shrink-0">
                        {getProjectTypeLabel(project.type)}
                      </span>
                      <h3 className="font-semibold text-xs text-gray-900 truncate">
                        {project.name}
                      </h3>
                    </div>
                    {project.deadline && (
                      <p className="text-[9px] text-gray-400 font-mono">
                        期日: {project.deadline}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-gray-700 shrink-0">
                    {project.progress_percent}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0071E3] h-full rounded-full transition-all duration-500"
                    style={{ width: `${project.progress_percent}%` }}
                  />
                </div>

                {/* Unfinished Tasks list */}
                <div className="pl-1.5 space-y-1.5 pt-1">
                  {projectTasks.length === 0 ? (
                    <p className="text-[10px] text-gray-400 italic font-light pl-2">
                      ✓ 残りのタスクはありません。
                    </p>
                  ) : (
                    projectTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => onToggleTask(task.id)}
                        className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-gray-50/70 border border-transparent hover:border-gray-100 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <button className="text-gray-400 group-hover:text-gray-600 transition-colors shrink-0">
                            <Square className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[11px] text-gray-600 truncate group-hover:text-gray-900 transition-colors">
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Task Time */}
                          <div className="flex items-center gap-0.5 text-gray-400 text-[9px] font-mono">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{task.estimated_minutes}分</span>
                          </div>

                          {/* Priority Badge */}
                          <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full border ${getPriorityBadgeColor(task.priority)}`}>
                            {getPriorityLabel(task.priority)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { CheckCircle2, Circle, Plus, Clock, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface TaskItem {
  _id?: string;
  label: string;
  category: string;
  isCustom?: boolean;
  isDone: boolean;
  doneAt?: string | Date;
}

interface Props {
  tasks: TaskItem[];
  isAssistant?: boolean;
  onToggleTask?: (taskId: string, isDone: boolean) => void;
  onAddCustomTask?: (label: string, category: string) => void;
}

export const TaskChecklistView: React.FC<Props> = ({
  tasks = [],
  isAssistant = false,
  onToggleTask,
  onAddCustomTask,
}) => {
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState('errand');
  const [isAdding, setIsAdding] = useState(false);

  const completedCount = tasks.filter((t) => t.isDone).length;
  const totalCount = tasks.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !onAddCustomTask) return;
    onAddCustomTask(newLabel.trim(), newCategory);
    setNewLabel('');
    setIsAdding(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      {/* Header & Progress */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            Hospital Task Checklist
          </h4>
          <p className="text-xs text-slate-500">
            {isAssistant
              ? 'Tap items to tick them off as you complete hospital tasks'
              : 'Live updates verified as your assistant performs tasks at the hospital'}
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
            {completedCount} / {totalCount} Done
          </span>
          <span className="text-xs text-slate-400 ml-1">({percent}%)</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-teal-600 transition-all duration-300 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Task List */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {tasks.map((task, idx) => {
          const taskId = task._id || String(idx);
          return (
            <div
              key={taskId}
              onClick={() => {
                if (isAssistant && onToggleTask) {
                  onToggleTask(taskId, !task.isDone);
                }
              }}
              className={`p-3 rounded-xl border transition-all flex items-start gap-3 select-none ${
                isAssistant ? 'cursor-pointer hover:border-teal-400' : ''
              } ${
                task.isDone
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {task.isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-medium ${
                      task.isDone
                        ? 'line-through text-slate-500 dark:text-slate-400'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {task.label}
                  </span>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {task.isCustom && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-600 border-amber-300">
                        Custom
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">
                      {task.category?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {task.isDone && task.doneAt && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                    <Clock className="w-2.5 h-2.5" />
                    <span>Done at {new Date(task.doneAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Assistant Add Task Form */}
      {isAssistant && onAddCustomTask && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {isAdding ? (
            <form onSubmit={handleAdd} className="space-y-2">
              <Input
                type="text"
                placeholder="e.g., Collect blood test report from Room 102"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="text-xs h-9"
                autoFocus
              />
              <div className="flex items-center justify-between gap-2">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                >
                  <option value="errand">Errand</option>
                  <option value="paperwork">Paperwork</option>
                  <option value="medicine">Medicine</option>
                  <option value="reports">Reports</option>
                  <option value="elderly_care">Elderly Care</option>
                </select>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAdding(false)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newLabel.trim()}
                    className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    Add Task
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="w-full h-8 text-xs text-teal-700 dark:text-teal-400 border-dashed border-teal-300 dark:border-teal-800"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Custom Task Item
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

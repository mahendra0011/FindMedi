import React, { useEffect, useState } from 'react';
import {
  CheckCircle2, Plus, RefreshCw, Calendar, Clock, AlertTriangle, Filter, CheckSquare
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface CrmTask {
  id: string;
  title: string;
  type: string;
  status: 'open' | 'in_progress' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueAt?: string;
  slaAt?: string;
  ownerId?: { name: string; email: string };
  checklist?: Array<{ label: string; done: boolean }>;
}

export default function CrmTasks() {
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    type: 'follow_up',
    priority: 'medium',
    dueAt: new Date(Date.now() + 864e5).toISOString().split('T')[0],
  });

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const url = statusFilter && statusFilter !== 'all'
        ? `/crm/tasks?status=${statusFilter}`
        : '/crm/tasks';
      const res = await apiClient.get(url);
      setTasks(res.data.tasks || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      toast.error('Task title is required');
      return;
    }
    try {
      await apiClient.post('/crm/tasks', {
        title: newTask.title.trim(),
        type: newTask.type,
        priority: newTask.priority,
        dueAt: newTask.dueAt ? new Date(newTask.dueAt) : null,
      });
      toast.success('Task created');
      setIsAddOpen(false);
      setNewTask({
        title: '',
        type: 'follow_up',
        priority: 'medium',
        dueAt: new Date(Date.now() + 864e5).toISOString().split('T')[0],
      });
      fetchTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      await apiClient.patch(`/crm/tasks/${taskId}`, { status });
      toast.success('Task status updated');
      fetchTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update task');
    }
  };

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs uppercase bg-teal-50 text-teal-700 dark:bg-teal-950/40 border-teal-200">
              Task Engine & SLA Timers
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-1">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            CRM Tasks & Follow-ups
          </h1>
          <p className="text-sm text-muted-foreground">
            Unified action items across supply leads, account renewals, KYC reviews, and partner MoUs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="done">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={fetchTasks} disabled={loading} className="gap-1.5 h-9">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5 h-9 bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" />
            Create Task
          </Button>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground border-b border-border">
            <tr>
              <th className="py-2.5 px-4 text-left font-medium">Task Title</th>
              <th className="py-2.5 px-4 text-left font-medium">Type</th>
              <th className="py-2.5 px-4 text-left font-medium">Priority</th>
              <th className="py-2.5 px-4 text-left font-medium">Due Date</th>
              <th className="py-2.5 px-4 text-left font-medium">Assignee</th>
              <th className="py-2.5 px-4 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tasks.map((task) => {
              const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && task.status !== 'done';
              return (
                <tr key={task.id} className="hover:bg-muted/30">
                  <td className="py-3 px-4 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <span className={task.status === 'done' ? 'line-through text-muted-foreground' : ''}>
                        {task.title}
                      </span>
                      {isOverdue && (
                        <Badge variant="destructive" className="text-[10px] py-0 px-1">
                          Overdue
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 capitalize text-xs text-muted-foreground">
                    {task.type.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3 px-4">
                    {task.priority === 'urgent' && <Badge className="bg-rose-600 text-white text-[10px]">Urgent</Badge>}
                    {task.priority === 'high' && <Badge className="bg-orange-500 text-white text-[10px]">High</Badge>}
                    {task.priority === 'medium' && <Badge variant="secondary" className="text-[10px]">Medium</Badge>}
                    {task.priority === 'low' && <Badge variant="outline" className="text-[10px]">Low</Badge>}
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : 'No date'}
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {task.ownerId?.name || 'Self'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Select value={task.status} onValueChange={(val) => updateTaskStatus(task.id, val)}>
                      <SelectTrigger className="h-7 text-xs w-32 ml-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                        <SelectItem value="done">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-sm text-muted-foreground">
                  No tasks found matching your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create CRM Task</DialogTitle>
            <DialogDescription>Assign a follow-up action, document collection, or visit task.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold">Title / Instruction *</Label>
              <Input
                placeholder="e.g. Call Dr. Verma regarding BMW license renewal"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Type</Label>
                <Select value={newTask.type} onValueChange={(v) => setNewTask({ ...newTask, type: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Phone Call</SelectItem>
                    <SelectItem value="visit">Field Visit</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="doc_request">Doc Request</SelectItem>
                    <SelectItem value="renewal">Renewal</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Priority</Label>
                <Select value={newTask.priority} onValueChange={(v: any) => setNewTask({ ...newTask, priority: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Due Date</Label>
              <Input
                type="date"
                value={newTask.dueAt}
                onChange={(e) => setNewTask({ ...newTask, dueAt: e.target.value })}
                className="mt-1"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit">Create Task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

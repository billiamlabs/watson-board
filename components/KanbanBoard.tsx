'use client'

import { Task } from '@/lib/supabase'
import TaskCard from './TaskCard'

type Props = {
  tasks: Task[]
  projects: Record<string, string>
  onStatusChange: (taskId: string, newStatus: Task['kanban_status']) => void
}

export default function KanbanBoard({ tasks, projects, onStatusChange }: Props) {
  const columns = ['todo', 'inprogress', 'done'] as const

  const getTasksForStatus = (status: Task['kanban_status']) => {
    return tasks.filter(t => t.kanban_status === status)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map(status => (
        <div key={status} className="bg-slate-900 rounded-lg p-4 min-h-96">
          <h2 className="font-bold text-lg mb-4 capitalize flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            {status === 'todo' && 'To Do'}
            {status === 'inprogress' && 'In Progress'}
            {status === 'done' && 'Done'}
          </h2>

          <div className="space-y-3">
            {getTasksForStatus(status).map(task => (
              <TaskCard
                key={task.id}
                task={task}
                projectName={projects[task.id] || task.project}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>

          {getTasksForStatus(status).length === 0 && (
            <div className="text-slate-500 text-sm text-center py-8">No tasks</div>
          )}
        </div>
      ))}
    </div>
  )
}

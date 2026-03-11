'use client'

import { Task } from '@/lib/supabase'

type Props = {
  task: Task
  projectName: string
  onStatusChange: (taskId: string, newStatus: Task['kanban_status']) => void
}

const zoneColors = {
  rocks: 'bg-red-900',
  pebbles: 'bg-yellow-900',
  sand: 'bg-blue-900',
}

const statusButtons = {
  todo: ['inprogress'],
  inprogress: ['todo', 'done'],
  done: ['todo', 'inprogress'],
} as const

export default function TaskCard({ task, projectName, onStatusChange }: Props) {
  const availableStatuses = statusButtons[task.kanban_status]

  return (
    <div className="bg-slate-800 rounded p-3 border border-slate-700 hover:border-slate-600 transition">
      <p className="text-sm font-medium mb-2">{task.text}</p>

      <div className="flex flex-wrap gap-2 mb-2">
        {projectName && (
          <span className="text-xs bg-slate-700 px-2 py-1 rounded">
            {projectName}
          </span>
        )}
        {task.zone && (
          <span className={`text-xs px-2 py-1 rounded ${zoneColors[task.zone]}`}>
            {task.zone}
          </span>
        )}
      </div>

      {task.due && (
        <p className="text-xs text-slate-400 mb-2">
          Due: {new Date(task.due).toLocaleDateString()}
        </p>
      )}

      <div className="flex gap-1 flex-wrap">
        {availableStatuses.map(status => (
          <button
            key={status}
            onClick={() => onStatusChange(task.id, status)}
            className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded transition capitalize"
          >
            {status === 'inprogress' ? 'Start' : status === 'done' ? 'Done' : 'Todo'}
          </button>
        ))}
      </div>
    </div>
  )
}

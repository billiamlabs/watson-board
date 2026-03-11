'use client'

import { Task, supabase } from '@/lib/supabase'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'

type Props = {
  task: Task
  projectName: string
  onStatusChange: (taskId: string, newStatus: Task['kanban_status']) => void
  isDragging?: boolean
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

export default function TaskCard({ task, projectName, onStatusChange, isDragging }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValues, setEditValues] = useState({
    text: task.text,
    zone: task.zone || ('rocks' as const),
    due: task.due || '',
    notes: task.notes || '',
  })

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const availableStatuses = statusButtons[task.kanban_status]

  const handleSave = async () => {
    try {
      await supabase
        .from('tasks')
        .update({
          text: editValues.text,
          zone: editValues.zone,
          due: editValues.due || null,
          notes: editValues.notes,
        })
        .eq('id', task.id)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving task:', error)
    }
  }

  const handleCancel = () => {
    setEditValues({
      text: task.text,
      zone: task.zone || 'rocks',
      due: task.due || '',
      notes: task.notes || '',
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="bg-slate-800 rounded p-3 border border-blue-500 shadow-lg">
        <div className="space-y-2">
          <input
            type="text"
            value={editValues.text}
            onChange={(e) => setEditValues(prev => ({ ...prev, text: e.target.value }))}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-400"
            placeholder="Task text"
          />
          
          <select
            value={editValues.zone}
            onChange={(e) => setEditValues(prev => ({ ...prev, zone: e.target.value as any }))}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-400"
          >
            <option value="">No Zone</option>
            <option value="rocks">Rocks</option>
            <option value="pebbles">Pebbles</option>
            <option value="sand">Sand</option>
          </select>

          <input
            type="date"
            value={editValues.due}
            onChange={(e) => setEditValues(prev => ({ ...prev, due: e.target.value }))}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-400"
          />

          <textarea
            value={editValues.notes}
            onChange={(e) => setEditValues(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-400 resize-none"
            rows={2}
            placeholder="Notes"
          />

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 text-xs px-2 py-1 bg-green-600 hover:bg-green-700 rounded transition"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-slate-800 rounded p-3 border border-slate-700 hover:border-slate-600 transition ${isDragging ? 'opacity-50' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <p className="text-sm font-medium flex-1">{task.text}</p>
        <button
          onClick={() => setIsEditing(true)}
          className="text-slate-400 hover:text-white transition text-xs"
          title="Edit task"
        >
          ✏️
        </button>
      </div>

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

'use client'

import { Project, supabase } from '@/lib/supabase'
import { useState } from 'react'

type Props = {
  project: Project
  onClose: () => void
  onUpdate: (project: Project) => void
}

export default function ProjectDetail({ project, onClose, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [values, setValues] = useState({
    name: project.name,
    description: project.description,
    status: project.status,
    next_action: project.next_action,
    priority_rank: project.priority_rank.toString(),
    color: project.color,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await supabase
        .from('projects')
        .update({
          name: values.name,
          description: values.description,
          status: values.status as any,
          next_action: values.next_action,
          priority_rank: parseInt(values.priority_rank),
          color: values.color,
        })
        .eq('id', project.id)
        .select()
        .single()

      if (data) {
        onUpdate(data)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error saving project:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async () => {
    if (!confirm('Archive this project?')) return

    try {
      const { data } = await supabase
        .from('projects')
        .update({ status: 'archived' })
        .eq('id', project.id)
        .select()
        .single()

      if (data) {
        onUpdate(data)
        onClose()
      }
    } catch (error) {
      console.error('Error archiving project:', error)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 h-screen w-full max-w-md bg-slate-900 border-l border-slate-700 z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold">{isEditing ? 'Edit' : 'Details'}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {isEditing ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={values.name}
                  onChange={(e) => setValues(v => ({ ...v, name: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={values.description}
                  onChange={(e) => setValues(v => ({ ...v, description: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-400 resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={values.status}
                  onChange={(e) => setValues(v => ({ ...v, status: e.target.value as 'active' | 'idle' | 'archived' }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="active">Active</option>
                  <option value="idle">Idle</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Next Action</label>
                <input
                  type="text"
                  value={values.next_action}
                  onChange={(e) => setValues(v => ({ ...v, next_action: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Priority Rank</label>
                <input
                  type="number"
                  value={values.priority_rank}
                  onChange={(e) => setValues(v => ({ ...v, priority_rank: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={values.color}
                    onChange={(e) => setValues(v => ({ ...v, color: e.target.value }))}
                    className="w-12 h-10 rounded border border-slate-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={values.color}
                    onChange={(e) => setValues(v => ({ ...v, color: e.target.value }))}
                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-400 text-sm"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Name</p>
                <p className="text-lg font-semibold">{values.name}</p>
              </div>

              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Status</p>
                <p className="text-sm capitalize">{values.status}</p>
              </div>

              {values.description && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Description</p>
                  <p className="text-sm text-slate-300">{values.description}</p>
                </div>
              )}

              {values.next_action && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Next Action</p>
                  <p className="text-sm text-blue-300">{values.next_action}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Priority</p>
                <p className="text-sm">{values.priority_rank}</p>
              </div>

              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Color</p>
                <div
                  className="w-8 h-8 rounded border border-slate-600"
                  style={{ backgroundColor: values.color }}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-6 space-y-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition"
              >
                Edit
              </button>
              <button
                onClick={handleArchive}
                className="w-full px-4 py-2 bg-red-900 hover:bg-red-800 rounded transition text-sm"
              >
                Archive
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

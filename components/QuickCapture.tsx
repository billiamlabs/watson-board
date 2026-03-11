'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function QuickCapture({ onTaskCreated }: { onTaskCreated?: () => void }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    setLoading(true)
    try {
      await supabase.from('tasks').insert([
        {
          text: input,
          kanban_status: 'todo',
          owner_id: '82890fd4-3c47-4274-ac80-32ab27032a95', // Billiam's UUID
        },
      ])
      setInput('')
      onTaskCreated?.()
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="sticky top-0 z-10 bg-slate-950 border-b border-slate-700 p-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Capture a task..."
          className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '...' : '+'}
        </button>
      </div>
    </form>
  )
}

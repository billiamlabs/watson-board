'use client'

import { useEffect, useState } from 'react'
import { supabase, type Project } from '@/lib/supabase'
import QuickCapture from '@/components/QuickCapture'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'idle' | 'archived'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', '82890fd4-3c47-4274-ac80-32ab27032a95')
        .order('priority_rank', { ascending: true })

      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter)

  return (
    <div className="min-h-screen bg-slate-950">
      <QuickCapture onTaskCreated={fetchProjects} />
      
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Projects</h1>

        <div className="flex gap-3 mb-6 border-b border-slate-700 pb-4">
          {(['all', 'active', 'idle', 'archived'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded capitalize transition ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-slate-400">No projects</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(project => (
              <div
                key={project.id}
                className="rounded-lg border border-slate-700 p-4 transition hover:border-slate-600"
                style={{ borderTopColor: project.color, borderTopWidth: '3px' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-lg font-semibold">{project.name}</h2>
                  <span className="text-xs px-2 py-1 bg-slate-800 rounded capitalize">
                    {project.status}
                  </span>
                </div>
                {project.description && (
                  <p className="text-sm text-slate-400 mb-3">{project.description}</p>
                )}
                {project.next_action && (
                  <p className="text-sm text-blue-300 mb-3">Next: {project.next_action}</p>
                )}
                <div className="text-xs text-slate-500">
                  Priority: {project.priority_rank}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

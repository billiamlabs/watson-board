'use client'

import { useEffect, useState } from 'react'
import { supabase, type Task } from '@/lib/supabase'
import QuickCapture from '@/components/QuickCapture'
import KanbanBoard from '@/components/KanbanBoard'

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [{ data: tasksData }, { data: projectsData }] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('owner_id', '82890fd4-3c47-4274-ac80-32ab27032a95')
          .order('created_at', { ascending: false }),
        supabase
          .from('projects')
          .select('id, name')
          .eq('owner_id', '82890fd4-3c47-4274-ac80-32ab27032a95'),
      ])

      setTasks(tasksData || [])
      
      const projectMap = (projectsData || []).reduce((acc, p) => {
        acc[p.id] = p.name
        return acc
      }, {} as Record<string, string>)
      setProjects(projectMap)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: Task['kanban_status']) => {
    try {
      await supabase
        .from('tasks')
        .update({ kanban_status: newStatus })
        .eq('id', taskId)

      setTasks(tasks.map(t => t.id === taskId ? { ...t, kanban_status: newStatus } : t))
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <QuickCapture onTaskCreated={fetchData} />
      
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Tasks</h1>

        {loading ? (
          <div className="text-center text-slate-400">Loading...</div>
        ) : (
          <KanbanBoard tasks={tasks} projects={projects} onStatusChange={handleStatusChange} />
        )}
      </div>
    </div>
  )
}

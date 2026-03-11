'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, type Task } from '@/lib/supabase'
import QuickCapture from '@/components/QuickCapture'
import KanbanBoard from '@/components/KanbanBoard'
import { RealtimeChannel } from '@supabase/supabase-js'

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const owner_id = '82890fd4-3c47-4274-ac80-32ab27032a95'

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
          .eq('owner_id', owner_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('projects')
          .select('id, name')
          .eq('owner_id', owner_id),
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

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `owner_id=eq.${owner_id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks(prev => [payload.new as Task, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new as Task : t))
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const handleStatusChange = useCallback(async (taskId: string, newStatus: Task['kanban_status']) => {
    // Optimistic update
    setTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, kanban_status: newStatus } : t))

    try {
      await supabase
        .from('tasks')
        .update({ kanban_status: newStatus })
        .eq('id', taskId)
    } catch (error) {
      console.error('Error updating task:', error)
      // Revert on error - will be corrected by real-time subscription
    }
  }, [])

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

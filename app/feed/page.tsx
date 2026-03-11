'use client'

import { useEffect, useState } from 'react'
import { supabase, type Task } from '@/lib/supabase'
import QuickCapture from '@/components/QuickCapture'

export default function FeedPage() {
  const [activities, setActivities] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('owner_id', '82890fd4-3c47-4274-ac80-32ab27032a95')
        .order('updated_at', { ascending: false })
        .limit(50)

      setActivities(data || [])
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <QuickCapture onTaskCreated={fetchActivities} />
      
      <div className="p-6 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Activity Feed</h1>

        {loading ? (
          <div className="text-center text-slate-400">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="text-center text-slate-400">No activities</div>
        ) : (
          <div className="space-y-4">
            {activities.map(task => (
              <div key={task.id} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{task.text}</h3>
                  <span className="text-xs text-slate-400">
                    {new Date(task.updated_at).toLocaleDateString()} at{' '}
                    {new Date(task.updated_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-xs bg-slate-800 px-2 py-1 rounded">
                    Status: {task.kanban_status}
                  </span>
                  {task.project && (
                    <span className="text-xs bg-slate-800 px-2 py-1 rounded">
                      {task.project}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

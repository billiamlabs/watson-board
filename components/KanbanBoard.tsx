'use client'

import { Task } from '@/lib/supabase'
import TaskCard from './TaskCard'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useState } from 'react'

type Props = {
  tasks: Task[]
  projects: Record<string, string>
  onStatusChange: (taskId: string, newStatus: Task['kanban_status']) => void
}

export default function KanbanBoard({ tasks, projects, onStatusChange }: Props) {
  const columns = ['todo', 'inprogress', 'done'] as const
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const getTasksForStatus = (status: Task['kanban_status']) => {
    return tasks.filter(t => t.kanban_status === status)
  }

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeTask = tasks.find(t => t.id === active.id)
    if (!activeTask) return

    // Get the task that we're over (if any)
    const overTask = tasks.find(t => t.id === over.id)
    
    if (overTask && activeTask.kanban_status !== overTask.kanban_status) {
      // Dragged over a task in a different column
      onStatusChange(activeTask.id, overTask.kanban_status)
    }
  }

  const handleDragEnd = () => {
    setActiveId(null)
  }

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(status => {
          const columnTasks = getTasksForStatus(status)
          return (
            <SortableContext
              key={status}
              items={columnTasks.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div 
                className="bg-slate-900 rounded-lg p-4 min-h-96 flex flex-col"
                data-status={status}
              >
                <h2 className="font-bold text-lg mb-4 capitalize flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  {status === 'todo' && 'To Do'}
                  {status === 'inprogress' && 'In Progress'}
                  {status === 'done' && 'Done'}
                </h2>

                <div className="space-y-3 flex-1">
                  {columnTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      projectName={projects[task.id] || task.project}
                      onStatusChange={onStatusChange}
                      isDragging={activeId === task.id}
                    />
                  ))}
                </div>

                {columnTasks.length === 0 && (
                  <div className="text-slate-500 text-sm text-center py-8">No tasks</div>
                )}
              </div>
            </SortableContext>
          )
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="bg-slate-800 rounded p-3 border border-blue-500 opacity-90 shadow-lg max-w-xs">
            <p className="text-sm font-medium">{activeTask.text}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

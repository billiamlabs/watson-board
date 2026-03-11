import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Project = {
  id: string
  owner_id: string
  name: string
  description: string
  color: string
  status: 'active' | 'archived' | 'idle'
  next_action: string
  priority_rank: number
  created_at: string
  updated_at: string
}

export type Task = {
  id: string
  owner_id: string
  text: string
  notes: string
  project: string
  due: string | null
  sprints: number | null
  value: string | null
  zone: 'rocks' | 'pebbles' | 'sand' | null
  kanban_status: 'todo' | 'inprogress' | 'done'
  predecessor_id: string | null
  created_at: string
  updated_at: string
}

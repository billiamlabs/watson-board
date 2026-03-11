'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  GatewayClient,
  type GatewayConnectionState,
  type CronJob,
  type CronJobCreate,
} from '@/lib/gateway'

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_WS_URL || 'wss://raspberrypi.tail543551.ts.net'
const GATEWAY_TOKEN = process.env.NEXT_PUBLIC_GATEWAY_TOKEN || ''

function formatSchedule(job: CronJob): string {
  const s = job.schedule
  if (s.kind === 'at') {
    const d = new Date(s.at)
    return `Once at ${d.toLocaleString()}`
  }
  if (s.kind === 'every') {
    const ms = s.everyMs
    if (ms < 60000) return `Every ${ms / 1000}s`
    if (ms < 3600000) return `Every ${ms / 60000}m`
    if (ms < 86400000) return `Every ${ms / 3600000}h`
    return `Every ${ms / 86400000}d`
  }
  if (s.kind === 'cron') {
    return `Cron: ${s.expr}${s.tz ? ` (${s.tz})` : ''}`
  }
  return 'Unknown'
}

function formatRelativeTime(ms: number | null | undefined): string {
  if (!ms) return '—'
  const diff = ms - Date.now()
  const abs = Math.abs(diff)
  const future = diff > 0

  if (abs < 60000) return future ? 'in <1m' : '<1m ago'
  if (abs < 3600000) {
    const mins = Math.round(abs / 60000)
    return future ? `in ${mins}m` : `${mins}m ago`
  }
  if (abs < 86400000) {
    const hrs = Math.round(abs / 3600000)
    return future ? `in ${hrs}h` : `${hrs}h ago`
  }
  const days = Math.round(abs / 86400000)
  return future ? `in ${days}d` : `${days}d ago`
}

function formatPayload(job: CronJob): string {
  const p = job.payload
  if (p.kind === 'systemEvent') return p.text
  if (p.kind === 'agentTurn') return p.message
  return ''
}

function PayloadBadge({ kind }: { kind: string }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded font-mono ${
        kind === 'agentTurn'
          ? 'bg-violet-900 text-violet-300'
          : 'bg-slate-700 text-slate-300'
      }`}
    >
      {kind === 'agentTurn' ? 'agent' : 'event'}
    </span>
  )
}

function SessionBadge({ target }: { target: string }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded ${
        target === 'isolated'
          ? 'bg-blue-900 text-blue-300'
          : 'bg-amber-900 text-amber-300'
      }`}
    >
      {target}
    </span>
  )
}

type AddJobForm = {
  name: string
  scheduleKind: 'at' | 'every' | 'cron'
  atValue: string
  everyAmount: string
  everyUnit: 'minutes' | 'hours' | 'days'
  cronExpr: string
  cronTz: string
  payloadKind: 'systemEvent' | 'agentTurn'
  message: string
  sessionTarget: 'main' | 'isolated'
  deliveryMode: 'none' | 'announce'
}

const defaultForm: AddJobForm = {
  name: '',
  scheduleKind: 'every',
  atValue: '',
  everyAmount: '2',
  everyUnit: 'hours',
  cronExpr: '0 9 * * *',
  cronTz: 'America/Regina',
  payloadKind: 'agentTurn',
  message: '',
  sessionTarget: 'isolated',
  deliveryMode: 'announce',
}

function buildJobCreate(form: AddJobForm): CronJobCreate {
  let schedule: CronJobCreate['schedule']
  if (form.scheduleKind === 'at') {
    schedule = { kind: 'at', at: new Date(form.atValue).toISOString() }
  } else if (form.scheduleKind === 'every') {
    const amount = parseFloat(form.everyAmount) || 1
    const unitMs = form.everyUnit === 'minutes' ? 60000 : form.everyUnit === 'hours' ? 3600000 : 86400000
    schedule = { kind: 'every', everyMs: amount * unitMs }
  } else {
    schedule = { kind: 'cron', expr: form.cronExpr, tz: form.cronTz || undefined }
  }

  const payload: CronJobCreate['payload'] =
    form.payloadKind === 'agentTurn'
      ? { kind: 'agentTurn', message: form.message }
      : { kind: 'systemEvent', text: form.message }

  const delivery: CronJobCreate['delivery'] =
    form.deliveryMode === 'none' ? { mode: 'none' } : { mode: 'announce' }

  return {
    name: form.name || undefined,
    schedule,
    payload,
    delivery,
    sessionTarget: form.sessionTarget,
    enabled: true,
  }
}

export default function CronPage() {
  const [connState, setConnState] = useState<GatewayConnectionState>('disconnected')
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [schedulerEnabled, setSchedulerEnabled] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<AddJobForm>(defaultForm)
  const [addLoading, setAddLoading] = useState(false)
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set())
  const [deletingJobs, setDeletingJobs] = useState<Set<string>>(new Set())
  const clientRef = useRef<GatewayClient | null>(null)

  const loadJobs = useCallback(async () => {
    const client = clientRef.current
    if (!client || client.state !== 'connected') return
    setLoading(true)
    setError(null)
    try {
      const [jobList, status] = await Promise.all([
        client.cronList(true),
        client.cronStatus(),
      ])
      setJobs(jobList)
      setSchedulerEnabled(status.enabled)
    } catch (e) {
      setError('Failed to load jobs: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const client = new GatewayClient(GATEWAY_URL, GATEWAY_TOKEN, setConnState)
    clientRef.current = client

    client.connect().then((ok) => {
      if (ok) {
        loadJobs()
      } else {
        setError(
          'Could not connect to gateway. Make sure you are on the Tailscale network and the gateway is running.'
        )
      }
    })

    return () => {
      client.disconnect()
    }
  }, [loadJobs])

  const handleToggle = async (job: CronJob) => {
    const client = clientRef.current
    if (!client) return
    try {
      await client.cronUpdate(job.id, { enabled: !job.enabled })
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, enabled: !j.enabled } : j)))
    } catch (e) {
      setError('Toggle failed: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  const handleRunNow = async (job: CronJob) => {
    const client = clientRef.current
    if (!client) return
    setRunningJobs((prev) => new Set(prev).add(job.id))
    try {
      await client.cronRun(job.id, 'force')
      // Brief feedback then reload
      setTimeout(() => {
        setRunningJobs((prev) => {
          const next = new Set(prev)
          next.delete(job.id)
          return next
        })
        loadJobs()
      }, 1500)
    } catch (e) {
      setRunningJobs((prev) => {
        const next = new Set(prev)
        next.delete(job.id)
        return next
      })
      setError('Run failed: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  const handleDelete = async (job: CronJob) => {
    if (!confirm(`Delete job "${job.name || formatPayload(job).slice(0, 40)}"?`)) return
    const client = clientRef.current
    if (!client) return
    setDeletingJobs((prev) => new Set(prev).add(job.id))
    try {
      await client.cronRemove(job.id)
      setJobs((prev) => prev.filter((j) => j.id !== job.id))
    } catch (e) {
      setError('Delete failed: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setDeletingJobs((prev) => {
        const next = new Set(prev)
        next.delete(job.id)
        return next
      })
    }
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const client = clientRef.current
    if (!client) return
    if (!addForm.message.trim()) {
      setError('Message is required')
      return
    }
    setAddLoading(true)
    setError(null)
    try {
      const newJob = await client.cronAdd(buildJobCreate(addForm))
      setJobs((prev) => [newJob, ...prev])
      setShowAddForm(false)
      setAddForm(defaultForm)
    } catch (e) {
      setError('Failed to add job: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setAddLoading(false)
    }
  }

  const connColor = {
    disconnected: 'bg-slate-500',
    connecting: 'bg-yellow-500 animate-pulse',
    connected: 'bg-green-500',
    error: 'bg-red-500',
  }[connState]

  const enabledJobs = jobs.filter((j) => j.enabled)
  const disabledJobs = jobs.filter((j) => !j.enabled)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Cron Manager</h1>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className={`w-2 h-2 rounded-full ${connColor}`} />
            <span className="capitalize">{connState}</span>
            {schedulerEnabled !== null && (
              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${schedulerEnabled ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                scheduler {schedulerEnabled ? 'on' : 'off'}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadJobs}
            disabled={connState !== 'connected' || loading}
            className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-40 transition"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            disabled={connState !== 'connected'}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 rounded disabled:opacity-40 transition"
          >
            + Add Job
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-200">✕</button>
        </div>
      )}

      {/* Connection error state */}
      {connState === 'error' && (
        <div className="mb-6 p-4 bg-slate-800 border border-slate-600 rounded-lg text-slate-400 text-sm space-y-2">
          <p className="font-medium text-white">Cannot reach the OpenClaw gateway.</p>
          <p>Make sure:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Your device is connected to Tailscale</li>
            <li>The Pi is online and OpenClaw is running</li>
            <li>Gateway env vars are set correctly in Vercel</li>
          </ul>
          <p className="text-xs mt-2">Gateway URL: <code className="bg-slate-700 px-1 rounded">{GATEWAY_URL}</code></p>
        </div>
      )}

      {/* Add Job Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="mb-6 p-4 bg-slate-800 border border-slate-700 rounded-lg space-y-4"
        >
          <h2 className="font-semibold text-lg">New Cron Job</h2>

          {/* Name */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Name (optional)</label>
            <input
              type="text"
              value={addForm.name}
              onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Morning briefing"
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Message / Prompt *</label>
            <textarea
              value={addForm.message}
              onChange={(e) => setAddForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="What should Watson do when this fires?"
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
              required
            />
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Schedule</label>
            <div className="flex gap-2 flex-wrap">
              {(['at', 'every', 'cron'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setAddForm((f) => ({ ...f, scheduleKind: k }))}
                  className={`px-3 py-1.5 rounded text-sm transition ${
                    addForm.scheduleKind === k
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {k === 'at' ? 'One-shot' : k === 'every' ? 'Recurring' : 'Cron'}
                </button>
              ))}
            </div>

            <div className="mt-3">
              {addForm.scheduleKind === 'at' && (
                <input
                  type="datetime-local"
                  value={addForm.atValue}
                  onChange={(e) => setAddForm((f) => ({ ...f, atValue: e.target.value }))}
                  className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              )}
              {addForm.scheduleKind === 'every' && (
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-slate-400">Every</span>
                  <input
                    type="number"
                    min="1"
                    value={addForm.everyAmount}
                    onChange={(e) => setAddForm((f) => ({ ...f, everyAmount: e.target.value }))}
                    className="w-20 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <select
                    value={addForm.everyUnit}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        everyUnit: e.target.value as AddJobForm['everyUnit'],
                      }))
                    }
                    className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="minutes">minutes</option>
                    <option value="hours">hours</option>
                    <option value="days">days</option>
                  </select>
                </div>
              )}
              {addForm.scheduleKind === 'cron' && (
                <div className="flex gap-2 flex-wrap items-center">
                  <input
                    type="text"
                    value={addForm.cronExpr}
                    onChange={(e) => setAddForm((f) => ({ ...f, cronExpr: e.target.value }))}
                    placeholder="0 9 * * *"
                    className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={addForm.cronTz}
                    onChange={(e) => setAddForm((f) => ({ ...f, cronTz: e.target.value }))}
                    placeholder="America/Regina"
                    className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Options row */}
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Type</label>
              <select
                value={addForm.payloadKind}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, payloadKind: e.target.value as AddJobForm['payloadKind'] }))
                }
                className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="agentTurn">Agent Turn (isolated)</option>
                <option value="systemEvent">System Event (main)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Session</label>
              <select
                value={addForm.sessionTarget}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, sessionTarget: e.target.value as AddJobForm['sessionTarget'] }))
                }
                className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="isolated">Isolated</option>
                <option value="main">Main</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Delivery</label>
              <select
                value={addForm.deliveryMode}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, deliveryMode: e.target.value as AddJobForm['deliveryMode'] }))
                }
                className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="announce">Announce</option>
                <option value="none">None (silent)</option>
              </select>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={addLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium disabled:opacity-50 transition"
            >
              {addLoading ? 'Adding…' : 'Add Job'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setAddForm(defaultForm)
              }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Jobs list */}
      {connState === 'connected' && !loading && jobs.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg mb-2">No cron jobs yet</p>
          <p className="text-sm">Click &ldquo;+ Add Job&rdquo; to create your first scheduled task.</p>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="space-y-6">
          {/* Active jobs */}
          {enabledJobs.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Active ({enabledJobs.length})
              </h2>
              <div className="space-y-2">
                {enabledJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    running={runningJobs.has(job.id)}
                    deleting={deletingJobs.has(job.id)}
                    onToggle={handleToggle}
                    onRun={handleRunNow}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Disabled jobs */}
          {disabledJobs.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Disabled ({disabledJobs.length})
              </h2>
              <div className="space-y-2 opacity-60">
                {disabledJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    running={runningJobs.has(job.id)}
                    deleting={deletingJobs.has(job.id)}
                    onToggle={handleToggle}
                    onRun={handleRunNow}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function JobCard({
  job,
  running,
  deleting,
  onToggle,
  onRun,
  onDelete,
}: {
  job: CronJob
  running: boolean
  deleting: boolean
  onToggle: (job: CronJob) => void
  onRun: (job: CronJob) => void
  onDelete: (job: CronJob) => void
}) {
  const payloadText = formatPayload(job)

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        {/* Left: content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {job.name && <span className="font-medium text-white">{job.name}</span>}
            <PayloadBadge kind={job.payload.kind} />
            <SessionBadge target={job.sessionTarget} />
          </div>
          <p className="text-sm text-slate-300 truncate mb-2">{payloadText}</p>
          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
            <span className="text-slate-400 font-mono">{formatSchedule(job)}</span>
            {job.nextRunAtMs && (
              <span>Next: <span className="text-slate-300">{formatRelativeTime(job.nextRunAtMs)}</span></span>
            )}
            {job.lastRunAtMs && (
              <span>
                Last:{' '}
                <span className={job.lastRunOk === false ? 'text-red-400' : 'text-slate-300'}>
                  {formatRelativeTime(job.lastRunAtMs)}
                  {job.lastRunOk === false && ' ✗'}
                </span>
              </span>
            )}
            {job.runCount !== undefined && job.runCount > 0 && (
              <span>{job.runCount}× run</span>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Run now */}
          <button
            onClick={() => onRun(job)}
            disabled={running}
            title="Run now"
            className="p-1.5 rounded bg-slate-700 hover:bg-green-800 text-slate-400 hover:text-green-300 disabled:opacity-40 transition text-sm"
          >
            {running ? '⏳' : '▶'}
          </button>

          {/* Toggle */}
          <button
            onClick={() => onToggle(job)}
            title={job.enabled ? 'Disable' : 'Enable'}
            className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition text-sm"
          >
            {job.enabled ? '⏸' : '▶▶'}
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(job)}
            disabled={deleting}
            title="Delete"
            className="p-1.5 rounded bg-slate-700 hover:bg-red-900 text-slate-400 hover:text-red-400 disabled:opacity-40 transition text-sm"
          >
            {deleting ? '…' : '✕'}
          </button>
        </div>
      </div>
    </div>
  )
}

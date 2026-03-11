// OpenClaw Gateway WebSocket client
// Connects to the local gateway via Tailscale and speaks the OpenClaw protocol

export type CronSchedule =
  | { kind: 'at'; at: string }
  | { kind: 'every'; everyMs: number; anchorMs?: number }
  | { kind: 'cron'; expr: string; tz?: string }

export type CronPayload =
  | { kind: 'systemEvent'; text: string }
  | { kind: 'agentTurn'; message: string; model?: string; timeoutSeconds?: number }

export type CronDelivery =
  | { mode: 'none' }
  | { mode: 'announce'; channel?: string; to?: string }
  | { mode: 'webhook'; to: string }

export type CronJob = {
  id: string
  name?: string
  enabled: boolean
  schedule: CronSchedule
  payload: CronPayload
  delivery?: CronDelivery
  sessionTarget: 'main' | 'isolated'
  createdAt?: string
  updatedAt?: string
  lastRunAtMs?: number
  nextRunAtMs?: number
  lastRunOk?: boolean
  runCount?: number
}

export type CronJobCreate = {
  name?: string
  schedule: CronSchedule
  payload: CronPayload
  delivery?: CronDelivery
  sessionTarget: 'main' | 'isolated'
  enabled?: boolean
}

export type GatewayConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (err: Error) => void
}

export class GatewayClient {
  private ws: WebSocket | null = null
  private pending = new Map<string, PendingRequest>()
  private reqCounter = 0
  private url: string
  private token: string
  private onStateChange: (state: GatewayConnectionState) => void
  private _state: GatewayConnectionState = 'disconnected'
  private connectResolve: ((ok: boolean) => void) | null = null

  constructor(
    url: string,
    token: string,
    onStateChange: (state: GatewayConnectionState) => void
  ) {
    this.url = url
    this.token = token
    this.onStateChange = onStateChange
  }

  private setState(s: GatewayConnectionState) {
    this._state = s
    this.onStateChange(s)
  }

  get state() {
    return this._state
  }

  connect(): Promise<boolean> {
    return new Promise((resolve) => {
      this.connectResolve = resolve
      this.setState('connecting')

      try {
        this.ws = new WebSocket(this.url)
      } catch {
        this.setState('error')
        resolve(false)
        return
      }

      this.ws.onopen = () => {
        // Send connect frame
        const connectFrame = {
          type: 'req',
          id: 'connect-' + Date.now(),
          method: 'connect',
          params: {
            minProtocol: 1,
            maxProtocol: 10,
            client: {
              id: 'cli',
              version: '1.0.0',
              mode: 'cli',
              platform: 'browser',
            },
            auth: { token: this.token },
          },
        }
        this.ws!.send(JSON.stringify(connectFrame))
      }

      this.ws.onmessage = (event) => {
        try {
          const frame = JSON.parse(event.data as string)
          this.handleFrame(frame)
        } catch {
          // ignore parse errors
        }
      }

      this.ws.onerror = () => {
        this.setState('error')
        if (this.connectResolve) {
          this.connectResolve(false)
          this.connectResolve = null
        }
        // Reject all pending requests
        this.pending.forEach((p) => p.reject(new Error('WebSocket error')))
        this.pending.clear()
      }

      this.ws.onclose = () => {
        if (this._state !== 'error') {
          this.setState('disconnected')
        }
        if (this.connectResolve) {
          this.connectResolve(false)
          this.connectResolve = null
        }
        // Reject all pending requests
        this.pending.forEach((p) => p.reject(new Error('WebSocket closed')))
        this.pending.clear()
      }
    })
  }

  private handleFrame(frame: { type: string; id?: string; ok?: boolean; payload?: unknown; method?: string }) {
    if (frame.type === 'res' && frame.id) {
      // Check if this is the connect response
      if (frame.id.startsWith('connect-')) {
        if (frame.ok) {
          this.setState('connected')
        } else {
          this.setState('error')
        }
        if (this.connectResolve) {
          this.connectResolve(!!frame.ok)
          this.connectResolve = null
        }
        return
      }

      const pending = this.pending.get(frame.id)
      if (pending) {
        this.pending.delete(frame.id)
        if (frame.ok) {
          pending.resolve(frame.payload)
        } else {
          pending.reject(new Error('Gateway request failed: ' + JSON.stringify(frame)))
        }
      }
    }
    // Ignore event frames (type === 'event')
  }

  async request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.ws || this._state !== 'connected') {
      throw new Error('Not connected to gateway')
    }

    const id = `req-${++this.reqCounter}-${Date.now()}`
    const frame = { type: 'req', id, method, params: params ?? {} }

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      })
      this.ws!.send(JSON.stringify(frame))
      // Timeout after 10s
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          reject(new Error(`Request timeout: ${method}`))
        }
      }, 10000)
    })
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
    this.setState('disconnected')
  }

  // Cron helpers
  async cronList(includeDisabled = false): Promise<CronJob[]> {
    const result = await this.request<{ jobs: CronJob[] } | CronJob[]>('cron.list', { includeDisabled })
    // Handle both array response and {jobs: [...]} response
    if (Array.isArray(result)) return result
    if (result && typeof result === 'object' && 'jobs' in result) return result.jobs
    return result as CronJob[]
  }

  async cronStatus(): Promise<{ enabled: boolean; jobs: number; nextWakeAtMs: number | null }> {
    return this.request('cron.status', {})
  }

  async cronAdd(job: CronJobCreate): Promise<CronJob> {
    return this.request('cron.add', job)
  }

  async cronRemove(id: string): Promise<{ ok: boolean; removed: boolean }> {
    return this.request('cron.remove', { id })
  }

  async cronRun(id: string, mode: 'due' | 'force' = 'force'): Promise<{ ok: boolean }> {
    return this.request('cron.run', { id, mode })
  }

  async cronUpdate(id: string, patch: Partial<CronJobCreate> & { enabled?: boolean }): Promise<CronJob> {
    return this.request('cron.update', { id, ...patch })
  }
}

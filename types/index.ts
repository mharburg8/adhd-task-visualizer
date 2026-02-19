export type TaskStatus = 'active' | 'archived' | 'deleted'

export interface Task {
  id: string
  user_id: string
  name: string
  details: string | null
  due_date: string | null   // ISO date string 'YYYY-MM-DD'
  for_later: boolean
  status: TaskStatus
  created_at: string        // ISO timestamp
  archived_at: string | null
  google_event_id: string | null
}

export interface Settings {
  id: string
  user_id: string
  expiration_days: number
  date_format: 'MM/DD/YYYY' | 'DD/MM/YYYY'
  google_calendar_enabled: boolean
}

export type UrgencyLevel =
  | 'overdue'
  | 'tomorrow'
  | 'soon'
  | 'upcoming'
  | 'future'
  | 'for_later'
  | 'no_date'

export interface UrgencyInfo {
  level: UrgencyLevel
  score: number             // 0.0–1.0
  daysRemaining: number | null
  color: string             // CSS var reference e.g. 'var(--color-overdue)'
  diameter: number          // px
  ringProgress: number      // 0.0–1.0 (1 = full ring, 0 = gone)
}

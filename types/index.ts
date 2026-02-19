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
  board_id: string | null
}

export interface Board {
  id: string
  user_id: string
  name: string
  created_at: string
}

export type UrgencyLevel =
  | 'overdue'
  | 'red_2'      // Due today
  | 'red_1'      // 1–2 days
  | 'orange_2'   // 3–4 days
  | 'orange_1'   // 5–6 days
  | 'yellow_2'   // 7–9 days
  | 'yellow_1'   // 10–13 days
  | 'green_3'    // 14–20 days
  | 'green_2'    // 21–29 days
  | 'green_1'    // 30+ days
  | 'for_later'
  | 'no_date'

export interface UrgencyInfo {
  level: UrgencyLevel
  score: number             // 0.0–1.0 (sizePct)
  daysRemaining: number | null
  color: string             // hex fill color
  borderColor: string       // hex border/ring color
  textColor: string         // hex text color for content inside bubble
  diameter: number          // px
  ringProgress: number      // 0.0–1.0 (1 = full ring, 0 = gone)
}

export type CustomUrgencyColors = Record<
  UrgencyLevel,
  { fill: string; border: string; text: string }
>

export interface Settings {
  id: string
  user_id: string
  expiration_days: number
  date_format: 'MM/DD/YYYY' | 'DD/MM/YYYY'
  google_calendar_enabled: boolean
  theme: 'light' | 'dark'
  default_view: 'bubble' | 'list'
  voice_enabled: boolean
  urgency_color_scheme: 'green_urgent' | 'red_urgent' | 'electric_green' | 'custom'
  custom_urgency_colors: CustomUrgencyColors | null
}

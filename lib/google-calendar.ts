const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Failed to refresh Google token')
  return data.access_token
}

async function calendarFetch(
  path: string,
  options: RequestInit,
  accessToken: string,
  refreshToken: string,
  retry = true,
): Promise<Response> {
  const res = await fetch(`${CALENDAR_API}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })
  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken(refreshToken)
    return calendarFetch(path, options, newToken, refreshToken, false)
  }
  return res
}

export async function createCalendarEvent({
  accessToken,
  refreshToken,
  name,
  dueDate,
  details,
}: {
  accessToken: string
  refreshToken: string
  name: string
  dueDate: string
  details: string | null
}): Promise<string> {
  const body = JSON.stringify({
    summary: name,
    description: details ?? undefined,
    start: { date: dueDate },
    end: { date: dueDate },
  })
  const res = await calendarFetch('/calendars/primary/events', { method: 'POST', body }, accessToken, refreshToken)
  if (!res.ok) throw new Error(`Google Calendar error: ${res.status}`)
  const data = await res.json()
  return data.id as string
}

export async function updateCalendarEvent({
  accessToken,
  refreshToken,
  eventId,
  name,
  dueDate,
  details,
}: {
  accessToken: string
  refreshToken: string
  eventId: string
  name: string
  dueDate: string
  details: string | null
}): Promise<void> {
  const body = JSON.stringify({
    summary: name,
    description: details ?? undefined,
    start: { date: dueDate },
    end: { date: dueDate },
  })
  await calendarFetch(`/calendars/primary/events/${eventId}`, { method: 'PATCH', body }, accessToken, refreshToken)
}

export async function deleteCalendarEvent({
  accessToken,
  refreshToken,
  eventId,
}: {
  accessToken: string
  refreshToken: string
  eventId: string
}): Promise<void> {
  await calendarFetch(`/calendars/primary/events/${eventId}`, { method: 'DELETE' }, accessToken, refreshToken)
}

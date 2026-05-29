import type { CalendarEvent } from './types'

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatTime12h(isoStr: string): string {
  const date = new Date(isoStr)
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`
}

export function getEventStatus(event: { startDate: string; endDate: string }, today: Date = new Date()): 'upcoming' | 'in-progress' | 'completed' {
  const start = new Date(event.startDate)
  const end = new Date(event.endDate)

  if (today < start) {
    return 'upcoming'
  }

  if (today >= start && today <= end) {
    return 'in-progress'
  }

  return 'completed'
}

export function updateEventStatus(event: CalendarEvent): CalendarEvent {
  const status = getEventStatus(event)
  if (status !== event.status) {
    return { ...event, status }
  }
  return event
}

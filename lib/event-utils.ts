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

export function getCurrentTime(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function formatTime12h(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`
}

export function isEventCompleted(event: CalendarEvent): boolean {
  const now = new Date()
  const today = getLocalDateString(now)
  const currentTime = getCurrentTime()

  if (event.date < today) {
    return true
  }

  if (event.date === today && event.endTime <= currentTime) {
    return true
  }

  return false
}

export function isEventInProgress(event: CalendarEvent): boolean {
  const now = new Date()
  const today = getLocalDateString(now)
  const currentTime = getCurrentTime()

  return event.date === today && event.startTime <= currentTime && currentTime < event.endTime
}

export function updateEventStatus(event: CalendarEvent): CalendarEvent {
  if (isEventCompleted(event)) {
    return { ...event, status: 'completed' }
  }

  if (isEventInProgress(event)) {
    return { ...event, status: 'in-progress' }
  }

  return { ...event, status: 'upcoming' }
}

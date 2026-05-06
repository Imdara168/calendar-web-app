'use client'

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths
} from 'date-fns'
import type { CalendarEvent } from '@/lib/types'
import { getLocalDateString } from '@/lib/event-utils'

interface CalendarGridProps {
  currentDate: Date
  selectedDate: Date
  events: CalendarEvent[]
  onSelectDate: (date: Date) => void
  onChangeMonth: (date: Date) => void
}

export function CalendarGrid({ 
  currentDate, 
  selectedDate, 
  events, 
  onSelectDate, 
  onChangeMonth 
}: CalendarGridProps) {
  const today = useMemo(() => new Date(), [])
  
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    const dateStr = getLocalDateString(day)
    return events.filter(e => e.date === dateStr)
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="bg-card border border-border rounded-xl p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChangeMonth(subMonths(currentDate, 1))}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={() => {
              const todayDate = new Date()
              onChangeMonth(todayDate)
              onSelectDate(todayDate)
            }}
            className="px-3 py-1.5 text-sm font-medium hover:bg-muted rounded-lg transition-colors text-foreground"
          >
            Today
          </button>
          <button
            onClick={() => onChangeMonth(addMonths(currentDate, 1))}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map(day => (
          <div 
            key={day} 
            className="text-center text-sm font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map(day => {
          const dayEvents = getEventsForDay(day)
          const isToday = isSameDay(day, today)
          const isSelected = isSameDay(day, selectedDate)
          const isCurrentMonth = isSameMonth(day, currentDate)
          
          const hasCompleted = dayEvents.some(e => e.status === 'completed')
          const hasUpcoming = dayEvents.some(e => e.status === 'upcoming' || e.status === 'in-progress')

          return (
            <button
              key={day.toISOString()}
              onClick={() => {
                onSelectDate(day)
                onChangeMonth(day)
              }}
              className={`
                relative aspect-square p-1 rounded-lg transition-all
                flex flex-col items-center justify-center
                ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'}
                ${isToday && !isSelected ? 'bg-neutral-200 dark:bg-neutral-700 font-bold' : ''}
                ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
              `}
            >
              <span className={`text-sm ${isToday ? 'font-bold' : ''}`}>
                {format(day, 'd')}
              </span>
              
              {/* Event indicators */}
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {hasUpcoming && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-blue-500'}`} />
                  )}
                  {hasCompleted && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary-foreground/60' : 'bg-green-500'}`} />
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs text-muted-foreground">Upcoming</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs text-muted-foreground">Completed</span>
        </div>
      </div>
    </div>
  )
}

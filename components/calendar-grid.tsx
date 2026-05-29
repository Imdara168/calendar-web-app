'use client'

import { useMemo } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  Play,
  CheckCircle2
} from 'lucide-react'
import { 
  startOfMonth, 
  startOfWeek, 
  format, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  addDays
} from 'date-fns'
import type { CalendarEvent } from '@/lib/types'
import { getLocalDateString } from '@/lib/event-utils'

interface CalendarGridProps {
  currentDate: Date
  selectedDate: Date
  events: CalendarEvent[]
  onSelectDate: (date: Date) => void
  onChangeMonth: (date: Date) => void
  activeFilter: 'all' | 'upcoming' | 'in-progress' | 'completed' | null
  onFilterChange: (filter: 'all' | 'upcoming' | 'in-progress' | 'completed') => void
}

export function CalendarGrid({ 
  currentDate, 
  selectedDate, 
  events, 
  onSelectDate, 
  onChangeMonth,
  activeFilter,
  onFilterChange
}: CalendarGridProps) {
  const today = useMemo(() => new Date(), [])
  
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    
    // Always generate exactly 42 days (6 weeks) starting from the calendar start
    return Array.from({ length: 42 }, (_, i) => addDays(calendarStart, i))
  }, [currentDate])

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>()

    for (const event of events) {
      if (!event.startDate) continue
      const dateKey = event.startDate.slice(0, 10)
      const existing = grouped.get(dateKey)
      if (existing) {
        existing.push(event)
      } else {
        grouped.set(dateKey, [event])
      }
    }

    return grouped
  }, [events])

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-5 sm:gap-7">
      {/* Header - Month & Year Navigation */}
      <div className="flex shrink-0 items-center justify-between gap-3 px-1 sm:px-2">
        <div className="flex flex-col">
          <h2 className="text-xl font-black leading-none tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <span className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:mt-2 sm:text-[10px]">
            Executive Officer Portal
          </span>
        </div>
        
        <div className="flex items-center gap-1 rounded-2xl border border-slate-200/60 bg-white p-1 shadow-sm sm:gap-1.5 sm:p-1.5">
          <button
            onClick={() => onChangeMonth(subMonths(currentDate, 1))}
            className="rounded-xl p-2 text-slate-400 transition-all duration-200 hover:bg-slate-50 hover:text-primary sm:p-2.5"
            aria-label="Go to previous month"
          >
            <ChevronLeft className="size-4 sm:size-5" />
          </button>
          <div className="h-5 w-[1px] bg-slate-100 sm:h-6" />
          <button
            onClick={() => {
              onSelectDate(today)
              onChangeMonth(today)
            }}
            className="rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 transition-all duration-200 hover:bg-slate-50 hover:text-primary sm:px-4 sm:py-2.5 sm:text-[11px]"
            aria-label="Go to current date"
          >
            Today
          </button>
          <div className="h-5 w-[1px] bg-slate-100 sm:h-6" />
          <button
            onClick={() => onChangeMonth(addMonths(currentDate, 1))}
            className="rounded-xl p-2 text-slate-400 transition-all duration-200 hover:bg-slate-50 hover:text-primary sm:p-2.5"
            aria-label="Go to next month"
          >
            <ChevronRight className="size-4 sm:size-5" />
          </button>
        </div>
      </div>

      {/* Filter Toolbar Section */}
      <div className="flex shrink-0 items-center justify-between rounded-[22px] border border-slate-200/60 bg-white p-2 shadow-soft transition-all duration-300 sm:p-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* All Events Filter */}
          <button
            onClick={() => onFilterChange('all')}
            className={`group flex items-center gap-2.5 rounded-full px-5 py-2 transition-all duration-300 ${
              activeFilter === 'all'
                ? 'border-rose-500 bg-rose-50/30 text-rose-500 ring-2 ring-rose-500/20'
                : 'border-slate-100 bg-white text-rose-400 hover:bg-rose-50/20 hover:text-rose-500'
            } border shadow-sm`}
          >
            <CalendarIcon className={`size-3.5 transition-transform duration-300 group-hover:scale-110 ${activeFilter === 'all' ? 'text-rose-500' : 'text-rose-400'}`} />
            <span className={`text-[11px] font-bold uppercase tracking-wider ${activeFilter === 'all' ? 'font-black' : ''}`}>All Events</span>
          </button>

          {/* Upcoming Filter */}
          <button
            onClick={() => onFilterChange('upcoming')}
            className={`group flex items-center gap-2.5 rounded-full px-5 py-2 transition-all duration-300 ${
              activeFilter === 'upcoming'
                ? 'border-blue-500 bg-blue-50/30 text-blue-500 ring-2 ring-blue-500/20'
                : 'border-slate-100 bg-white text-blue-400 hover:bg-blue-50/20 hover:text-blue-500'
            } border shadow-sm`}
          >
            <Clock className={`size-3.5 transition-transform duration-300 group-hover:scale-110 ${activeFilter === 'upcoming' ? 'text-blue-500' : 'text-blue-400'}`} />
            <span className={`text-[11px] font-bold uppercase tracking-wider ${activeFilter === 'upcoming' ? 'font-black' : ''}`}>Upcoming</span>
          </button>

          {/* In Progress Filter */}
          <button
            onClick={() => onFilterChange('in-progress')}
            className={`group flex items-center gap-2.5 rounded-full px-5 py-2 transition-all duration-300 ${
              activeFilter === 'in-progress'
                ? 'border-amber-500 bg-amber-50/30 text-amber-500 ring-2 ring-amber-500/20'
                : 'border-slate-100 bg-white text-amber-400 hover:bg-amber-50/20 hover:text-amber-500'
            } border shadow-sm`}
          >
            <Play className={`size-3.5 transition-transform duration-300 group-hover:scale-110 ${activeFilter === 'in-progress' ? 'text-amber-500' : 'text-amber-400'}`} />
            <span className={`text-[11px] font-bold uppercase tracking-wider ${activeFilter === 'in-progress' ? 'font-black' : ''}`}>In Progress</span>
          </button>

          {/* Completed Filter */}
          <button
            onClick={() => onFilterChange('completed')}
            className={`group flex items-center gap-2.5 rounded-full px-5 py-2 transition-all duration-300 ${
              activeFilter === 'completed'
                ? 'border-emerald-500 bg-emerald-50/30 text-emerald-500 ring-2 ring-emerald-500/20'
                : 'border-slate-100 bg-white text-emerald-400 hover:bg-emerald-50/20 hover:text-emerald-500'
            } border shadow-sm`}
          >
            <CheckCircle2 className={`size-3.5 transition-transform duration-300 group-hover:scale-110 ${activeFilter === 'completed' ? 'text-emerald-500' : 'text-emerald-400'}`} />
            <span className={`text-[11px] font-bold uppercase tracking-wider ${activeFilter === 'completed' ? 'font-black' : ''}`}>Completed</span>
          </button>
        </div>
      </div>

      {/* Calendar Card Grid Container */}
      <div className="flex min-h-0 flex-1 flex-col rounded-[28px] border border-slate-200/60 bg-slate-50/50 p-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] sm:rounded-[32px] sm:p-4 lg:rounded-[40px] lg:p-10">
        {/* Week days header */}
        <div className="mb-3 grid shrink-0 grid-cols-7 gap-1.5 px-0.5 sm:mb-4 sm:gap-2.5 sm:px-1 lg:mb-6 lg:gap-4">
          {weekDays.map((day, index) => {
            const isWeekend = index === 0 || index === 6
            return (
              <div 
                key={day} 
                className={`text-center text-[8px] font-black uppercase tracking-[0.16em] sm:text-[9px] lg:text-[11px] ${isWeekend ? 'text-rose-400/80' : 'text-slate-400/80'}`}
              >
                {day}
              </div>
            )
          })}
        </div>

        {/* Calendar grid - Fixed 6 rows for perfect balance */}
        <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-1.5 sm:gap-2.5 lg:gap-4">
          {calendarDays.map(day => {
            const dayEvents = eventsByDate.get(getLocalDateString(day)) ?? []
            const isToday = isSameDay(day, today)
            const isSelected = isSameDay(day, selectedDate)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isWeekend = day.getDay() === 0 || day.getDay() === 6
            const isOddDay = day.getDate() % 2 !== 0
            const showSelectedEventCount = isSelected && dayEvents.length > 0
            
            const hasCompleted = dayEvents.some(e => e.status === 'completed')
            const hasUpcoming = dayEvents.some(e => e.status === 'upcoming' || e.status === 'in-progress')
            const hasMeeting = dayEvents.some(e => e.category?.toLowerCase() === 'meeting')
            const hasUrgent = dayEvents.some(e => e.category?.toLowerCase() === 'urgent' || e.title?.toLowerCase().includes('urgent'))

            return (
              <button
                key={day.toISOString()}
                onClick={() => {
                  onSelectDate(day)
                  if (!isCurrentMonth) {
                    onChangeMonth(day)
                  }
                }}
                className={`
                  group relative aspect-square w-full rounded-xl border transition-all duration-300 sm:rounded-2xl
                  flex flex-col items-center justify-center
                  ${isCurrentMonth 
                    ? (isSelected 
                        ? 'bg-gradient-to-br from-primary to-accent text-white border-transparent shadow-lg scale-[1.03] z-10' 
                        : (isToday 
                            ? 'bg-white text-primary border-primary shadow-lg ring-4 ring-primary/10' 
                            : (isOddDay ? 'bg-[var(--calendar-odd)] border-transparent shadow-sm' : 'bg-[var(--calendar-even)] border-transparent shadow-sm')
                          )
                      ) 
                    : 'bg-transparent text-slate-300 border-transparent pointer-events-none opacity-30'}
                  ${isCurrentMonth && !isSelected && !isToday
                    ? (isWeekend 
                        ? (isOddDay ? 'text-rose-200' : 'text-rose-500') 
                        : (isOddDay ? 'text-[var(--calendar-odd-foreground)]' : 'text-[var(--calendar-even-foreground)]')
                      )
                    : ''
                  }
                  ${!isSelected && isCurrentMonth ? 'hover:brightness-110 hover:shadow-lg hover:-translate-y-1' : ''}
                `}
              >
                {isToday && (
                  <div className={`absolute top-1 left-1/2 z-20 -translate-x-1/2 rounded-full px-1 py-0.5 text-[4px] leading-none font-black uppercase tracking-[0.12em] shadow-sm sm:top-2 sm:px-2 sm:text-[7px] ${
                    isSelected 
                      ? 'bg-white/20 text-white backdrop-blur-sm' 
                      : 'bg-primary text-white'
                  }`}>
                    Today
                  </div>
                )}

                <span className={`relative z-10 text-xs leading-none sm:text-sm lg:text-lg ${isSelected ? 'font-black' : 'font-bold'}`}>
                  {format(day, 'd')}
                </span>
                
                {/* Event indicators */}
                <div className={`absolute mt-1 flex max-w-[80%] flex-wrap justify-center gap-0.5 sm:gap-1 lg:bottom-4 ${
                  isToday && showSelectedEventCount ? 'bottom-1 sm:bottom-2.5' : 'bottom-1.5 sm:bottom-3'
                }`}>
                  {!isSelected && dayEvents.length > 0 && (
                    <>
                      {hasUpcoming && <span className="size-1 rounded-full bg-blue-500 shadow-sm sm:size-1.5" />}
                      {hasCompleted && <span className="size-1 rounded-full bg-emerald-500 shadow-sm sm:size-1.5" />}
                      {hasMeeting && <span className="size-1 rounded-full bg-purple-500 shadow-sm sm:size-1.5" />}
                      {hasUrgent && <span className="size-1 rounded-full bg-amber-500 shadow-sm animate-pulse sm:size-1.5" />}
                    </>
                  )}
                  {showSelectedEventCount && (
                    <span className={`rounded-full bg-white/10 py-0.5 font-black uppercase text-white/90 backdrop-blur-sm ${
                      isToday
                        ? 'px-1 text-[6px] tracking-[0.14em] sm:px-2 sm:text-[8px] sm:tracking-[0.18em] lg:text-[10px]'
                        : 'px-1.5 text-[7px] tracking-[0.18em] sm:px-2 sm:text-[8px] lg:text-[10px]'
                    }`}>
                      {dayEvents.length} {dayEvents.length === 1 ? 'EV' : 'EVTS'}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

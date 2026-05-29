'use client'

import { useState, useMemo } from 'react'
import { format, isAfter, startOfDay } from 'date-fns'
import {
  Plus,
  Clock,
  CheckCircle2,
  PlayCircle,
  Calendar as CalendarIcon,
  Users,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  Zap,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { RunningText } from '@/components/ui/running-text'
import type { CalendarEvent } from '@/lib/types'
import { formatTime12h, getLocalDateString, parseLocalDate } from '@/lib/event-utils'
import { downloadStoredFile, openStoredFile } from '@/lib/file-utils'

interface EventListProps {
  selectedDate: Date
  events: CalendarEvent[]
  allEvents: CalendarEvent[]
  onAddEvent: () => void
  onEditEvent: (event: CalendarEvent) => void
  activeFilter?: 'all' | 'upcoming' | 'in-progress' | 'completed' | null
  currentDate?: Date
}

const categoryColors: Record<string, string> = {
  meeting: 'bg-purple-50 text-purple-700 border-purple-100',
  task: 'bg-blue-50 text-blue-700 border-blue-100',
  reminder: 'bg-amber-50 text-amber-700 border-amber-100',
  urgent: 'bg-rose-50 text-rose-700 border-rose-100',
  other: 'bg-slate-50 text-slate-700 border-slate-100',
}

const getCategoryStyles = (category: string) => {
  return categoryColors[category.toLowerCase()] || categoryColors.other
}

const statusIcons = {
  upcoming: Clock,
  'in-progress': PlayCircle,
  completed: CheckCircle2,
}

export function EventList({ 
  selectedDate, 
  events, 
  allEvents, 
  onAddEvent, 
  onEditEvent,
  activeFilter = 'all',
  currentDate = new Date()
}: EventListProps) {
  const formattedDate = format(selectedDate, 'MMMM d, yyyy')
  const currentMonthName = format(currentDate, 'MMMM yyyy')
  const isSelectedToday = getLocalDateString(selectedDate) === getLocalDateString(new Date())
  const [expandedEvents, setExpandedEvents] = useState<Record<number, boolean>>({})

  const toggleAttendees = (eventId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }))
  }

  const sortedEvents = useMemo(() => 
    [...events]
      .filter(e => e.startDate)
      .sort((a, b) => a.startDate.localeCompare(b.startDate)),
  [events])

  const stats = useMemo(() => {
    const total = events.length
    const completed = events.filter(e => e.status === 'completed').length
    const upcoming = allEvents.filter(e => e.status === 'upcoming').length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    
    return { total, completed, upcoming, completionRate }
  }, [events, allEvents])

  const filterLabels: Record<string, string> = {
    all: 'All Events',
    upcoming: 'Upcoming Events',
    'in-progress': 'Active Events',
    completed: 'Completed Events'
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Date & Add Event Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">
              {activeFilter === null 
                ? (isSelectedToday ? "Today's Schedule" : "Schedule for")
                : filterLabels[activeFilter as string]}
            </h3>
            <p className="text-lg font-bold text-foreground leading-tight">
              {activeFilter === null ? formattedDate : currentMonthName}
            </p>
          </div>
          <div className="bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10">
            <span className="text-sm font-bold text-primary">
              {events.length} {events.length === 1 ? 'Event' : 'Events'}
            </span>
          </div>
        </div>

        <button
          onClick={onAddEvent}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-primary/90 hover:shadow-lg active:scale-[0.98] transition-all group"
        >
          <Plus className="size-5" />
          Schedule Event
        </button>
      </div>

      {/* Progress Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="size-3.5 text-emerald-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Completion</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{stats.completionRate}%</span>
            <span className="text-[10px] font-medium text-slate-400">rate</span>
          </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="size-3.5 text-blue-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Upcoming</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{stats.upcoming}</span>
            <span className="text-[10px] font-medium text-slate-400">total</span>
          </div>
        </div>
      </div>

      {/* Event List Container */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="size-1.5 rounded-full bg-primary" />
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Events Registry</h4>
        </div>

        {events.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
            <div className="p-4 bg-white rounded-full shadow-sm border border-slate-100">
              <CalendarIcon className="size-8 text-slate-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-400">
                {activeFilter === null 
                  ? 'No events scheduled' 
                  : `No ${activeFilter.replace('-', ' ')} events in ${currentMonthName}`}
              </p>
              <p className="text-[11px] text-slate-300 mt-1">
                {activeFilter === null ? 'Select a date or click schedule' : 'Try changing your filters or month'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pr-2">
            {sortedEvents.map((event) => {
              const StatusIcon = statusIcons[event.status]
              const startDateTime = new Date(event.startDate)

              return (
                <div
                  key={event.id}
                  onClick={() => onEditEvent(event)}
                  className="group flex flex-col gap-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center justify-center min-w-[50px] py-1 bg-slate-50 rounded-lg border border-slate-100 group-hover:bg-primary/5 group-hover:border-primary/10 transition-colors">
                      <span className="text-sm font-bold text-slate-900 group-hover:text-primary">
                        {format(startDateTime, 'h')}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">
                        {format(startDateTime, 'a')}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-black text-primary/40 uppercase tracking-tighter">
                          {format(startDateTime, 'MMM d')}
                        </span>
                        <div className="h-2 w-[1px] bg-slate-100" />
                        <RunningText
                          text={event.title}
                          className="text-sm font-bold text-slate-900 transition-colors group-hover:text-primary"
                          minDurationSeconds={7}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getCategoryStyles(event.category || 'other')}`}>
                          {event.category || 'Event'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {formatTime12h(event.startDate)} - {formatTime12h(event.endDate)}
                        </span>
                      </div>
                    </div>

                    <div className={`p-2 rounded-lg shrink-0 ${
                      event.status === 'completed' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' :
                      event.status === 'in-progress' ? 'text-amber-600 bg-amber-50 border border-amber-100' :
                      'text-blue-600 bg-blue-50 border border-blue-100'
                    }`}>
                      <StatusIcon className="size-4" />
                    </div>
                  </div>

                  {/* Attachments & Attendees Details */}
                  {(event.attendees?.length > 0 || (event.attachments && event.attachments.length > 0)) && (
                    <div className="mt-1 pt-3 border-t border-slate-50 flex flex-col gap-3">
                      {/* Attachments Cards - Shown First */}
                      {event.attachments && event.attachments.length > 0 && (
                        <div className="grid grid-cols-1 gap-1.5">
                          {event.attachments.map((file, idx) => (
                            <div 
                              key={idx}
                              className="flex items-center gap-2 p-2 bg-slate-50/50 rounded-xl border border-slate-100/50 group/file hover:bg-white hover:border-primary/10 transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                openStoredFile(file.fileUrl);
                              }}
                            >
                              <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                                <FileText className="size-3 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col">
                                <span className="text-[10px] font-bold text-slate-700 truncate leading-none mb-0.5">
                                  {file.fileName}
                                </span>
                                <span className="text-[8px] text-slate-400 font-medium">
                                  {(file.fileSize / 1024).toFixed(1)} KB
                                </span>
                              </div>
                              <ArrowRight className="size-3 text-slate-300 opacity-0 group-hover/file:opacity-100 transition-all mr-1" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Attendees List - Refactored to Stateful Collapsible Dropdown */}
                      {event.attendees && event.attendees.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <div 
                            className="flex items-center justify-between px-1 cursor-pointer hover:opacity-80 transition-opacity group/toggle"
                            onClick={(e) => toggleAttendees(event.id, e)}
                          >
                            <div className="flex items-center gap-2">
                              <Users className={`size-3 transition-colors ${expandedEvents[event.id] ? 'text-primary' : 'text-slate-400'}`} />
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover/toggle:text-slate-600 transition-colors">
                                {expandedEvents[event.id] ? 'Hide Attendees' : 'View Attendees'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded-md">
                                {event.attendees.length}
                              </span>
                              {expandedEvents[event.id] ? (
                                <ChevronUp className="size-3 text-slate-400 group-hover/toggle:text-primary transition-colors" />
                              ) : (
                                <ChevronDown className="size-3 text-slate-400 group-hover/toggle:text-primary transition-colors" />
                              )}
                            </div>
                          </div>

                          {expandedEvents[event.id] && (
                            <div className="flex flex-col gap-1 bg-slate-50/50 rounded-xl p-1.5 border border-slate-100/50 animate-in slide-in-from-top-1 duration-200">
                              {event.attendees.map((attendee, idx) => (
                                <div 
                                  key={idx} 
                                  className="flex items-center gap-2 px-2 py-1 hover:bg-white rounded-lg transition-colors group/attendee"
                                >
                                  <div className="size-1 rounded-full bg-slate-300 group-hover/attendee:bg-primary transition-colors" />
                                  <span className="text-[10px] font-bold text-slate-600 group-hover/attendee:text-slate-900 transition-colors">
                                    {attendee}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { format } from 'date-fns'
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
} from 'lucide-react'
import type { CalendarEvent } from '@/lib/types'
import { formatTime12h } from '@/lib/event-utils'
import { downloadStoredFile, openStoredFile } from '@/lib/file-utils'

interface EventListProps {
  selectedDate: Date
  events: CalendarEvent[]
  onAddEvent: () => void
  onEditEvent: (event: CalendarEvent) => void
}

const categoryColors: Record<string, string> = {
  meeting: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  task: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  reminder: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300',
}

const getCategoryColor = (category: string) => {
  return categoryColors[category.toLowerCase()] || categoryColors.other
}

const statusIcons = {
  upcoming: Clock,
  'in-progress': PlayCircle,
  completed: CheckCircle2,
}

const statusColors = {
  upcoming: 'text-blue-500',
  'in-progress': 'text-amber-500',
  completed: 'text-green-500',
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function EventList({ selectedDate, events, onAddEvent, onEditEvent }: EventListProps) {
  const [expandedAttendees, setExpandedAttendees] = useState<number | null>(null)
  const formattedDate = format(selectedDate, 'EEEE, MMMM d, yyyy')

  const sortedEvents = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime))

  return (
    <div className="overflow-x-hidden rounded-xl border border-border bg-card p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Events</h3>
          <p className="text-sm text-muted-foreground">{formattedDate}</p>
        </div>
        <button
          onClick={onAddEvent}
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Event
        </button>
      </div>

      {sortedEvents.length === 0 ? (
        <div className="py-12 text-center">
          <CalendarIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">No events for this day</p>
          <button onClick={onAddEvent} className="mt-3 text-sm text-primary hover:underline">
            Create your first event
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedEvents.map((event) => {
            const StatusIcon = statusIcons[event.status]

            return (
              <div
                key={event.id}
                onClick={() => onEditEvent(event)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onEditEvent(event)
                  }
                }}
                role="button"
                tabIndex={0}
                className={`
                  min-h-[180px] w-full overflow-hidden rounded-xl border border-border p-5 text-left
                  transition-colors hover:border-primary/50
                  focus:outline-none focus:ring-2 focus:ring-ring
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${statusColors[event.status]}`}>
                    <StatusIcon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap">
                      <h4
                        className="w-full min-w-0 break-all font-medium text-foreground sm:flex-1 sm:break-words sm:[overflow-wrap:anywhere]"
                        title={event.title}
                      >
                        {event.title}
                      </h4>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${getCategoryColor(event.category)}`}
                      >
                        {event.category}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime12h(event.startTime)} - {formatTime12h(event.endTime)}
                      </span>
                      {event.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Finished
                        </span>
                      )}
                      {event.status === 'in-progress' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          <PlayCircle className="h-3 w-3" />
                          In Progress
                        </span>
                      )}
                      {event.status === 'upcoming' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          <Clock className="h-3 w-3" />
                          Upcoming
                        </span>
                      )}
                    </div>

                    {event.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {event.description}
                      </p>
                    )}

                    {event.attachments && event.attachments.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {event.attachments.map((attachment, index) => (
                          <div
                            key={`${event.id}-attachment-${index}`}
                            className="rounded-2xl border border-border/80 bg-background/80 p-3.5 shadow-sm"
                          >
                            <div className="flex items-start gap-3">
                              <div className="rounded-2xl bg-muted/60 p-3 shadow-sm">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <p
                                  className="truncate text-sm font-semibold text-foreground"
                                  title={attachment.fileName}
                                >
                                  {attachment.fileName}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {attachment.fileType}
                                  {attachment.fileSize ? ` • ${formatFileSize(attachment.fileSize)}` : ''}
                                </p>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openStoredFile(attachment.fileUrl)
                                    }}
                                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                                  >
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      downloadStoredFile(attachment.fileUrl, attachment.fileName)
                                    }}
                                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    Download
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {event.attendees && event.attendees.length > 0 && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedAttendees(expandedAttendees === event.id ? null : event.id)
                          }}
                          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Users className="h-4 w-4" />
                          <span>{event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}</span>
                          {expandedAttendees === event.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>

                        {expandedAttendees === event.id && (
                          <div className="mt-2 rounded-lg bg-muted/50 p-3">
                            <ul className="space-y-1.5">
                              {event.attendees.map((attendee, index) => (
                                <li key={index} className="flex items-center gap-2 text-sm text-foreground">
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                                    {attendee.charAt(0).toUpperCase()}
                                  </div>
                                  {attendee}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

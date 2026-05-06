'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Hanuman } from 'next/font/google'
import { Calendar, BarChart3, FileText, LogOut, Menu, X, FolderOpen, KeyRound, ChevronDown, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { CalendarGrid } from './calendar-grid'
import { EventList } from './event-list'
import { EventModal } from './event-modal'
import { Analytics } from './analytics'
import { Reports } from './reports'
import { Documents } from './documents'
import { ProfilePasswordDialog } from './profile-password-dialog'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CalendarEvent, EventInput, User } from '@/lib/types'
import type { AppView } from '@/lib/auth-routes'
import { getViewPath } from '@/lib/auth-routes'
import {
  getLocalDateString,
  parseLocalDate,
  updateEventStatus
} from '@/lib/event-utils'
import {
  createEvent,
  deleteEvent,
  getApiErrorMessage,
  getEvents,
  updateEvent,
} from '@/lib/api'

const khmerFont = Hanuman({
  subsets: ['khmer'],
  weight: ['400', '700'],
})

interface DashboardProps {
  user: User
  onLogout: () => void
  activeView: AppView
}

export function Dashboard({ user, onLogout, activeView }: DashboardProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())

  // Ensure theme is only rendered on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)

  const loadEvents = useCallback(async () => {
    try {
      const loaded = await getEvents()
      setEvents(loaded)
    } catch (loadError) {
      setError(getApiErrorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadEvents()
    const interval = setInterval(() => {
      setEvents(prev => prev.map(updateEventStatus))
    }, 60000)

    return () => clearInterval(interval)
  }, [loadEvents])

  const selectedDateStr = getLocalDateString(selectedDate)
  const selectedDateEvents = events.filter(e => e.date === selectedDateStr)

  const handleAddEvent = useCallback(() => {
    setSuccessMessage('')
    setEditingEvent(null)
    setIsModalOpen(true)
  }, [])

  const handleEditEvent = useCallback((event: CalendarEvent) => {
    setEditingEvent(event)
    setIsModalOpen(true)
  }, [])

  const handleSaveEvent = useCallback(async (eventData: EventInput) => {
    setError('')
    setSuccessMessage('')

    try {
      if (editingEvent) {
        const updated = await updateEvent(editingEvent.id, eventData)
        setEvents(prev => prev.map(e => e.id === editingEvent.id ? updated : e))
        const nextDate = parseLocalDate(updated.date)
        setSelectedDate(nextDate)
        setCurrentDate(nextDate)
      } else {
        const created = await createEvent(eventData)
        setEvents(prev => [...prev, created])
        const nextDate = parseLocalDate(created.date)
        setSelectedDate(nextDate)
        setCurrentDate(nextDate)
      }

      setEditingEvent(null)
      setIsModalOpen(false)
    } catch (saveError) {
      throw new Error(getApiErrorMessage(saveError))
    }
  }, [editingEvent])

  const handleDeleteEvent = useCallback(async () => {
    if (editingEvent) {
      try {
        setSuccessMessage('')
        await deleteEvent(editingEvent.id)
        setEvents(prev => prev.filter(e => e.id !== editingEvent.id))
        setEditingEvent(null)
        setIsModalOpen(false)
      } catch (deleteError) {
        setError(getApiErrorMessage(deleteError))
      }
    }
  }, [editingEvent])

  const navItems = [
    { id: 'calendar' as const, label: 'Calendar', icon: Calendar, href: getViewPath('calendar') },
    { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3, href: getViewPath('dashboard') },
    { id: 'reports' as const, label: 'Reports', icon: FileText, href: getViewPath('reports') },
    { id: 'documents' as const, label: 'Documents', icon: FolderOpen, href: getViewPath('documents') },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="min-w-0 flex flex-col-reverse">
            <div className="truncate text-xs font-semibold text-muted-foreground sm:text-sm">
              Business Registration Department
            </div>
            <div
              className={`${khmerFont.className} relative truncate text-base font-bold text-transparent sm:text-lg`}
              style={{ fontFamily: "'Hanuman', serif" }}
            >
              <span className="absolute inset-0 truncate text-foreground">
                នាយកដ្ឋានចុះបញ្ជី
              </span>
              នាយកដ្ឋានចុះបញ្ជី
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.id}
                href={item.href}
                aria-current={activeView === item.id ? 'page' : undefined}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                  ${activeView === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
                `}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors outline-hidden cursor-pointer">
                  <Avatar className="size-8 border border-border">
                    <AvatarImage src="" alt={user.fullname || user.username} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                      {(user.fullname || user.username)
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-foreground hidden sm:inline-block">
                    {user.fullname || user.username}
                  </span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="p-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium leading-none text-foreground">
                      {user.fullname || user.username}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.username}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {mounted && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="mr-2 h-4 w-4" />
                        <span>Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="mr-2 h-4 w-4" />
                        <span>Dark Mode</span>
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    setError('')
                    setSuccessMessage('')
                    setMobileMenuOpen(false)
                    setIsPasswordDialogOpen(true)
                  }}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  <span>Change Password</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} variant="destructive" className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-muted rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-border p-2">
            {navItems.map(item => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => {
                  setMobileMenuOpen(false)
                }}
                aria-current={activeView === item.id ? 'page' : undefined}
                className={`
                  w-full flex items-center gap-2 px-4 py-3 rounded-lg transition-colors
                  ${activeView === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
                `}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 lg:p-6 min-h-[calc(100vh-4rem)]">
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
        {activeView === 'calendar' && (
          <div className="grid lg:grid-cols-[1fr_380px] gap-6">
            <CalendarGrid
              currentDate={currentDate}
              selectedDate={selectedDate}
              events={events}
              onSelectDate={setSelectedDate}
              onChangeMonth={setCurrentDate}
            />
            <EventList
              selectedDate={selectedDate}
              events={selectedDateEvents}
              onAddEvent={handleAddEvent}
              onEditEvent={handleEditEvent}
            />
          </div>
        )}
        {activeView === 'dashboard' && <Analytics events={events} />}
        {activeView === 'reports' && <Reports user={user} events={events} onEventsChanged={loadEvents} />}
        {activeView === 'documents' && <Documents />}
          </>
        )}
      </main>

      {/* Event Modal */}
      <EventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingEvent(null)
        }}
        onSave={handleSaveEvent}
        onDelete={editingEvent ? handleDeleteEvent : undefined}
        initialDate={selectedDateStr}
        editEvent={editingEvent}
      />

      <ProfilePasswordDialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        onSuccess={(message) => {
          setError('')
          setSuccessMessage(message)
        }}
      />
    </div>
  )
}

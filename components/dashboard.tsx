'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { format } from 'date-fns'
import { Calendar, BarChart3, FileText, LogOut, Menu, X, FolderOpen, KeyRound, ChevronDown, Palette, User as UserIcon } from 'lucide-react'
import { CalendarGrid } from './calendar-grid'
import { EventList } from './event-list'
import { EventModal } from './event-modal'
import { Analytics } from './analytics'
import { Reports } from './reports'
import { Documents } from './documents'
import { ProfilePasswordDialog } from './profile-password-dialog'
import { NotificationBell } from './notification-bell'
import { RunningText } from './ui/running-text'
import {
  Avatar,
  AvatarFallback,
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
  getEventStatus,
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

interface DashboardProps {
  user: User
  onLogout: () => void
  activeView: AppView
  onUserUpdate: (user: User) => void
}

export function Dashboard({ user, onLogout, activeView, onUserUpdate }: DashboardProps) {
  const pathname = usePathname()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [initialSettingsTab, setInitialSettingsTab] = useState<'theme' | 'password' | 'nickname'>('theme')
  const [activeFilter, setActiveFilter] = useState<'all' | 'upcoming' | 'in-progress' | 'completed' | null>('all')

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

  useEffect(() => {
    setMobileMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)')
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMobileMenuOpen(false)
      }
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  const currentMonthStr = format(currentDate, 'yyyy-MM')
  
  const monthlyEvents = useMemo(() => {
    return events.filter(e => e.startDate?.startsWith(currentMonthStr))
  }, [events, currentMonthStr])

  const filteredMonthlyEvents = useMemo(() => {
    if (activeFilter === 'all' || activeFilter === null) return monthlyEvents
    
    return monthlyEvents.filter(e => getEventStatus(e) === activeFilter)
  }, [monthlyEvents, activeFilter])

  const selectedDateStr = getLocalDateString(selectedDate)
  
  // Sidebar displays day-specific events when filter is null (turned off by clicking a day)
  // Otherwise, it displays the filtered monthly events
  const sidebarEvents = useMemo(() => {
    if (activeFilter === null) {
      return events.filter(e => e.startDate?.startsWith(selectedDateStr))
    }
    return filteredMonthlyEvents
  }, [activeFilter, events, selectedDateStr, filteredMonthlyEvents])

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date)
    setActiveFilter(null) // Turn filter off when selecting a day
  }, [])

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
        const nextDate = parseLocalDate(updated.startDate.slice(0, 10))
        setSelectedDate(nextDate)
        setCurrentDate(nextDate)
      } else {
        const created = await createEvent(eventData)
        setEvents(prev => [...prev, created])
        const nextDate = parseLocalDate(created.startDate.slice(0, 10))
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
        setError('')
        setSuccessMessage('')
        await deleteEvent(editingEvent.id)
        setEvents(prev => prev.filter(e => e.id !== editingEvent.id))
        await loadEvents()
        setEditingEvent(null)
        setIsModalOpen(false)
      } catch (deleteError) {
        const message = getApiErrorMessage(deleteError)
        setError(message)
        throw new Error(message)
      }
    }
  }, [editingEvent, loadEvents])

  const navItems = [
    { id: 'calendar' as const, label: 'Calendar', icon: Calendar, href: getViewPath('calendar') },
    { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3, href: getViewPath('dashboard') },
    { id: 'reports' as const, label: 'Reports', icon: FileText, href: getViewPath('reports') },
    { id: 'documents' as const, label: 'Documents', icon: FolderOpen, href: getViewPath('documents') },
  ]

  return (
    <div className="relative flex min-h-full flex-col overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.08),transparent_30%),linear-gradient(180deg,#f8faff_0%,#f5f7fb_100%)] font-sans">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-white/92 shadow-soft">
        <div className="mx-auto flex min-h-20 max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo & System Title */}
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            <div className="flex h-10 items-center justify-center py-1 sm:h-12">
              <img src="/logo.png" alt="Logo" className="h-full w-auto object-contain" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold leading-tight tracking-tight text-foreground sm:text-base">
                នាយកដ្ឋានចុះបញ្ជី
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground sm:text-[10px]">
                BUSINESS REGISTRATION
              </span>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden items-center rounded-2xl border border-border/30 bg-secondary/30 p-1 md:flex">
            {navItems.map(item => (
              <Link
                key={item.id}
                href={item.href}
                className={[
                  'flex items-center gap-2.5 rounded-xl px-6 py-2.5 text-xs font-bold transition-all duration-300',
                  activeView === item.id
                    ? 'bg-white text-primary shadow-soft'
                    : 'text-muted-foreground hover:bg-white/40 hover:text-foreground',
                ].join(' ')}
              >
                <item.icon className={`size-4 ${activeView === item.id ? 'text-primary' : ''}`} />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
            <NotificationBell />

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button className="flex cursor-pointer items-center gap-3.5 rounded-full border border-border/40 bg-white py-1.5 pl-1.5 pr-4 transition-all hover:shadow-soft">
                  <Avatar className="size-9 border border-border/30">
                    <AvatarFallback className="bg-gradient-premium text-xs font-bold text-white">
                      {(user.fullname || user.username)
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden w-36 min-w-0 flex-col items-start text-left sm:flex">
                    <RunningText
                      text={user.fullname || user.username}
                      className="mb-1 w-full text-xs leading-none font-bold text-foreground"
                    />
                    <span className="text-[10px] font-semibold text-muted-foreground">Administrator</span>
                  </div>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl border-border/30 p-2 shadow-premium">
                <DropdownMenuLabel className="p-4">
                  <div className="flex flex-col gap-1">
                    <RunningText
                      text={user.fullname || user.username}
                      className="w-full text-sm font-bold text-foreground"
                    />
                    <p className="text-xs font-medium text-muted-foreground">
                      {user.username}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/30" />
                <DropdownMenuItem
                  className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors focus:bg-primary/5 focus:text-primary"
                  onSelect={() => {
                    setError('')
                    setSuccessMessage('')
                    setInitialSettingsTab('theme')
                    setTimeout(() => setIsPasswordDialogOpen(true), 150)
                  }}
                >
                  <Palette className="size-4" />
                  <span className="text-sm font-bold">Appearance</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors focus:bg-primary/5 focus:text-primary"
                  onSelect={() => {
                    setError('')
                    setSuccessMessage('')
                    setInitialSettingsTab('nickname')
                    setTimeout(() => setIsPasswordDialogOpen(true), 150)
                  }}
                >
                  <UserIcon className="size-4" />
                  <span className="text-sm font-bold">Change Nickname</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors focus:bg-primary/5 focus:text-primary"
                  onSelect={() => {
                    setError('')
                    setSuccessMessage('')
                    setInitialSettingsTab('password')
                    setTimeout(() => setIsPasswordDialogOpen(true), 150)
                  }}
                >
                  <KeyRound className="size-4" />
                  <span className="text-sm font-bold">Change Password</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/30" />
                <DropdownMenuItem
                  onClick={onLogout}
                  variant="destructive"
                  className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors focus:bg-destructive/5"
                >
                  <LogOut className="size-4" />
                  <span className="text-sm font-bold">Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen((current) => !current)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="rounded-2xl p-2.5 transition-colors hover:bg-secondary md:hidden"
            >
              {mobileMenuOpen ? <X className="size-6 text-foreground" /> : <Menu className="size-6 text-foreground" />}
            </button>
          </div>
        </div>

        <div
          className={[
            'overflow-hidden border-t border-border/30 bg-white/95 px-4 transition-all duration-200 md:hidden',
            mobileMenuOpen ? 'max-h-80 py-4 opacity-100' : 'max-h-0 py-0 opacity-0',
          ].join(' ')}
        >
          <nav className="mx-auto flex max-w-[1600px] flex-col gap-2">
            {navItems.map(item => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={[
                  'flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold transition-all duration-200',
                  activeView === item.id
                    ? 'border-primary/20 bg-primary text-primary-foreground shadow-soft'
                    : 'border-transparent bg-secondary/40 text-foreground hover:border-border/40 hover:bg-white',
                ].join(' ')}
              >
                <item.icon className="size-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 px-4 py-4 sm:px-5 lg:px-6">
        <div className="mx-auto flex min-h-full max-w-[1600px] flex-col">
          {isLoading ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div
              key={activeView}
              className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
            >
              {activeView === 'calendar' ? (
                <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
                  {/* LEFT SIDE: Adaptive Calendar Area */}
                  <div className="min-w-0 rounded-3xl border border-border/20 bg-white/75 p-4 sm:p-5 lg:p-6">
                    {error && (
                      <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs font-bold text-destructive shadow-soft">
                        {error}
                      </div>
                    )}
                    {successMessage && (
                      <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs font-bold text-emerald-700 shadow-soft">
                        {successMessage}
                      </div>
                    )}

                    <div>
                      <CalendarGrid
                        currentDate={currentDate}
                        selectedDate={selectedDate}
                        events={filteredMonthlyEvents}
                        onSelectDate={handleSelectDate}
                        onChangeMonth={setCurrentDate}
                        activeFilter={activeFilter}
                        onFilterChange={setActiveFilter}
                      />
                    </div>
                  </div>

                  {/* RIGHT SIDE: Event List & Schedule Sidebar */}
                  <aside className="rounded-3xl border border-border/40 bg-white shadow-soft">
                    <div className="p-4 sm:p-5 lg:p-6">
                      <EventList
                        selectedDate={selectedDate}
                        events={sidebarEvents}
                        allEvents={monthlyEvents}
                        onAddEvent={handleAddEvent}
                        onEditEvent={handleEditEvent}
                        activeFilter={activeFilter}
                        currentDate={currentDate}
                      />
                    </div>
                  </aside>
                </div>
              ) : (
                <div className="min-w-0 rounded-3xl border border-border/20 bg-white/75 p-4 sm:p-6 lg:p-8">
                  {activeView === 'dashboard' && <Analytics events={events} />}
                  {activeView === 'reports' && <Reports user={user} events={events} onEventsChanged={loadEvents} />}
                  {activeView === 'documents' && <Documents user={user} />}
                </div>
              )}
            </div>
          )}
        </div>
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
        user={user}
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        onSuccess={(message) => {
          setError('')
          setSuccessMessage(message)
        }}
        onUserUpdate={onUserUpdate}
        defaultTab={initialSettingsTab}
      />
    </div>
  )
}

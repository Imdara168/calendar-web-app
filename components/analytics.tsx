'use client'

import { useMemo } from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subDays } from 'date-fns'
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Calendar, CheckCircle2, Clock } from 'lucide-react'
import type { CalendarEvent } from '@/lib/types'
import { getLocalDateString } from '@/lib/event-utils'

interface AnalyticsProps {
  events: CalendarEvent[]
}

const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#6b7280']

export function Analytics({ events }: AnalyticsProps) {
  const stats = useMemo(() => {
    const total = events.length
    const completed = events.filter(e => e.status === 'completed').length
    const upcoming = events.filter(e => e.status === 'upcoming').length
    const inProgress = events.filter(e => e.status === 'in-progress').length
    
    return { total, completed, upcoming, inProgress }
  }, [events])

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {}
    events.forEach(e => {
      const normalizedCategory = e.category.toLowerCase().trim()
      if (normalizedCategory) {
        counts[normalizedCategory] = (counts[normalizedCategory] || 0) + 1
      }
    })
    
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }))
  }, [events])

  const weeklyData = useMemo(() => {
    const today = new Date()
    const weekStart = startOfWeek(today)
    const weekEnd = endOfWeek(today)
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    
    return days.map(day => {
      const dateStr = getLocalDateString(day)
      const dayEvents = events.filter(e => e.date === dateStr)
      return {
        day: format(day, 'EEE'),
        total: dayEvents.length,
        completed: dayEvents.filter(e => e.status === 'completed').length
      }
    })
  }, [events])

  const last7DaysData = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dateStr = getLocalDateString(date)
      const dayEvents = events.filter(e => e.date === dateStr)
      days.push({
        date: format(date, 'MMM d'),
        events: dayEvents.length,
        completed: dayEvents.filter(e => e.status === 'completed').length
      })
    }
    return days
  }, [events])

  const completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-6 h-6 text-foreground" />
        <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Total Events</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm">Completed</span>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-sm">Upcoming</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.upcoming}</p>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Completion Rate</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{completionRate}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Overview */}
        <div className="bg-card border border-border rounded-xl p-4 lg:p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">This Week</h3>
          {weeklyData.some(d => d.total > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <XAxis dataKey="day" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)', 
                    border: '1px solid var(--border)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total" />
                <Bar dataKey="completed" fill="#22c55e" radius={[4, 4, 0, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              No events this week
            </div>
          )}
        </div>

        {/* Category Distribution */}
        <div className="bg-card border border-border rounded-xl p-4 lg:p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">By Category</h3>
          {categoryData.length > 0 ? (
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      border: '1px solid var(--border)',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {categoryData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-foreground">{item.name}</span>
                    <span className="text-sm text-muted-foreground ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              No events to display
            </div>
          )}
        </div>
      </div>

      {/* Last 7 Days Trend */}
      <div className="bg-card border border-border rounded-xl p-4 lg:p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Last 7 Days</h3>
        {last7DaysData.some(d => d.events > 0) ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={last7DaysData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--card)', 
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
              />
              <Line type="monotone" dataKey="events" stroke="#3b82f6" strokeWidth={2} name="Events" />
              <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} name="Completed" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No events in the last 7 days
          </div>
        )}
      </div>
    </div>
  )
}

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
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Calendar, CheckCircle2, Clock, Zap } from 'lucide-react'
import type { CalendarEvent } from '@/lib/types'
import { getLocalDateString } from '@/lib/event-utils'

interface AnalyticsProps {
  events: CalendarEvent[]
}

const COLORS = ['#4F46E5', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B']

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
      const dayEvents = events.filter(e => e.startDate?.startsWith(dateStr))
      return {
        day: format(day, 'EEE'),
        total: dayEvents.length,
        completed: dayEvents.filter(e => e.status === 'completed').length
      }
    })
  }, [events])

  const completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Performance Analytics</h2>
            <p className="text-sm font-medium text-muted-foreground">Overview of your productivity and events</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-border/50 rounded-[24px] p-6 shadow-soft group hover:shadow-premium transition-all duration-500">
          <div className="flex items-center gap-3 text-muted-foreground mb-4">
            <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-slate-200 transition-colors">
              <Calendar className="w-4 h-4 text-slate-600" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest">Total Events</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-foreground tracking-tight">{stats.total}</p>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Lifetime</span>
          </div>
        </div>
        
        <div className="bg-white border border-border/50 rounded-[24px] p-6 shadow-soft group hover:shadow-premium transition-all duration-500">
          <div className="flex items-center gap-3 text-muted-foreground mb-4">
            <div className="p-2 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest">Completed</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-emerald-600 tracking-tight">{stats.completed}</p>
            <span className="text-[10px] font-bold text-emerald-500 uppercase">Tasks</span>
          </div>
        </div>
        
        <div className="bg-white border border-border/50 rounded-[24px] p-6 shadow-soft group hover:shadow-premium transition-all duration-500">
          <div className="flex items-center gap-3 text-muted-foreground mb-4">
            <div className="p-2 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest">Upcoming</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-blue-600 tracking-tight">{stats.upcoming}</p>
            <span className="text-[10px] font-bold text-blue-500 uppercase">Pending</span>
          </div>
        </div>
        
        <div className="bg-white border border-border/50 rounded-[24px] p-6 shadow-soft group hover:shadow-premium transition-all duration-500">
          <div className="flex items-center gap-3 text-muted-foreground mb-4">
            <div className="p-2 bg-indigo-100 rounded-xl group-hover:bg-indigo-200 transition-colors">
              <Zap className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest">Efficiency</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-foreground tracking-tight">{completionRate}%</p>
            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-gradient-premium" style={{ width: `${completionRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Weekly Overview */}
        <div className="bg-white border border-border/50 rounded-[24px] p-8 shadow-soft">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-foreground">Weekly Activity</h3>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Current Week</span>
          </div>
          {weeklyData.some(d => d.total > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar dataKey="total" fill="#4F46E5" radius={[6, 6, 0, 0]} name="Total" barSize={30} />
                <Bar dataKey="completed" fill="#10B981" radius={[6, 6, 0, 0]} name="Completed" barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground bg-slate-50 rounded-[20px] border border-dashed border-border">
              <Calendar className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-semibold">No data available for this week</p>
            </div>
          )}
        </div>

        {/* Category Distribution */}
        <div className="bg-white border border-border/50 rounded-[24px] p-8 shadow-soft">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-foreground">Category Breakdown</h3>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">By Type</span>
          </div>
          {categoryData.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    paddingAngle={5}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: 'none',
                      borderRadius: '16px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full md:w-48 space-y-3">
                {categoryData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <span 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-xs font-bold text-foreground">{item.name}</span>
                    <span className="text-xs font-black text-muted-foreground ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground bg-slate-50 rounded-[20px] border border-dashed border-border">
              <PieChartIcon className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-semibold">No categories recorded</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

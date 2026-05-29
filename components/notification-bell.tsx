'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Bell, Calendar, CheckCheck, Dot, Inbox, Trash2, X } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  deleteNotification,
  deleteAllNotifications,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/api'
import type { Notification } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [assignedWorkCount, setAssignedWorkCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isBadgeDismissed, setIsBadgeDismissed] = useState(false)
  const previousFeedRef = useRef({ assignedWorkCount: 0, unreadCount: 0 })

  const loadNotifications = useCallback(async () => {
    try {
      const data = await getNotifications()
      const hadNewWork =
        data.assignedWorkCount > previousFeedRef.current.assignedWorkCount ||
        data.unreadCount > previousFeedRef.current.unreadCount

      setNotifications(data.notifications)
      setAssignedWorkCount(data.assignedWorkCount)
      setUnreadCount(data.unreadCount)
      previousFeedRef.current = {
        assignedWorkCount: data.assignedWorkCount,
        unreadCount: data.unreadCount,
      }

      if (hadNewWork) {
        setIsBadgeDismissed(false)
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [loadNotifications])

  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationAsRead(id)
      setNotifications((prev) => {
        const target = prev.find((notification) => notification.id === id)
        if (target?.isRead) {
          return prev
        }

        setUnreadCount((current) => Math.max(0, current - 1))
        return prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      })
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const handleDeleteNotification = async (id: number) => {
    try {
      await deleteNotification(id)
      setNotifications((prev) => {
        const removed = prev.find((notification) => notification.id === id)

        if (removed && !removed.isRead) {
          setUnreadCount((current) => Math.max(0, current - 1))
        }

        return prev.filter((notification) => notification.id !== id)
      })
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const handleClearAllNotifications = async () => {
    try {
      await deleteAllNotifications()
      setNotifications([])
      setUnreadCount(0)
      previousFeedRef.current = {
        assignedWorkCount,
        unreadCount: 0,
      }
    } catch (error) {
      console.error('Failed to clear notifications:', error)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)

    if (open) {
      setIsBadgeDismissed(true)
    }
  }

  const visibleBadgeCount =
    isBadgeDismissed || isOpen ? 0 : assignedWorkCount

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-2xl border border-border/60 bg-background/80 shadow-sm transition-colors hover:bg-muted/80"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {visibleBadgeCount > 0 && (
            <Badge
              className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground shadow-sm"
            >
              {visibleBadgeCount > 99 ? '99+' : visibleBadgeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] rounded-3xl border border-border/70 p-0 shadow-xl" align="end">
        <div className="border-b border-border/60 bg-muted/30 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
              <p className="text-xs text-muted-foreground">
                {assignedWorkCount > 0
                  ? `${assignedWorkCount} upcoming ${assignedWorkCount === 1 ? 'event' : 'events'} scheduled`
                  : 'No upcoming events right now'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                <Calendar className="h-3.5 w-3.5" />
                {assignedWorkCount}
              </div>
            </div>
          </div>
          {unreadCount > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-2xl border border-border/60 bg-background/80 px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Dot className="h-5 w-5 text-primary" />
                <span>{unreadCount} unread {unreadCount === 1 ? 'update' : 'updates'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto rounded-full px-2.5 py-1 text-xs text-primary hover:bg-primary/10 hover:text-primary"
                  onClick={handleMarkAllAsRead}
                >
                  <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                  Mark all read
                </Button>
                {notifications.length > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleClearAllNotifications}
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Clear all
                  </Button>
                ) : null}
              </div>
            </div>
          )}
          {unreadCount === 0 && notifications.length > 0 ? (
            <div className="mt-3 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={handleClearAllNotifications}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Clear all
              </Button>
            </div>
          ) : null}
        </div>
        <ScrollArea className="h-[360px]">
          {notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Inbox className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">All caught up</p>
                <p className="text-sm text-muted-foreground">New assignment updates will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-3">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5 ${
                    !notification.isRead
                      ? 'border-primary/20 bg-primary/5'
                      : 'border-border/60 bg-background'
                  }`}
                  onClick={() => handleMarkAsRead(notification.id)}
                  title={notification.message}
                >
                  <div className="absolute right-3 top-3 flex items-center gap-2">
                    {!notification.isRead ? (
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
                        New
                      </span>
                    ) : null}
                    <span
                      role="button"
                      tabIndex={0}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleDeleteNotification(notification.id)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          event.stopPropagation()
                          void handleDeleteNotification(notification.id)
                        }
                      }}
                      aria-label="Delete notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="flex min-h-[72px] items-center justify-center px-8">
                    <div className="min-w-0 w-full max-w-[240px] space-y-1 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {!notification.isRead ? (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        ) : null}
                        <p className="min-w-0 max-w-full break-all text-sm font-medium leading-5 text-foreground">
                          {notification.message}
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

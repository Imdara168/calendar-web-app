export interface EventAttachment {
  fileName: string
  fileType: string
  fileSize: number
  fileUrl: string
}

export interface CalendarEvent {
  id: number
  title: string
  description: string
  startDate: string // ISO string
  endDate: string // ISO string
  status: 'upcoming' | 'in-progress' | 'completed'
  createdAt: string
  updatedAt?: string
  category: string
  attendees: string[]
  attachments?: EventAttachment[]
}

export interface User {
  id: number
  username: string
  slug: string
  fullname: string
  themeColor?: string
  createdAt?: string
  updatedAt?: string
  isLoggedIn: boolean
}

export interface Notification {
  id: number
  userId: number
  message: string
  isRead: boolean
  createdAt: string
  updatedAt: string
}

export interface NotificationsFeed {
  notifications: Notification[]
  unreadCount: number
  assignedWorkCount: number
}

export interface DayEvents {
  date: string
  events: CalendarEvent[]
}

export interface Report {
  id: number
  date?: string
  uploadedReport: string
  fileUrl: string
  fileName: string
  fileType?: string
  createdAt: string
  updatedAt?: string
}

export interface AuthPayload {
  token: string
  user: Omit<User, 'isLoggedIn'>
}

export interface EventInput {
  title: string
  description: string
  startDate: string
  endDate: string
  category: CalendarEvent['category']
  attendees: string[]
  attachments?: EventAttachment[]
}

export interface DocumentFile {
  id: number
  name: string
  type: string
  size: number
  url: string
  uploadedAt: string
  ownerId?: number
  workflowOwnerId?: number
  date?: string
  description?: string
  status: string
  assignedTo?: {
    id: number
    username: string
    fullname: string
  } | null
  folderId?: string
  createdAt?: string
  updatedAt?: string
}

export interface DocumentFolder {
  id: string
  title: string
  createdAt: string
  fileCount?: number
}

export interface DocumentsResponse {
  folders: DocumentFolder[]
  files: DocumentFile[]
}

export interface DocumentInput {
  folderName?: string
  fileName: string
  fileType?: string
  fileSize?: number
  uploadedFile?: string
  fileUrl?: string
  date?: string
  description?: string
  status?: string
  assignedToId?: number | null
}

export interface ReportInput {
  date?: string
  fileUrl: string
  fileName?: string
  fileType?: string
  uploadedReport?: string
}

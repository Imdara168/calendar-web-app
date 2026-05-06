import type {
  AuthPayload,
  CalendarEvent,
  DocumentFolder,
  DocumentInput,
  DocumentFile,
  DocumentsResponse,
  EventInput,
  Report,
  ReportInput,
  User,
} from './types'
import { clearStoredAuth, getStoredToken } from './auth-storage'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken()
  const headers = new Headers(init.headers)

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError(
        `Unable to reach the API server at ${API_URL}. Make sure the backend is running.`,
        0,
      )
    }

    throw error
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const message = data?.message
      ? Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message
      : 'Request failed'

    if (response.status === 401) {
      clearStoredAuth()
    }

    throw new ApiError(message, response.status)
  }

  return response.json() as Promise<T>
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong'
}

export async function login(input: { username: string; password: string }): Promise<AuthPayload> {
  return request<AuthPayload>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function signup(input: {
  username: string
  password: string
  fullname: string
}): Promise<AuthPayload> {
  return request<AuthPayload>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function forgotPassword(input: {
  username: string
}): Promise<{ message: string; username: string; resetToken: string }> {
  return request<{ message: string; username: string; resetToken: string }>('/auth/forget-password', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function changePassword(input: {
  username: string
  resetToken: string
  newPassword: string
}): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function changeOwnPassword(input: {
  currentPassword: string
  newPassword: string
}): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>('/auth/profile/change-password', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getCurrentUser(): Promise<User> {
  const user = await request<Omit<User, 'isLoggedIn'>>('/auth/me')
  return { ...user, isLoggedIn: true }
}

export async function getEvents(): Promise<CalendarEvent[]> {
  return request<CalendarEvent[]>('/events')
}

export async function createEvent(input: EventInput): Promise<CalendarEvent> {
  return request<CalendarEvent>('/events', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateEvent(id: number, input: Partial<EventInput>): Promise<CalendarEvent> {
  return request<CalendarEvent>(`/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteEvent(id: number): Promise<void> {
  await request<{ success: boolean }>(`/events/${id}`, {
    method: 'DELETE',
  })
}

export async function getDocuments(): Promise<DocumentsResponse> {
  return request<DocumentsResponse>('/documents')
}

export async function createDocument(input: DocumentInput): Promise<DocumentFile> {
  return request<DocumentFile>('/documents', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function createDocumentFolder(folderName: string): Promise<DocumentFolder> {
  return request<DocumentFolder>('/documents/folders', {
    method: 'POST',
    body: JSON.stringify({ folderName }),
  })
}

export async function updateDocumentFolder(folderName: string, newFolderName: string): Promise<DocumentFolder> {
  return request<DocumentFolder>('/documents/folders', {
    method: 'PATCH',
    body: JSON.stringify({ folderName, newFolderName }),
  })
}

export async function updateDocument(id: number, input: { folderName?: string }): Promise<DocumentFile> {
  return request<DocumentFile>(`/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteDocument(id: number): Promise<void> {
  await request<{ success: boolean }>(`/documents/${id}`, {
    method: 'DELETE',
  })
}

export async function deleteDocumentFolder(id: string): Promise<void> {
  await request<{ success: boolean }>(`/documents/folders?folderName=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function getReports(date?: string): Promise<Report[]> {
  const url = date ? `/reports?date=${encodeURIComponent(date)}` : '/reports'
  return request<Report[]>(url)
}

export async function createReport(input: ReportInput): Promise<Report> {
  return request<Report>('/reports', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function deleteReport(id: number): Promise<void> {
  await request<{ success: boolean }>(`/reports/${id}`, {
    method: 'DELETE',
  })
}

export type AppView = 'calendar' | 'dashboard' | 'reports' | 'documents'

export const DEFAULT_AUTH_REDIRECT = '/calendar'

const VIEW_PATHS: Record<AppView, string> = {
  calendar: '/calendar',
  dashboard: '/dashboard',
  reports: '/reports',
  documents: '/documents',
}

export const ROUTE_ALIASES: Record<string, string> = {
  '/report': VIEW_PATHS.reports,
  '/document': VIEW_PATHS.documents,
  '/api/v1/calendar': VIEW_PATHS.calendar,
  '/api/v1/dashboard': VIEW_PATHS.dashboard,
  '/api/v1/report': VIEW_PATHS.reports,
  '/api/v1/reports': VIEW_PATHS.reports,
  '/api/v1/document': VIEW_PATHS.documents,
  '/api/v1/documents': VIEW_PATHS.documents,
}

const PROTECTED_PATHS = new Set<string>([
  ...Object.values(VIEW_PATHS),
  ...Object.keys(ROUTE_ALIASES),
])

export function getViewPath(view: AppView): string {
  return VIEW_PATHS[view]
}

export function normalizeProtectedPath(pathname: string): string {
  return ROUTE_ALIASES[pathname] ?? pathname
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.has(pathname)
}

export function getSafeRedirectPath(redirectTo?: string | null): string {
  if (!redirectTo || !redirectTo.startsWith('/') || redirectTo.startsWith('//')) {
    return DEFAULT_AUTH_REDIRECT
  }

  try {
    const url = new URL(redirectTo, 'http://localhost')
    const normalizedPath = normalizeProtectedPath(url.pathname)

    if (!Object.values(VIEW_PATHS).includes(normalizedPath as AppView)) {
      return DEFAULT_AUTH_REDIRECT
    }

    return `${normalizedPath}${url.search}`
  } catch {
    return DEFAULT_AUTH_REDIRECT
  }
}

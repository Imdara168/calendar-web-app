import type { AuthPayload, User } from './types'
import { getTokenExpiry } from './auth-token'

export const TOKEN_KEY = 'calendar_auth_token'
const USER_KEY = 'calendar_auth_user'
const PASSWORD_RESET_KEY_PREFIX = 'calendar_password_reset_token:'
const DEFAULT_TOKEN_MAX_AGE = 60 * 60 * 24 * 7

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null

  const storedToken = localStorage.getItem(TOKEN_KEY)
  if (storedToken) {
    return storedToken
  }

  return getCookie(TOKEN_KEY)
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null

  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null

  try {
    const user = JSON.parse(raw) as Omit<User, 'isLoggedIn'>
    return { ...user, isLoggedIn: true }
  } catch {
    return null
  }
}

export function setStoredAuth(payload: AuthPayload) {
  if (typeof window === 'undefined') return

  localStorage.setItem(TOKEN_KEY, payload.token)
  localStorage.setItem(USER_KEY, JSON.stringify(payload.user))

  const expiry = getTokenExpiry(payload.token)
  const maxAge = expiry
    ? Math.max(0, Math.floor((expiry - Date.now()) / 1000))
    : DEFAULT_TOKEN_MAX_AGE

  if (maxAge > 0) {
    setCookie(TOKEN_KEY, payload.token, maxAge)
    return
  }

  clearCookie(TOKEN_KEY)
}

export function clearStoredAuth() {
  if (typeof window === 'undefined') return

  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  clearCookie(TOKEN_KEY)
}

export function setStoredPasswordResetToken(username: string, token: string) {
  if (typeof window === 'undefined') return

  sessionStorage.setItem(getPasswordResetKey(username), token)
}

export function getStoredPasswordResetToken(username: string): string | null {
  if (typeof window === 'undefined') return null

  return sessionStorage.getItem(getPasswordResetKey(username))
}

export function clearStoredPasswordResetToken(username: string) {
  if (typeof window === 'undefined') return

  sessionStorage.removeItem(getPasswordResetKey(username))
}

function getCookie(name: string): string | null {
  const prefix = `${name}=`

  for (const part of document.cookie.split('; ')) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length))
    }
  }

  return null
}

function setCookie(name: string, value: string, maxAge: number) {
  document.cookie =
    `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`
}

function getPasswordResetKey(username: string) {
  return `${PASSWORD_RESET_KEY_PREFIX}${username.trim()}`
}

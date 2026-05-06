'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dashboard } from '@/components/dashboard'
import { getCurrentUser } from '@/lib/api'
import { getSafeRedirectPath } from '@/lib/auth-routes'
import type { AppView } from '@/lib/auth-routes'
import { clearStoredAuth, getStoredUser } from '@/lib/auth-storage'
import type { User } from '@/lib/types'

interface AuthenticatedAppProps {
  initialView: AppView
}

export function AuthenticatedApp({ initialView }: AuthenticatedAppProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const redirectToSignIn = () => {
      const targetPath = getSafeRedirectPath(
        `${window.location.pathname}${window.location.search}`,
      )

      router.replace(`/?redirectTo=${encodeURIComponent(targetPath)}`)
    }

    const syncUser = async () => {
      const storedUser = getStoredUser()

      if (!storedUser) {
        clearStoredAuth()
        redirectToSignIn()
        return
      }

      setUser(storedUser)

      try {
        const freshUser = await getCurrentUser()

        if (!isMounted) {
          return
        }

        setUser(freshUser)
      } catch {
        clearStoredAuth()

        if (!isMounted) {
          return
        }

        setUser(null)
        redirectToSignIn()
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void syncUser()

    return () => {
      isMounted = false
    }
  }, [router])

  const handleLogout = () => {
    clearStoredAuth()
    setUser(null)
    router.replace('/')
  }

  if (isLoading || !user?.isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Dashboard
      user={user}
      onLogout={handleLogout}
      activeView={initialView}
    />
  )
}

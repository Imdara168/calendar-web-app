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

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser)
    if (typeof window !== 'undefined') {
      const { isLoggedIn, ...userToStore } = updatedUser
      localStorage.setItem('calendar_auth_user', JSON.stringify(userToStore))
    }
  }

  if (isLoading || !user?.isLoggedIn) {
    return (
      <div className="min-h-full flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        :root {
          --primary: ${user.themeColor || '#1972FA'};
          --ring: ${user.themeColor || '#1972FA'};
          --accent: color-mix(in srgb, ${user.themeColor || '#1972FA'}, white 20%);
          --calendar-odd: ${user.themeColor || '#1972FA'};
          --calendar-even: color-mix(in srgb, ${user.themeColor || '#1972FA'}, white 85%);
          --calendar-odd-foreground: white;
          --calendar-even-foreground: color-mix(in srgb, ${user.themeColor || '#1972FA'}, black 60%);
        }
        
        /* Force red hover on all primary action buttons */
        .bg-primary:hover {
          background-color: #EF4444 !important;
          color: white !important;
        }

        /* Hover effect for navigation links and other interactive primary elements */
        .text-primary:hover {
          color: #EF4444 !important;
        }
        
        .hover\:text-primary:hover {
          color: #EF4444 !important;
        }
      `}</style>
      <Dashboard
        user={user}
        onLogout={handleLogout}
        activeView={initialView}
        onUserUpdate={handleUserUpdate}
      />
    </>
  )
}

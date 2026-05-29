'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoginForm } from '@/components/login-form'
import { getSafeRedirectPath } from '@/lib/auth-routes'
import { clearStoredAuth, getStoredUser, setStoredAuth } from '@/lib/auth-storage'
import { getApiErrorMessage, getCurrentUser, login } from '@/lib/api'

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const redirectTo = getSafeRedirectPath(searchParams.get('redirectTo'))

  useEffect(() => {
    let isMounted = true

    const syncUser = async () => {
      const storedUser = getStoredUser()

      if (!storedUser) {
        if (isMounted) {
          setIsLoading(false)
        }
        return
      }

      try {
        await getCurrentUser()

        if (isMounted) {
          router.replace(redirectTo)
        }
      } catch {
        clearStoredAuth()
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
  }, [redirectTo, router])

  const handleLogin = async (username: string, password: string) => {
    const payload = await login({ username, password })
    setStoredAuth(payload)
    router.replace(redirectTo)
  }

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <LoginForm
      onLogin={handleLogin}
      getErrorMessage={getApiErrorMessage}
    />
  )
}

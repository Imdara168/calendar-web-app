'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoginForm } from '@/components/login-form'
import {
  clearStoredPasswordResetToken,
  getStoredPasswordResetToken,
} from '@/lib/auth-storage'
import { changePassword, getApiErrorMessage } from '@/lib/api'

export default function ChangePasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [resetToken, setResetToken] = useState('')
  const [isReady, setIsReady] = useState(false)
  const username = searchParams.get('username') ?? ''

  useEffect(() => {
    if (!username) {
      router.replace('/forget_password')
      return
    }

    const storedResetToken = getStoredPasswordResetToken(username)

    if (!storedResetToken) {
      router.replace(`/forget_password?username=${encodeURIComponent(username)}`)
      return
    }

    setResetToken(storedResetToken)
    setIsReady(true)
  }, [router, username])

  const handleChangePassword = async (
    username: string,
    resetToken: string,
    newPassword: string,
  ) => {
    await changePassword({
      username,
      resetToken,
      newPassword,
    })
    clearStoredPasswordResetToken(username)
    router.replace('/')
  }

  if (!isReady) {
    return (
      <div className="min-h-full flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <LoginForm
      key={`${username}:${resetToken}`}
      mode="change-password"
      initialUsername={username}
      initialResetToken={resetToken}
      onChangePassword={handleChangePassword}
      getErrorMessage={getApiErrorMessage}
    />
  )
}

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { LoginForm } from '@/components/login-form'
import { setStoredPasswordResetToken } from '@/lib/auth-storage'
import { forgotPassword, getApiErrorMessage } from '@/lib/api'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleForgotPassword = async (username: string) => {
    const result = await forgotPassword({ username })
    setStoredPasswordResetToken(result.username, result.resetToken)
    router.replace(`/change_password?username=${encodeURIComponent(result.username)}`)
  }

  return (
    <LoginForm
      mode="forgot-password"
      initialUsername={searchParams.get('username') ?? ''}
      onForgotPassword={handleForgotPassword}
      getErrorMessage={getApiErrorMessage}
    />
  )
}

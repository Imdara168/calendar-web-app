'use client'

import { useRouter } from 'next/navigation'
import { LoginForm } from '@/components/login-form'
import { getApiErrorMessage, signup } from '@/lib/api'
import { setStoredAuth } from '@/lib/auth-storage'

export default function SignupPage() {
  const router = useRouter()

  const handleSignup = async (username: string, password: string) => {
    const payload = await signup({
      username,
      password,
      fullname: username,
    })
    setStoredAuth(payload)
    router.replace('/calendar')
  }

  return (
    <LoginForm
      mode="signup"
      onSignup={handleSignup}
      getErrorMessage={getApiErrorMessage}
    />
  )
}

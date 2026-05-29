'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, Palette, Lock, User } from 'lucide-react'
import { changeOwnPassword, updateThemeColor, updateFullname, getApiErrorMessage } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { User as AppUser } from '@/lib/types'

interface ProfileSettingsDialogProps {
  user: AppUser
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (message: string) => void
  onUserUpdate: (user: AppUser) => void
  defaultTab?: 'theme' | 'password' | 'nickname'
}

export function ProfilePasswordDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
  onUserUpdate,
  defaultTab = 'theme',
}: ProfileSettingsDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fullname, setFullname] = useState(user.fullname || user.username)
  const [themeColor, setThemeColor] = useState(user.themeColor || '#1972FA')
  const [activeTab, setActiveTab] = useState<'theme' | 'password' | 'nickname'>(defaultTab)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const closeDialogThen = (callback?: () => void) => {
    onOpenChange(false)

    if (callback) {
      window.setTimeout(callback, 180)
    }
  }

  useEffect(() => {
    if (open) {
      setThemeColor(user.themeColor || '#1972FA')
      setFullname(user.fullname || user.username)
      setActiveTab(defaultTab)
      setError('')
      setIsSubmitting(false)
      return
    }

    setFullname(user.fullname || user.username)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowCurrentPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    setError('')
    setIsSubmitting(false)
  }, [defaultTab, open, user.fullname, user.themeColor, user.username])

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!currentPassword.trim()) {
      setError('Please enter your current password')
      return
    }

    if (newPassword.trim().length < 6) {
      setError('New password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    try {
      setIsSubmitting(true)
      await changeOwnPassword({
        currentPassword,
        newPassword,
      })
      closeDialogThen(() => {
        onSuccess('Password changed successfully.')
      })
    } catch (submitError) {
      setError(getApiErrorMessage(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleThemeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    try {
      setIsSubmitting(true)
      const updatedUser = await updateThemeColor(themeColor)
      closeDialogThen(() => {
        onUserUpdate(updatedUser)
        onSuccess('Theme color updated successfully.')
      })
    } catch (submitError) {
      setError(getApiErrorMessage(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNicknameSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const trimmedFullname = fullname.trim()

    if (!trimmedFullname) {
      setError('Please enter a nickname')
      return
    }

    try {
      setIsSubmitting(true)
      const updatedUser = await updateFullname(trimmedFullname)
      closeDialogThen(() => {
        onUserUpdate(updatedUser)
        onSuccess('Nickname updated successfully.')
      })
    } catch (submitError) {
      setError(getApiErrorMessage(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const presetColors = [
    '#1972FA',
    '#4F46E5',
    '#8B5CF6',
    '#EC4899',
    '#EF4444',
    '#F59E0B',
    '#10B981',
    '#06B6D4',
    '#0F172A',
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent className="sm:max-w-[425px] rounded-[24px]">
        <DialogHeader className="mb-2">
          <DialogTitle className="flex items-center gap-3 text-xl font-black text-slate-900">
            {activeTab === 'theme' ? (
              <>
                <Palette className="size-5 text-primary" />
                Appearance Settings
              </>
            ) : activeTab === 'nickname' ? (
              <>
                <User className="size-5 text-primary" />
                Nickname Settings
              </>
            ) : (
              <>
                <Lock className="size-5 text-primary" />
                Security Settings
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs font-medium text-slate-400">
            {activeTab === 'theme'
              ? 'Personalize your system interface colors.'
              : activeTab === 'nickname'
                ? 'Update the display name shown across the system.'
                : 'Update your account security credentials.'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {activeTab === 'theme' ? (
            <form onSubmit={handleThemeSubmit} className="space-y-6">
              <div className="space-y-5">
                <div className="grid grid-cols-5 gap-3">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setThemeColor(color)}
                      className={[
                        'relative size-10 rounded-full border-2 transition-all',
                        themeColor === color
                          ? 'border-primary scale-110 shadow-lg ring-2 ring-primary/20'
                          : 'border-white shadow-sm hover:scale-105 hover:shadow-md',
                      ].join(' ')}
                      style={{ backgroundColor: color }}
                    >
                      {themeColor === color && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="size-2 rounded-full bg-white shadow-sm" />
                        </div>
                      )}
                    </button>
                  ))}
                  <div className="group relative size-10 overflow-hidden rounded-full border-2 border-white shadow-sm transition-all hover:shadow-md">
                    <input
                      type="color"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="absolute inset-0 size-full cursor-pointer scale-150"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div
                    className="size-8 rounded-lg border-2 border-white shadow-sm"
                    style={{ backgroundColor: themeColor }}
                  />
                  <div className="flex flex-1 flex-col">
                    <span className="mb-1 text-[10px] font-black leading-none tracking-widest text-slate-400 uppercase">
                      Custom Hex
                    </span>
                    <Input
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="h-6 border-none bg-transparent p-0 text-sm font-mono uppercase focus-visible:ring-0"
                    />
                  </div>
                </div>
              </div>

              {error && <p className="text-center text-xs font-bold text-destructive">{error}</p>}

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="w-full rounded-xl py-6 font-bold shadow-md">
                  {isSubmitting ? 'Updating...' : 'Apply Appearance'}
                </Button>
              </DialogFooter>
            </form>
          ) : activeTab === 'nickname' ? (
            <form onSubmit={handleNicknameSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="profile-fullname"
                  className="text-xs font-black tracking-widest text-slate-400 uppercase"
                >
                  Nickname
                </label>
                <Input
                  id="profile-fullname"
                  value={fullname}
                  onChange={(event) => setFullname(event.target.value)}
                  placeholder="Enter display name"
                  className="h-11 rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-colors"
                />
                <p className="text-[11px] font-medium text-slate-400">
                  This name appears in the header and anywhere the system shows the current user.
                </p>
              </div>

              {error && <p className="text-center text-xs font-bold text-destructive">{error}</p>}

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="w-full rounded-xl py-6 font-bold shadow-md">
                  {isSubmitting ? 'Saving...' : 'Save Nickname'}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handlePasswordSubmit}>
              <div className="space-y-2">
                <label
                  htmlFor="current-password"
                  className="text-xs font-black tracking-widest text-slate-400 uppercase"
                >
                  Current Password
                </label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="Enter current password"
                    className="h-11 rounded-xl bg-slate-50 border-slate-100 pr-10 focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="new-password"
                  className="text-xs font-black tracking-widest text-slate-400 uppercase"
                >
                  New Password
                </label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Create new password"
                    className="h-11 rounded-xl bg-slate-50 border-slate-100 pr-10 focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirm-new-password"
                  className="text-xs font-black tracking-widest text-slate-400 uppercase"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat new password"
                    className="h-11 rounded-xl bg-slate-50 border-slate-100 pr-10 focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="mt-2 text-center text-xs font-bold text-destructive">{error}</p>}

              <DialogFooter className="mt-6">
                <Button type="submit" disabled={isSubmitting} className="w-full rounded-xl py-6 font-bold shadow-md">
                  {isSubmitting ? 'Saving...' : 'Secure Account'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

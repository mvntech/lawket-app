'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@/lib/utils/form'
import { Loader2, Eye, EyeOff, CheckCircle2, Circle, Monitor, Smartphone, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useChangePassword } from '@/hooks/use-settings'
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validations/profile.schema'
import { authService } from '@/services/auth.service'
import { toast } from 'sonner'

function PasswordStrengthIndicator({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains a number', met: /[0-9]/.test(password) },
  ]

  if (!password) return null

  return (
    <ul className="space-y-1 mt-2">
      {checks.map(({ label, met }) => (
        <li key={label} className="flex items-center gap-1.5 text-xs">
          {met ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className={met ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
        </li>
      ))}
    </ul>
  )
}

function getDeviceInfo() {
  const ua = navigator.userAgent
  const isMobile = /Mobi|Android/i.test(ua)
  let browser = 'Unknown browser'
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome'
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Edg')) browser = 'Edge'
  return { isMobile, browser }
}

export function SecuritySettings() {
  const changePassword = useChangePassword()
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [newPasswordValue, setNewPasswordValue] = useState('')
  const [signingOutOthers, setSigningOutOthers] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const newPasswordField = register('newPassword')

  function onSubmit(data: ChangePasswordInput) {
    changePassword.mutate(data.newPassword, {
      onSuccess: () => {
        reset()
      },
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Change password</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Current password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                {...register('currentPassword')}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                {...newPasswordField}
                onChange={(e) => {
                  setNewPasswordValue(e.target.value)
                  void newPasswordField.onChange(e)
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrengthIndicator password={newPasswordValue} />
            {errors.newPassword && (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" disabled={changePassword.isPending} className="w-full sm:w-auto">
            {changePassword.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Changing…
              </>
            ) : (
              'Change password'
            )}
          </Button>
        </form>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Active sessions</h2>

        {(() => {
          const { isMobile, browser } = getDeviceInfo()
          return (
            <div className="flex items-start gap-3 rounded-md border border-border bg-muted/40 px-4 py-3">
              {isMobile
                ? <Smartphone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                : <Monitor className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              }
              <div>
                <p className="text-sm font-medium">
                  {isMobile ? 'Mobile device' : 'Desktop'} · {browser}
                  <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400 font-normal">Current session</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This device is currently active.
                </p>
              </div>
            </div>
          )
        })()}

        <div className="space-y-3">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
            <span>
              Other active sessions cannot be listed for security reasons. If you suspect unauthorised access,
              use the button below to revoke all other sessions immediately.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={signingOutOthers}
            onClick={async () => {
              setSigningOutOthers(true)
              try {
                await authService.signOutOtherSessions()
                toast.success('All other sessions have been signed out.')
              } catch {
                toast.error('Failed to sign out other sessions. Please try again.')
              } finally {
                setSigningOutOthers(false)
              }
            }}
          >
            {signingOutOthers && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
            Sign out all other sessions
          </Button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@/lib/utils/form'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { OAuthButtons } from '@/components/auth/oauth-buttons'
import { useAuth } from '@/hooks/use-auth'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth.schema'
import { ROUTES } from '@/lib/constants/routes'
import { cn } from '@/lib/utils/cn'

function getPasswordStrength(password: string): { level: 0 | 1 | 2 | 3; label: string } {
  if (!password) return { level: 0, label: '' }
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { level: 1, label: 'Weak' }
  if (score === 2) return { level: 2, label: 'Medium' }
  return { level: 3, label: 'Strong' }
}

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { signUp, signUpStatus } = useAuth()
  const isPending = signUpStatus === 'pending'

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  const passwordValue = watch('password', '')
  const strength = getPasswordStrength(passwordValue)

  async function onSubmit(data: RegisterInput) {
    await signUp({
      email: data.email,
      password: data.password,
      fullName: data.full_name,
    }).catch(() => {
      // error handled via toast in useAuth
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Set up your Lawket account to get started.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form id="register-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              type="text"
              placeholder="Full Name"
              autoComplete="name"
              disabled={isPending}
              {...register('full_name')}
            />
            {errors.full_name && (
              <p className="text-xs text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              disabled={isPending}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isPending}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {passwordValue && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1 flex-1 rounded-full transition-colors',
                        strength.level >= i
                          ? strength.level === 1
                            ? 'bg-destructive'
                            : strength.level === 2
                              ? 'bg-primary'
                              : 'bg-green-500'
                          : 'bg-muted',
                      )}
                    />
                  ))}
                </div>
                <p
                  className={cn(
                    'text-xs',
                    strength.level === 1 && 'text-destructive',
                    strength.level === 2 && 'text-primary',
                    strength.level === 3 && 'text-green-500',
                  )}
                >
                  {strength.label}
                </p>
              </div>
            )}

            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm_password">Confirm password</Label>
            <div className="relative">
              <Input
                id="confirm_password"
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isPending}
                {...register('confirm_password')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirm_password && (
              <p className="text-xs text-destructive">{errors.confirm_password.message}</p>
            )}
          </div>
        </form>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or sign up with</span>
          <Separator className="flex-1" />
        </div>

        <OAuthButtons disabled={isPending} />
      </CardContent>

      <CardFooter className="flex-col gap-3">
        <Button type="submit" form="register-form" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          {isPending ? 'Creating account…' : 'Create account'}
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          Already have an account?{' '}
          <Link
            href={ROUTES.auth.login}
            className="text-foreground font-medium hover:underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

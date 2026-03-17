'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@/lib/utils/form'
import type { Route } from 'next'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { OAuthButtons } from '@/components/auth/oauth-buttons'
import { useAuth } from '@/hooks/use-auth'
import { loginSchema, type LoginInput } from '@/lib/validations/auth.schema'
import { ROUTES } from '@/lib/constants/routes'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { signIn, signInStatus } = useAuth()
  const isPending = signInStatus === 'pending'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginInput) {
    await signIn({ email: data.email, password: data.password }).catch(() => {
      // error handled via toast in useAuth
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Enter your credentials to access your account.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form id="login-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                autoComplete="current-password"
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
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="text-right">
            <Link
              href={ROUTES.auth.forgotPassword as Route}
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </form>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or sign in with</span>
          <Separator className="flex-1" />
        </div>

        <OAuthButtons disabled={isPending} />
      </CardContent>

      <CardFooter className="flex-col gap-3">
        <Button type="submit" form="login-form" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          {isPending ? 'Signing in…' : 'Sign in'}
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          {"Don't have an account?"}{' '}
          <Link
            href={ROUTES.auth.register as Route}
            className="text-foreground font-medium hover:underline underline-offset-4"
          >
            Create one
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

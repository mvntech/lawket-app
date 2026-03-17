'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@/lib/utils/form'
import Link from 'next/link'
import { Loader2, ArrowLeft } from 'lucide-react'
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
import { useAuth } from '@/hooks/use-auth'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/auth.schema'
import { ROUTES } from '@/lib/constants/routes'

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const { resetPassword, resetPasswordStatus } = useAuth()
  const isPending = resetPasswordStatus === 'pending'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  async function onSubmit(data: ForgotPasswordInput) {
    await resetPassword({ email: data.email })
      .then(() => setSubmitted(true))
      .catch(() => {
        // eerror handled via toast in useAuth
      })
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If an account exists for that email address, you will receive a password reset link
            shortly.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href={ROUTES.auth.login} className="w-full">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>
          Enter your email address and we will send you a reset link.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
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
        </CardContent>

        <CardFooter className="flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            {isPending ? 'Sending…' : 'Send reset link'}
          </Button>

          <Link href={ROUTES.auth.login} className="w-full">
            <Button variant="ghost" className="w-full" type="button">
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Button>
          </Link>
        </CardFooter>
      </form>
    </Card>
  )
}

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Input, Label } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')

  function onSubmit(e) {
    e.preventDefault()
    toast('Password reset endpoints are not implemented in your backend yet. Please contact the administrator.', { icon: 'ℹ️' })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <img src="/brand/mark.svg" alt="Smart Waste" className="h-10 w-10" />
          <div>
            <div className="text-lg font-semibold">Forgot password</div>
            <div className="text-sm text-muted">We’ll send instructions if backend reset is enabled.</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <Button className="w-full" type="submit">Request reset</Button>
        </form>

        <div className="mt-4 text-sm">
          <Link className="text-[rgb(var(--brand))] hover:underline" to="/login">Back to sign in</Link>
        </div>

        <div className="mt-6 rounded-2xl border border-app bg-black/5 p-4 text-xs text-muted dark:bg-white/5">
          To enable real password resets, add backend endpoints (e.g., /auth/forgot, /auth/reset) and wire them here.
        </div>
      </CardContent>
    </Card>
  )
}

import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Input, Label } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { sdk } from '../../lib/sdk'

const COOLDOWN_DEFAULT = 60 // should match OTP_RESEND_COOLDOWN_SEC

function getErrMessage(err, fallback = 'Request failed') {
  return (
    err?.response?.data?.message ||
    err?.message ||
    fallback
  )
}

function parseWaitSeconds(message) {
  // backend message example: "Please wait 57s before requesting a new OTP."
  const m = String(message || '').match(/(\d+)\s*s/i)
  return m ? Number(m[1]) : null
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState('email') // email | otp | reset
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // resend cooldown UI
  const [cooldown, setCooldown] = useState(0)

  // tick cooldown
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email])

  async function sendOtp(e) {
    e.preventDefault()
    if (!normalizedEmail) return toast.error('Email is required')

    setLoading(true)
    try {
      await sdk.auth.forgotPassword({ email: normalizedEmail })
      toast.success('OTP sent to your email.')
      setStep('otp')
      setCooldown(COOLDOWN_DEFAULT)
    } catch (err) {
      const status = err?.response?.status
      const msg = getErrMessage(err, 'Failed to send OTP')

      if (status === 429) {
        // show friendly message and start cooldown based on server message (if present)
        const wait = parseWaitSeconds(msg)
        toast.error(msg || 'Please wait for a while before resending OTP.')
        if (typeof wait === 'number' && wait > 0) setCooldown(wait)
        else setCooldown(COOLDOWN_DEFAULT)
        return
      }

      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp(e) {
    e.preventDefault()
    const code = String(otp || '').trim()

    if (!normalizedEmail || !code) {
      return toast.error('Email and OTP are required')
    }
    if (code.length < 4) {
      return toast.error('Enter the OTP from your email')
    }

    setLoading(true)
    try {
      const res = await sdk.auth.verifyOtp({ email: normalizedEmail, otp: code })
      setResetToken(res?.resetToken || '')
      toast.success('OTP verified. Set your new password.')
      setStep('reset')
    } catch (err) {
      const msg = getErrMessage(err, 'Invalid OTP')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword(e) {
    e.preventDefault()

    if (!normalizedEmail) return toast.error('Email is required')
    if (!resetToken) return toast.error('Missing reset token. Please verify OTP again.')
    if (newPassword.length < 6) return toast.error('Minimum 6 characters')
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match')

    setLoading(true)
    try {
      await sdk.auth.resetPassword({
        email: normalizedEmail,
        resetToken,
        newPassword,
      })

      toast.success('Password updated. Please sign in.')
      navigate('/login', { replace: true })
    } catch (err) {
      const msg = getErrMessage(err, 'Failed to reset password')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  function backToOtpOrEmail() {
    // keep current cooldown running; user can resend when allowed
    setOtp('')
    setStep('otp')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <img src="/brand/mark.svg" alt="Smart Waste" className="h-10 w-10" />
          <div>
            <div className="text-lg font-semibold">Forgot password</div>
            <div className="text-sm text-muted">
              {step === 'email'
                ? 'Enter your email to receive OTP.'
                : step === 'otp'
                ? 'Enter OTP from your email.'
                : 'Create a new password.'}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {step === 'email' ? (
          <form onSubmit={sendOtp} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <Button className="w-full" type="submit" disabled={loading || cooldown > 0}>
              {loading ? 'Sending...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Send OTP'}
            </Button>

            {cooldown > 0 ? (
              <div className="text-xs text-muted">
                Please wait {cooldown}s before requesting a new OTP.
              </div>
            ) : null}
          </form>
        ) : null}

        {step === 'otp' ? (
          <form onSubmit={verifyOtp} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={normalizedEmail} disabled />
            </div>

            <div>
              <Label>OTP</Label>
              <Input
                inputMode="numeric"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit OTP"
              />
            </div>

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="w-full text-sm text-[rgb(var(--brand))] hover:underline disabled:opacity-50"
                onClick={sendOtp}
                disabled={loading || cooldown > 0}
              >
                {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
              </button>

              <button
                type="button"
                className="w-full text-sm text-muted hover:underline disabled:opacity-50"
                onClick={() => setStep('email')}
                disabled={loading}
              >
                Change email
              </button>
            </div>
          </form>
        ) : null}

        {step === 'reset' ? (
          <form onSubmit={resetPassword} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={normalizedEmail} disabled />
            </div>

            <div>
              <Label>New password</Label>
              <Input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <div>
              <Label>Confirm password</Label>
              <Input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update password'}
            </Button>

            <button
              type="button"
              className="w-full text-sm text-muted hover:underline disabled:opacity-50"
              onClick={backToOtpOrEmail}
              disabled={loading}
            >
              Back to OTP
            </button>
          </form>
        ) : null}

        <div className="mt-4 text-sm">
          <Link className="text-[rgb(var(--brand))] hover:underline" to="/login">
            Back to sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

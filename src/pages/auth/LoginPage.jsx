import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Input, Label } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { useYupForm } from '../../hooks/useYupForm'
import { useAuth } from '../../providers/AuthProvider'
import toast from 'react-hot-toast'
import * as yup from 'yup'

const schema = yup.object({
  email: yup.string().trim().email('Enter a valid email').required('Email is required'),
  password: yup.string().required('Password is required').min(6, 'Minimum 6 characters'),
})

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  // If user was redirected to login from a protected page, go back there after login.
  const fromPath = useMemo(() => {
    const stateFrom = location.state?.from?.pathname
    return typeof stateFrom === 'string' ? stateFrom : null
  }, [location.state])

  const { values, errors, handleChange, handleSubmit, isSubmitting, setErrors } = useYupForm({
    initialValues: { email: '', password: '' },
    schema,
    validateOnChange: true,
    onSubmit: async (vals) => {
      const res = await login(vals.email.trim(), vals.password)
      if (res?.ok) {
        navigate(fromPath || '/app', { replace: true })
        return { ok: true }
      }

      // Prefer field error if backend says invalid credentials
      // (your AuthProvider already toasts; to avoid toast spam, you can remove toast in provider)
      setErrors?.((prev) => ({ ...prev, password: 'Invalid email or password' }))
      return { ok: false }
    },
  })

  async function onFormSubmit(e) {
    const res = await handleSubmit(e)
    if (!res?.ok) toast.error('Please fix the highlighted fields.')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <img src="/brand/mark.svg" alt="Smart Waste" className="h-10 w-10" />
          <div>
            <div className="text-lg font-semibold">Sign in</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={onFormSubmit} className="space-y-10">
          <div>
            <Label>Email</Label>
            <Input
              className={`mt-1 ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              name="email"
              value={values.email}
              onChange={handleChange}
              type="email"
              placeholder="admin@gmail.com"
              aria-invalid={errors.email ? 'true' : 'false'}
            />
            {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email}</p> : null}
          </div>

          <div>
            <Label>Password</Label>
            <Input
              className={`mt-1 ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              name="password"
              value={values.password}
              onChange={handleChange}
              type="password"
              placeholder="••••••••"
              aria-invalid={errors.password ? 'true' : 'false'}
            />
            {errors.password ? <p className="mt-1 text-xs text-red-600">{errors.password}</p> : null}
          </div>

          <Button disabled={isSubmitting} className="w-full" type="submit">
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link className="text-[rgb(var(--brand))] hover:underline" to="/forgot-password">
            Forgot password?
          </Link>
          <Link className="text-[rgb(var(--brand))] hover:underline" to="/register">
            Create account
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

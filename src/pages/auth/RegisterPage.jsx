import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Input, Label } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { useTheme } from '../../hooks/useTheme'
import { useYupForm } from '../../hooks/useYupForm'
import { useAuth } from '../../hooks/useAuth'
import { Moon, Sun } from 'lucide-react'
import toast from 'react-hot-toast'
import * as yup from 'yup'

const schema = yup.object({
  name: yup.string().trim().min(2, 'Enter a valid name').required('Full name is required'),
  email: yup.string().email('Enter a valid email').required('Email is required'),
  password: yup.string().required('Password is required').min(6, 'Minimum 6 characters'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords do not match')
    .required('Confirm your password'),
})

export default function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const { register } = useAuth() // ✅ remove logout

  const fromPath = useMemo(() => {
    const stateFrom = location.state?.from?.pathname
    return typeof stateFrom === 'string' ? stateFrom : null
  }, [location.state])

  const { values, errors, handleChange, handleSubmit, isSubmitting } = useYupForm({
    initialValues: { name: '', email: '', password: '', confirmPassword: '' },
    schema,
    validateOnChange: true,
    onSubmit: async (vals) => {
      const res = await register({
        name: vals.name,
        email: vals.email.trim(),
        password: vals.password,
      })

      if (res?.ok) {
        // ✅ only ONE toast (RegisterPage owns it)
        toast.success('Account created. Please sign in.')
        navigate('/login', {
          replace: true,
          state: fromPath ? { from: { pathname: fromPath } } : undefined,
        })
      } else {
        toast.error(res?.message || 'Sign up failed.')
      }
    },
  })

  async function onFormSubmit(e) {
    const res = await handleSubmit(e)
    if (!res?.ok) toast.error('Please fix the highlighted fields.')
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-semibold tracking-tight">Waste Management Portal</div>
            <div className="text-sm text-slate-600 dark:text-slate-300">Citizen Registration</div>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm"
            onClick={toggleTheme}
            type="button"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <Card>
          <CardHeader>
            <div className="text-sm text-slate-600 dark:text-slate-300">WELCOME TO OUR PORTAL</div>
          </CardHeader>
          <CardContent>
            <form onSubmit={onFormSubmit} className="space-y-4">
              <div>
                <Label>Full name</Label>
                <Input className="mt-1" name="name" value={values.name} onChange={handleChange} />
                {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
              </div>

              <div>
                <Label>Email</Label>
                <Input className="mt-1" name="email" type="email" value={values.email} onChange={handleChange} />
                {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email}</p> : null}
              </div>

              <div>
                <Label>Password</Label>
                <Input className="mt-1" name="password" type="password" value={values.password} onChange={handleChange} />
                {errors.password ? <p className="mt-1 text-xs text-red-600">{errors.password}</p> : null}
              </div>

              <div>
                <Label>Confirm password</Label>
                <Input
                  className="mt-1"
                  name="confirmPassword"
                  type="password"
                  value={values.confirmPassword}
                  onChange={handleChange}
                />
                {errors.confirmPassword ? <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p> : null}
              </div>

              <Button disabled={isSubmitting} className="w-full" type="submit">
                {isSubmitting ? 'Creating...' : 'Create account'}
              </Button>
            </form>

            <div className="mt-4 text-sm">
              Already have an account?{' '}
              <Link className="text-[rgb(var(--brand))] hover:underline" to="/login">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

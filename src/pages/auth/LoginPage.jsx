import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input, Label } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useYupForm } from "../../hooks/useYupForm";
import { useAuth } from "../../providers/AuthProvider";
import toast from "react-hot-toast";
import * as yup from "yup";
import { Eye, EyeOff } from "lucide-react";

const schema = yup.object({
  email: yup.string().trim().email("Enter a valid email").required("Email is required"),
  password: yup.string().required("Password is required").min(6, "Minimum 6 characters"),
});

const TOAST_AUTH_ID = "login-auth-toast";
const TOAST_FORM_ID = "login-form-toast";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const fromPath = useMemo(() => {
    const stateFrom = location.state?.from?.pathname;
    return typeof stateFrom === "string" ? stateFrom : null;
  }, [location.state]);

  const { values, errors, handleChange, handleSubmit, isSubmitting, setErrors } = useYupForm({
    initialValues: { email: "", password: "" },
    schema,
    validateOnChange: true,
    onSubmit: async (vals) => {
      const res = await login(vals.email.trim(), vals.password);

      if (res?.ok) {
        toast.dismiss(TOAST_AUTH_ID);
        toast.dismiss(TOAST_FORM_ID);
        navigate(fromPath || "/app", { replace: true });
        return { ok: true, reason: "success" };
      }

      setErrors?.((prev) => ({ ...prev, password: "Invalid email or password" }));
      toast.error(res?.message || "Invalid email or password", { id: TOAST_AUTH_ID, duration: 5000 });
      return { ok: false, reason: "auth" };
    },
  });

  async function onFormSubmit(e) {
    e.preventDefault();
    const res = await handleSubmit(e);
    if (!res?.ok && res?.reason !== "auth") {
      toast.error("Please fix the highlighted fields.", { id: TOAST_FORM_ID, duration: 5000 });
    }
  }

  return (
    // ✅ Card has NO border, and inherits the white surface from AuthLayout
    <Card className="border-0 shadow-none bg-transparent">
      {/* ✅ remove header border divider */}
      <CardHeader className="border-b border-transparent p-4">
        <div className="flex items-center gap-3 bg-transparent border border-transparent">
          <img src="/brand/mark.svg" alt="Smart Waste" className="h-10 w-10" />
          <div>
            <div className="text-lg font-semibold">Sign in</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 bg-transparent border border-transparent">
        <form onSubmit={onFormSubmit} className="space-y-10">
          <div>
            <Label>Email</Label>
            <Input
              className={`mt-1 ${errors.email ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
              name="email"
              value={values.email}
              onChange={handleChange}
              type="email"
              placeholder="admin@gmail.com"
              aria-invalid={errors.email ? "true" : "false"}
              autoComplete="email"
            />
            {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email}</p> : null}
          </div>

          <div>
            <Label>Password</Label>
            <div className="relative mt-1">
              <Input
                className={`pr-12 ${errors.password ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                name="password"
                value={values.password}
                onChange={handleChange}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                aria-invalid={errors.password ? "true" : "false"}
                autoComplete="current-password"
              />

              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password ? <p className="mt-1 text-xs text-red-600">{errors.password}</p> : null}
          </div>

          <Button disabled={isSubmitting} className="w-full" type="submit">
            {isSubmitting ? "Signing in..." : "Sign in"}
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
  );
}

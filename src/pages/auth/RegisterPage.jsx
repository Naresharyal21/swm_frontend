import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input, Label } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useYupForm } from "../../hooks/useYupForm";
import { useAuth } from "../../hooks/useAuth";
import toast from "react-hot-toast";
import * as yup from "yup";
import { EyeOff, Eye } from "lucide-react";

const schema = yup.object({
  name: yup.string().trim().min(2, "Enter a valid name").required("Full name is required"),
  email: yup.string().email("Enter a valid email").required("Email is required"),
  password: yup.string().required("Password is required").min(6, "Minimum 6 characters"),
  confirmPassword: yup.string().oneOf([yup.ref("password")], "Passwords do not match").required("Confirm your password"),
});

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fromPath = useMemo(() => {
    const stateFrom = location.state?.from?.pathname;
    return typeof stateFrom === "string" ? stateFrom : null;
  }, [location.state]);

  const { values, errors, handleChange, handleSubmit, isSubmitting } = useYupForm({
    initialValues: { name: "", email: "", password: "", confirmPassword: "" },
    schema,
    validateOnChange: true,
    onSubmit: async (vals) => {
      const res = await register({
        name: vals.name,
        email: vals.email.trim(),
        password: vals.password,
      });

      if (res?.ok) {
        toast.success("Account created. Please sign in.");
        navigate("/login", {
          replace: true,
          state: fromPath ? { from: { pathname: fromPath } } : undefined,
        });
        return { ok: true };
      }

      return { ok: false };
    },
  });

  async function onFormSubmit(e) {
    e.preventDefault();
    const res = await handleSubmit(e);
    if (!res?.ok && Object.keys(errors || {}).length) {
      toast.error("Please fix the highlighted fields.");
    }
  }

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="border-b border-transparent p-4">
        <div className="flex items-center gap-3 bg-transparent border border-transparent">
          <img src="/brand/mark.svg" alt="Smart Waste" className="h-10 w-10" />
          <div>
            <div className="text-lg font-semibold">Create account</div>
            <div className="text-sm text-slate-600 dark:text-slate-300">Citizen Registration</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 bg-transparent border border-transparent">
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
            <div className="relative mt-1">
              <Input
                className={`pr-12 ${errors.password ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                name="password"
                type={showPassword ? "text" : "password"}
                value={values.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
                aria-invalid={errors.password ? "true" : "false"}
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

          <div>
            <Label>Confirm password</Label>
            <div className="relative mt-1">
              <Input
                className={`pr-12 ${
                  errors.confirmPassword ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                }`}
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={values.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
                aria-invalid={errors.confirmPassword ? "true" : "false"}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword ? (
              <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
            ) : null}
          </div>

          <Button disabled={isSubmitting} className="w-full" type="submit">
            {isSubmitting ? "Creating..." : "Create account"}
          </Button>
        </form>

        <div className="mt-4 text-sm">
          Already have an account?{" "}
          <Link className="text-[rgb(var(--brand))] hover:underline" to="/login">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input, Label } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useYupForm } from "../../hooks/useYupForm";
import toast from "react-hot-toast";
import * as yup from "yup";
import { EyeOff, Eye } from "lucide-react";
import { sdk } from "../../lib/sdk";

const schema = yup.object({
  name: yup.string().trim().min(2, "Enter a valid name").required("Full name is required"),
  email: yup.string().email("Enter a valid email").required("Email is required"),
  password: yup.string().required("Password is required").min(6, "Minimum 6 characters"),
  confirmPassword: yup.string().oneOf([yup.ref("password")], "Passwords do not match").required("Confirm your password"),
});

// Signup OTP settings (should match backend env for signup)
const COOLDOWN_DEFAULT = 60; // SIGNUP_OTP_RESEND_COOLDOWN_SEC
const OTP_EXPIRES_DEFAULT = 60; // SIGNUP_OTP_TTL_SEC

function getErrMessage(err, fallback = "Request failed") {
  return err?.response?.data?.message || err?.message || fallback;
}

function parseWaitSeconds(message) {
  // backend message example: "Please wait 57s before requesting a new OTP."
  const m = String(message || "").match(/(\d+)\s*s/i);
  return m ? Number(m[1]) : null;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState("form"); // form | otp
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [expires, setExpires] = useState(0);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fromPath = useMemo(() => {
    const stateFrom = location.state?.from?.pathname;
    return typeof stateFrom === "string" ? stateFrom : null;
  }, [location.state]);

  // tick cooldown + expiry timer
  useEffect(() => {
    if (cooldown <= 0 && expires <= 0) return;
    const t = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
      setExpires((e) => Math.max(0, e - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown, expires]);

  const { values, errors, handleChange, handleSubmit, isSubmitting } = useYupForm({
    initialValues: { name: "", email: "", password: "", confirmPassword: "" },
    schema,
    validateOnChange: true,
    onSubmit: async () => ({ ok: true }), // we handle submit manually based on step
  });

  const normalizedEmail = useMemo(() => String(values.email || "").trim().toLowerCase(), [values.email]);

  async function requestOtp() {
    // validate form first
    const res = await handleSubmit();
    if (!res?.ok && Object.keys(errors || {}).length) {
      toast.error("Please fix the highlighted fields.");
      return false;
    }

    if (!values.name?.trim()) return toast.error("Full name is required"), false;
    if (!normalizedEmail) return toast.error("Email is required"), false;
    if ((values.password || "").length < 6) return toast.error("Minimum 6 characters"), false;
    if (values.password !== values.confirmPassword) return toast.error("Passwords do not match"), false;

    try {
      const out = await sdk.auth.signupRequestOtp({
        name: values.name.trim(),
        email: normalizedEmail,
        password: values.password,
      });

      toast.success("OTP sent to your email.");
      setStep("otp");
      setOtp("");

      setExpires(Number(out?.expiresInSeconds || OTP_EXPIRES_DEFAULT));
      setCooldown(COOLDOWN_DEFAULT);
      return true;
    } catch (err) {
      const status = err?.response?.status;
      const msg = getErrMessage(err, "Failed to send OTP");

      if (status === 429) {
        const wait = parseWaitSeconds(msg);
        toast.error(msg || "Please wait before resending OTP.");
        setCooldown(typeof wait === "number" && wait > 0 ? wait : COOLDOWN_DEFAULT);
        return false;
      }

      toast.error(msg);
      return false;
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    const code = String(otp || "").trim();

    if (!normalizedEmail || !code) return toast.error("Email and OTP are required");
    if (code.length < 4) return toast.error("Enter the OTP from your email");

    try {
      await sdk.auth.signupVerifyOtp({ email: normalizedEmail, otp: code });

      toast.success("Account created. Please sign in.");
      navigate("/login", {
        replace: true,
        state: fromPath ? { from: { pathname: fromPath } } : undefined,
      });
    } catch (err) {
      toast.error(getErrMessage(err, "Invalid OTP"));
    }
  }

  async function resendOtp() {
    if (cooldown > 0) return;
    await requestOtp();
  }

  async function cancelSignup() {
    try {
      if (normalizedEmail) {
        await sdk.auth.signupCancel({ email: normalizedEmail });
      }
      toast.success("Signup cancelled");
    } catch (err) {
      toast.error(getErrMessage(err, "Failed to cancel signup"));
    } finally {
      setStep("form");
      setOtp("");
      setExpires(0);
      setCooldown(0);
    }
  }

  async function onFormSubmit(e) {
    e.preventDefault();
    if (step === "form") {
      await requestOtp();
      return;
    }
  }

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="border-b border-transparent p-4">
        <div className="flex items-center gap-3 bg-transparent border border-transparent">
          <img src="/brand/mark.svg" alt="Smart Waste" className="h-10 w-10" />
          <div>
            <div className="text-lg font-semibold">Create account</div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              {step === "form" ? "Citizen Registration (OTP verification)" : "Enter OTP to complete registration"}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 bg-transparent border border-transparent">
        {step === "form" ? (
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
              {errors.confirmPassword ? <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p> : null}
            </div>

            <Button disabled={isSubmitting} className="w-full" type="submit">
              {isSubmitting ? "Sending OTP..." : cooldown > 0 ? `Wait ${cooldown}s` : "Send OTP"}
            </Button>

            {cooldown > 0 ? (
              <div className="text-xs text-muted">Please wait {cooldown}s before requesting a new OTP.</div>
            ) : null}

            <div className="mt-4 text-sm">
              Already have an account?{" "}
              <Link className="text-[rgb(var(--brand))] hover:underline" to="/login">
                Sign in
              </Link>
            </div>
          </form>
        ) : null}

        {step === "otp" ? (
          <form onSubmit={verifyOtp} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input className="mt-1" type="email" value={normalizedEmail} disabled />
            </div>

            <div>
              <Label>OTP</Label>
              <Input
                className="mt-1"
                inputMode="numeric"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit OTP"
              />
            </div>

            <div className="text-xs text-muted">
              OTP expires in: <span className="font-semibold">{expires || OTP_EXPIRES_DEFAULT}s</span>
            </div>

            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Verifying..." : "Verify OTP & Create account"}
            </Button>

            {/* ✅ actions in one row: Resend | Cancel | Change */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                className="text-sm font-medium text-[rgb(var(--brand))] hover:underline disabled:opacity-50"
                onClick={resendOtp}
                disabled={isSubmitting || cooldown > 0}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
              </button>

              <span className="text-xs text-muted">|</span>

              <button
                type="button"
                className="text-sm font-medium text-[rgb(var(--brand))] hover:underline disabled:opacity-50"
                onClick={cancelSignup}
                disabled={isSubmitting}
              >
                Cancel signup
              </button>

              <span className="text-xs text-muted">|</span>

              <button
                type="button"
                className="text-sm font-medium text-[rgb(var(--brand))] hover:underline disabled:opacity-50"
                onClick={() => {
                  setStep("form");
                  setOtp("");
                  setExpires(0);
                  setCooldown(0);
                }}
                disabled={isSubmitting}
              >
                Change details
              </button>
            </div>

            {/* ✅ little down */}
            <div className="mt-6 text-sm text-center">
              Already have an account?{" "}
              <Link className="text-[rgb(var(--brand))] hover:underline" to="/login">
                Sign in
              </Link>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

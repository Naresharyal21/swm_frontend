import React from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function AuthLayout() {
  const { isAuthed } = useAuth();
  const loc = useLocation();

  const { resolvedTheme, setTheme } = useTheme();

  // ✅ Fix hydration mismatch for theme UI
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (isAuthed) {
    const to = loc.state?.from || "/app";
    return <Navigate to={to} replace />;
  }

  const PANEL_MIN_H = "min-h-[560px]";
  const isDark = mounted ? resolvedTheme === "dark" : false; // safe default before mount

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 grid place-items-center p-4 sm:p-8">
      <div className="w-full max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
          {/* LEFT BRAND PANEL */}
          <div className={`relative overflow-hidden rounded-3xl bg-slate-900 text-white p-10 ${PANEL_MIN_H}`}>
            <div
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
                backgroundSize: "44px 44px",
              }}
            />
            <div className="absolute -top-40 -left-40 h-[420px] w-[420px] rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-200/90 shadow-sm">
                  <img src="/brand/mark.svg" alt="Smart Waste" className="h-10 w-10" />
                </div>
                <div className="leading-tight">
                  <div className="text-xl font-extrabold">WasteIQ</div>
                  <div className="text-xs tracking-wider font-semibold text-white/70">SMART CITY SOLUTIONS</div>
                </div>
              </div>

              <div className="mt-14 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2 w-fit">
                <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                <span className="text-sm text-white/80 font-medium">Real-time monitoring active</span>
              </div>

              <div className="mt-10">
                <h1 className="text-5xl font-extrabold leading-[1.05]">
                  Intelligence for <br />
                  <span className="text-emerald-200">sustainable</span> cities.
                </h1>
                <p className="mt-6 text-white/70 text-lg leading-relaxed max-w-md">
                  Optimize collection routes, reduce carbon footprint, and manage city resources with our AI-driven IoT
                  platform.
                </p>
              </div>

              <div className="mt-auto pt-10 text-white/50 text-sm flex flex-wrap gap-x-6 gap-y-2">
                <span>© {new Date().getFullYear()} WasteIQ Systems</span>
                <a className="hover:text-white/70" href="#">
                  Platform Status
                </a>
                <a className="hover:text-white/70" href="#">
                  Documentation
                </a>
              </div>
            </div>
          </div>

          {/* RIGHT FORM PANEL */}
          <div className={`flex items-stretch ${PANEL_MIN_H}`}>
            <div className="w-full">
              <div className="h-full flex flex-col">
                {/* Theme toggle */}
                <div className="flex justify-end">
                  <button
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm bg-white dark:bg-slate-950 hover:bg-black/5 dark:hover:bg-white/10 transition"
                    type="button"
                    aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                    title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                    onClick={() => setTheme(isDark ? "light" : "dark")}
                    disabled={!mounted}
                  >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
                  </button>
                </div>

                <div className="flex-1 flex items-center">
                  <div className="w-full max-w-md mx-auto">
                    <Outlet />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

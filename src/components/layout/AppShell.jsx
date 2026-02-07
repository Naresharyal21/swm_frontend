import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  LayoutDashboard,
  Leaf,
  Users,
  Map,
  Home,
  Trash2,
  Truck,
  CreditCard,
  Sparkles,
  ClipboardList,
  Route as RouteIcon,
  Radar,
  BadgeDollarSign,
  Bell,
  Wallet,
  FileText,
  Settings,
  Menu,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "../../providers/AuthProvider";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

function group(title, items) {
  return { title, items };
}

function getNav(role) {
  const base = [group("Overview", [{ label: "Dashboard", to: "/app", icon: LayoutDashboard }])];

  if (role === "ADMIN") {
    return [
      ...base,
      group("Management", [
        { label: "Users", to: "/app/admin/users", icon: Users },
        { label: "Zones", to: "/app/admin/zones", icon: Map },
        { label: "Households", to: "/app/admin/households", icon: Home },
        { label: "Bins", to: "/app/admin/bins", icon: Trash2 },
        { label: "Virtual Bins", to: "/app/admin/virtual-bins", icon: Radar },
        { label: "Vehicles", to: "/app/admin/vehicles", icon: Truck },
      ]),
      group("Billing & Rewards", [
        { label: "Billing Plans", to: "/app/admin/billing-plans", icon: CreditCard },
        { label: "Membership Plans", to: "/app/admin/membership-plans", icon: Sparkles },
        { label: "Reward Rates", to: "/app/admin/reward-rates", icon: BadgeDollarSign },
      ]),
      group("IoT", [{ label: "Telemetry", to: "/app/admin/telemetry", icon: Radar }]),
      group("Operations", [
        { label: "Cases", to: "/app/ops/cases", icon: ClipboardList },
        { label: "Tasks", to: "/app/ops/tasks", icon: ClipboardList },
        { label: "Routes", to: "/app/ops/routes", icon: RouteIcon },
        { label: "Digital Twin", to: "/app/ops/digital-twin", icon: Radar },
        { label: "Reward Claims", to: "/app/ops/reward-claims", icon: BadgeDollarSign },
        { label: "Billing Generate", to: "/app/ops/billing", icon: FileText },
      ]),
    ];
  }

  if (role === "SUPERVISOR") {
    return [
      ...base,
      group("Operations", [
        { label: "Cases", to: "/app/ops/cases", icon: ClipboardList },
        { label: "Tasks", to: "/app/ops/tasks", icon: ClipboardList },
        { label: "Routes", to: "/app/ops/routes", icon: RouteIcon },
        { label: "Digital Twin", to: "/app/ops/digital-twin", icon: Radar },
        { label: "Reward Claims", to: "/app/ops/reward-claims", icon: BadgeDollarSign },
        { label: "Billing Generate", to: "/app/ops/billing", icon: FileText },
      ]),
    ];
  }

  if (role === "CREW") {
    return [
      ...base,
      group("Crew", [
        { label: "Today's Route", to: "/app/crew/today", icon: RouteIcon },
        { label: "Tasks", to: "/app/crew/tasks", icon: ClipboardList },
        { label: "Recyclables Verify", to: "/app/crew/recyclables", icon: Leaf },
        { label: "Exceptions Log", to: "/app/crew/exceptions", icon: ClipboardList },
      ]),
    ];
  }

  // CITIZEN (default)
  return [
    ...base,
    group("Citizen", [
      { label: "Wallet", to: "/app/citizen/wallet", icon: Wallet },
      { label: "Invoices", to: "/app/citizen/invoices", icon: FileText },
      { label: "Billing Plans", to: "/app/citizen/billing-plans", icon: CreditCard },
      { label: "Household Settings", to: "/app/citizen/household-settings", icon: Settings },
      { label: "Collection Schedule", to: "/app/citizen/schedule", icon: RouteIcon },
      { label: "Membership", to: "/app/citizen/membership", icon: Sparkles },
      { label: "Litter Report", to: "/app/citizen/litter-report", icon: Trash2 },
      { label: "Bulky Request", to: "/app/citizen/bulky-request", icon: Truck },
      { label: "Missed Pickup", to: "/app/citizen/missed-pickup", icon: ClipboardList },
      { label: "My Cases", to: "/app/citizen/my-cases", icon: ClipboardList },
      { label: "Reward Claim", to: "/app/citizen/reward-claim", icon: BadgeDollarSign },
      { label: "Recyclables", to: "/app/citizen/recyclables", icon: Leaf },
      { label: "Notifications", to: "/app/citizen/notifications", icon: Bell },

      // ✅ NEW
      { label: "Contact & Feedback", to: "/app/citizen/contact-feedback", icon: FileText },
    ]),
  ];
}

function getInitials(user) {
  const name = (user?.name || "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "U";
    const last = (parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[0]) || "U";
    return (first + last).toUpperCase();
  }

  const email = (user?.email || "").trim();
  if (email) {
    const local = email.split("@")[0] || "";
    const tokens = local.split(/[._-]+/).filter(Boolean);
    const first = tokens[0]?.[0] || local[0] || "U";
    const last = (tokens.length > 1 ? tokens[tokens.length - 1]?.[0] : local[1] || first) || "U";
    return (first + last).toUpperCase();
  }

  return "U";
}

function SideNav({ role, onNavigate }) {
  const nav = useMemo(() => getNav(role), [role]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(var(--brand),0.14)]">
          <img src="/brand/mark.svg" alt="Smart Waste" className="h-10 w-10" />
        </div>
        <div>
          <div className="text-sm font-semibold">Smart Waste</div>
          <div className="text-xs text-muted">Management System</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {nav.map((g) => (
          <div key={g.title} className="mt-4">
            <div className="px-3 text-xs font-semibold tracking-wide text-muted">{g.title}</div>

            <div className="mt-2 flex flex-col gap-1">
              {g.items.map((it) => {
                const Icon = it.icon;

                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.to === "/app"}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all",
                        "pl-4",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950",
                        isActive
                          ? "bg-[rgba(var(--brand),0.14)] text-[rgb(var(--brand))] shadow-sm"
                          : "text-app hover:bg-black/5 dark:hover:bg-white/5"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute left-1 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full transition-opacity",
                          "bg-[rgb(var(--brand))]",
                          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                        )}
                      />
                    )}

                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                        "bg-black/5 dark:bg-white/5",
                        "group-hover:bg-black/10 dark:group-hover:bg-white/10"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <span className="flex-1">{it.label}</span>
                    <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-70 transition-opacity" />
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-app p-4 text-xs text-muted">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[rgb(var(--brand))]" />
          Smart Waste Management • Green
        </div>
      </div>
    </div>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || "CITIZEN";

  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  // Search setup
  const navGroups = useMemo(() => getNav(role), [role]);
  const navItems = useMemo(
    () => navGroups.flatMap((g) => g.items.map((it) => ({ ...it, group: g.title }))),
    [navGroups]
  );

  const [navSearch, setNavSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef(null);
  const blurTimerRef = useRef(null);

  const results = useMemo(() => {
    const q = navSearch.trim().toLowerCase();
    if (!q) return [];
    return navItems
      .filter((it) => it.label.toLowerCase().includes(q) || it.group.toLowerCase().includes(q))
      .slice(0, 8);
  }, [navSearch, navItems]);

  useEffect(() => {
    function onKeyDown(e) {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
        return;
      }
      if (!typing && e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function openSearch() {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    setSearchOpen(true);
  }
  function closeSearchSoon() {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => setSearchOpen(false), 150);
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const initials = getInitials(user);

  return (
    <div className="min-h-screen bg-app text-app">
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="hidden h-screen w-72 shrink-0 border-r border-app lg:block">
          <SideNav role={role} />
        </aside>

        <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
            <Dialog.Content className="fixed left-0 top-0 h-full w-[85vw] max-w-xs border-r border-app bg-[rgb(var(--card))] shadow-soft lg:hidden">
              <SideNav role={role} onNavigate={() => setMobileOpen(false)} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-app bg-[rgb(var(--bg))]/75 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-6">
              {/* LEFT: simple welcome */}
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  variant="ghost"
                  className="lg:hidden hover:bg-black/5 dark:hover:bg-white/5"
                  onClick={() => setMobileOpen((v) => !v)}
                >
                  <Menu className="h-4 w-4" />
                </Button>

                <div className="hidden sm:block">
                  <div className="text-sm font-semibold leading-tight">Welcome back</div>
                  <div className="text-xs text-muted leading-tight">Keep the city clean & sustainable</div>
                </div>
              </div>

              {/* RIGHT: Toggle (rightmost) -> User -> Search */}
              <div className="flex items-center gap-2 justify-end">
                {/* Search (3rd from right) */}
                <div className="relative hidden md:block w-[300px] max-w-[32vw]">
                  <div className="flex items-center gap-2 rounded-2xl border border-app bg-[rgb(var(--card))] px-3 py-2">
                    <Search className="h-4 w-4 text-muted" />
                    <input
                      ref={searchRef}
                      value={navSearch}
                      onChange={(e) => {
                        setNavSearch(e.target.value);
                        setActiveIndex(0);
                        if (!searchOpen) setSearchOpen(true);
                      }}
                      onFocus={openSearch}
                      onBlur={closeSearchSoon}
                      onKeyDown={(e) => {
                        if (!results.length) return;

                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setActiveIndex((i) => Math.min(i + 1, results.length - 1));
                        }
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setActiveIndex((i) => Math.max(i - 1, 0));
                        }
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const target = results[activeIndex];
                          if (target) {
                            navigate(target.to);
                            setNavSearch("");
                            setSearchOpen(false);
                          }
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setNavSearch("");
                          setSearchOpen(false);
                          searchRef.current?.blur();
                        }
                      }}
                      placeholder="Search…"
                      className="w-full bg-transparent text-sm outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                    {navSearch ? (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setNavSearch("");
                          setSearchOpen(false);
                          searchRef.current?.focus();
                        }}
                        className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10"
                        title="Clear"
                      >
                        <X className="h-4 w-4 text-muted" />
                      </button>
                    ) : null}
                  </div>

                  {searchOpen && results.length > 0 && (
                    <div
                      onMouseDown={(e) => e.preventDefault()}
                      className="absolute right-0 mt-2 w-full overflow-hidden rounded-2xl border border-app bg-[rgb(var(--card))] shadow-soft"
                    >
                      <div className="max-h-72 overflow-auto p-1">
                        {results.map((r, idx) => {
                          const Icon = r.icon;
                          const active = idx === activeIndex;
                          return (
                            <button
                              key={r.to}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                navigate(r.to);
                                setNavSearch("");
                                setSearchOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition",
                                active ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"
                              )}
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/5 dark:bg-white/5">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold truncate">{r.label}</div>
                                <div className="text-xs text-muted truncate">{r.group}</div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* User dropdown (NO COLOR avatar; letters only) */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      className="
                        flex items-center gap-3 rounded-2xl border border-app bg-[rgb(var(--card))] px-3 py-2
                        hover:bg-black/5 dark:hover:bg-white/5 transition
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                        focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950
                      "
                    >
                      <div
                        className="
                          flex h-9 w-9 items-center justify-center rounded-2xl
                          border border-app bg-transparent
                        "
                        title={user?.name || "User"}
                      >
                        <span className="text-sm font-semibold text-app">{initials}</span>
                      </div>

                      <div className="hidden text-left sm:block">
                        <div className="text-sm font-semibold leading-tight">{user?.name || "User"}</div>
                        <div className="text-xs text-muted leading-tight">{role}</div>
                      </div>
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      className="z-50 min-w-[220px] rounded-2xl border border-app bg-[rgb(var(--card))] p-1 shadow-soft"
                    >
                      <DropdownMenu.Item
                        onSelect={(e) => {
                          e.preventDefault();
                          navigate("/app");
                        }}
                        className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                      </DropdownMenu.Item>

                      <DropdownMenu.Separator className="my-1 h-px bg-[rgb(var(--border))]" />

                      <DropdownMenu.Item
                        onSelect={(e) => {
                          e.preventDefault();
                          handleLogout();
                        }}
                        className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        <LogOut className="h-4 w-4" /> Logout
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>

                {/* Mode toggle (rightmost) */}
                <Button
                  variant="ghost"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  title="Toggle dark mode"
                  className="hover:bg-black/5 dark:hover:bg-white/5"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-6">
            <Outlet />
          </main>

          <footer className="border-t border-app px-4 py-4 text-xs text-muted lg:px-6">
            © {new Date().getFullYear()} Smart Waste Management • Green
          </footer>
        </div>
      </div>
    </div>
  );
}

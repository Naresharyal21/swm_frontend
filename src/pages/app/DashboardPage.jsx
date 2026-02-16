import React, { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";


import { sdk } from "../../lib/sdk";
import { Link } from "react-router-dom";

import { formatMoney } from "../../lib/utils";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../providers/AuthProvider";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import AdminBinsHeatmapCard from "../../components/admin/AdminBinsHeatmapCard";


import {
  Users,
  MapPin,
  Home,
  Trash2,
  Truck,
  FileText,
  CheckSquare,
  Route,
  Monitor,
  Calendar,
  Package,
  Recycle,
  Eye,
  Wallet,
  Bell,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Activity,
  Zap,
  ArrowRight,
  BarChart3,
  Shield,
  Clock,
  Award,
} from "lucide-react";

// Enhanced StatCard with optimized dark mode colors
function StatCard({ title, value, hint, icon: Icon, trend, color = "blue" }) {
  // Light mode gradient backgrounds
  const lightGradients = {
    blue: "from-blue-50 to-blue-100/50",
    green: "from-green-50 to-green-100/50",
    purple: "from-purple-50 to-purple-100/50",
    orange: "from-orange-50 to-orange-100/50",
    pink: "from-pink-50 to-pink-100/50",
  };

  // Dark mode gradient backgrounds with enhanced contrast
  const darkGradients = {
    blue: "dark:from-blue-950/40 dark:to-blue-900/20",
    green: "dark:from-green-950/40 dark:to-green-900/20",
    purple: "dark:from-purple-950/40 dark:to-purple-900/20",
    orange: "dark:from-orange-950/40 dark:to-orange-900/20",
    pink: "dark:from-pink-950/40 dark:to-pink-900/20",
  };

  // Light mode borders
  const lightBorders = {
    blue: "border-blue-200",
    green: "border-green-200",
    purple: "border-purple-200",
    orange: "border-orange-200",
    pink: "border-pink-200",
  };

  // Dark mode borders with better visibility
  const darkBorders = {
    blue: "dark:border-blue-800/50",
    green: "dark:border-green-800/50",
    purple: "dark:border-purple-800/50",
    orange: "dark:border-orange-800/50",
    pink: "dark:border-pink-800/50",
  };

  // Light mode icon backgrounds
  const lightIconBg = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
    pink: "bg-pink-100 text-pink-600",
  };

  // Dark mode icon backgrounds with optimized contrast
  const darkIconBg = {
    blue: "dark:bg-blue-900/50 dark:text-blue-400",
    green: "dark:bg-green-900/50 dark:text-green-400",
    purple: "dark:bg-purple-900/50 dark:text-purple-400",
    orange: "dark:bg-orange-900/50 dark:text-orange-400",
    pink: "dark:bg-pink-900/50 dark:text-pink-400",
  };

  return (
    <Card
      className={`
        relative overflow-hidden border-2 bg-gradient-to-br 
        ${lightGradients[color]} ${darkGradients[color]}
        ${lightBorders[color]} ${darkBorders[color]}
        hover:shadow-2xl dark:hover:shadow-blue-900/20
        transition-all duration-300 hover:-translate-y-1
        dark:bg-gray-900/50 backdrop-blur-sm
      `}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              {title}
            </div>
            <div className="text-3xl font-bold tracking-tight mb-1 text-gray-900 dark:text-gray-100">
              {value}
            </div>
            {hint && (
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500 mt-2">
                <Activity className="h-3 w-3" />
                {hint}
              </div>
            )}
            {trend && (
              <div className={`flex items-center gap-1 text-xs font-semibold mt-2 ${trend > 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
                }`}>
                <TrendingUp className={`h-3 w-3 ${trend < 0 ? 'rotate-180' : ''}`} />
                {Math.abs(trend)}% vs last period
              </div>
            )}
          </div>
          {Icon && (
            <div className={`
              p-3 rounded-xl 
              ${lightIconBg[color]} ${darkIconBg[color]}
              transition-colors duration-300
            `}>
              <Icon className="h-6 w-6" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Role-based greeting component with dark mode optimization
function WelcomeHeader({ role, user }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const roleDescriptions = {
    ADMIN: "Complete system control and analytics at your fingertips",
    SUPERVISOR: "Operational excellence through real-time monitoring",
    CREW: "Field operations and task execution hub",
    CITIZEN: "Your personalized waste management portal",
  };

  const roleIcons = {
    ADMIN: Shield,
    SUPERVISOR: Monitor,
    CREW: Truck,
    CITIZEN: Home,
  };

  const RoleIcon = roleIcons[role] || Home;

  return (
    <div className="
      relative overflow-hidden rounded-2xl 
      bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600
      dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900
      p-8 text-white shadow-2xl
      dark:shadow-indigo-900/50
    ">
      {/* Overlay for dark mode depth */}
      <div className="absolute inset-0 bg-black/10 dark:bg-black/30"></div>

      {/* Animated blur circles - adjusted for dark mode */}
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 dark:bg-white/5 blur-3xl"></div>
      <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-white/10 dark:bg-white/5 blur-3xl"></div>

      {/* Subtle grid pattern for dark mode */}
      <div className="absolute inset-0 opacity-10 dark:opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}>
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <RoleIcon className="h-8 w-8 drop-shadow-lg" />
              <Badge
                variant="secondary"
                className="
                  text-xs font-semibold 
                  bg-white/20 dark:bg-white/10 
                  text-white border-white/30 dark:border-white/20
                  backdrop-blur-sm
                "
              >
                {role}
              </Badge>
            </div>
            <h1 className="text-4xl font-bold mb-2 drop-shadow-lg">
              {getGreeting()}, {user?.name || "User"}!
            </h1>
            <p className="text-lg text-white/90 dark:text-white/80 font-medium">
              {roleDescriptions[role]}
            </p>
          </div>
          <div className="
            hidden sm:flex items-center gap-2 text-sm 
            bg-white/20 dark:bg-white/10 
            rounded-lg px-4 py-2 backdrop-blur-sm
            border border-white/20 dark:border-white/10
          ">
            <Clock className="h-4 w-4" />
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick action button with enhanced dark mode
function QuickActionButton({ to, icon: Icon, label, description }) {
  return (
    <Link to={to} className="group">
      <Card className="
        h-full border-2 
        hover:border-primary 
        hover:shadow-xl dark:hover:shadow-primary/20
        transition-all duration-300 hover:-translate-y-1 
        bg-gradient-to-br 
        from-white to-gray-50 
        dark:from-gray-900 dark:to-gray-800
        dark:border-gray-700
      ">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div
  className="
    p-3 rounded-xl
    bg-primary/10 dark:bg-primary/20
    text-primary dark:text-primary-foreground
    group-hover:bg-primary
    group-hover:text-primary-foreground
    transition-colors duration-300
    shadow-sm dark:shadow-primary/10
  "
>
  <Icon className="h-6 w-6 stroke-current" />
</div>
            <div className="flex-1">
              <div className="
                font-semibold text-base mb-1 
                group-hover:text-primary dark:group-hover:text-primary
                transition-colors
                text-gray-900 dark:text-gray-100
              ">
                {label}
              </div>
              {description && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {description}
                </div>
              )}
            </div>
            <ArrowRight className="
              h-5 w-5 
              text-gray-400 dark:text-gray-600
              group-hover:text-primary dark:group-hover:text-primary
              group-hover:translate-x-1 
              transition-all
            " />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Section Header component
function SectionHeader({ icon: Icon, title, badge }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
        <Icon className="h-6 w-6 text-primary dark:text-primary" />
        {title}
      </h2>
      {badge && (
        <Badge
          variant="outline"
          className="text-xs border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
        >
          {badge}
        </Badge>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role || "CITIZEN";

  // Query configurations
  const queryConfigs =
    role === "ADMIN"
      ? [
        { key: "users", queryKey: ["users"], queryFn: () => sdk.admin.listUsers() },
        { key: "zones", queryKey: ["zones"], queryFn: () => sdk.admin.listZones() },
        { key: "households", queryKey: ["households"], queryFn: () => sdk.admin.listHouseholds() },
        { key: "bins", queryKey: ["bins"], queryFn: () => sdk.admin.listBins() },
        { key: "vehicles", queryKey: ["vehicles"], queryFn: () => sdk.admin.listVehicles() },
      ]
      : role === "SUPERVISOR"
        ? [
          { key: "ops_cases", queryKey: ["ops_cases"], queryFn: () => sdk.ops.listCases() },
          { key: "ops_tasks", queryKey: ["ops_tasks"], queryFn: () => sdk.ops.listTasks() },
        ]
        : role === "CREW"
          ? [
            { key: "crew_today", queryKey: ["crew_today"], queryFn: () => sdk.crew.todayRoute({}) },
            { key: "crew_tasks", queryKey: ["crew_tasks"], queryFn: () => sdk.crew.listMyTasks({}) },
          ]
          : [
            { key: "wallet", queryKey: ["wallet"], queryFn: () => sdk.citizen.wallet() },
            { key: "invoices", queryKey: ["invoices"], queryFn: () => sdk.citizen.listInvoices() },
            { key: "notifications", queryKey: ["notifications"], queryFn: () => sdk.citizen.notifications({ unreadOnly: true }) },
          ];

  const queryResults = useQueries({ queries: queryConfigs });

  const data = useMemo(() => {
    const map = {};
    queryResults.forEach((result, index) => {
      map[queryConfigs[index].key] = result.data;
    });
    return map;
  }, [queryResults, queryConfigs]);

  if (queryResults.some((q) => q.isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-950">
        <div className="text-center space-y-4">
          <div className="
            animate-spin rounded-full h-12 w-12 
            border-b-2 border-primary 
            mx-auto
            shadow-lg dark:shadow-primary/20
          "></div>
          <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8 min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      {/* Welcome Header */}
      <WelcomeHeader role={role} user={user} />

      {/* ADMIN Dashboard */}
      {role === "ADMIN" && (
        <>
          <div>
            <SectionHeader icon={BarChart3} title="System Overview" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard
                title="Total Users"
                value={(data.users?.items || []).length}
                icon={Users}
                color="blue"
                trend={12.5}
                hint="Active accounts"
              />
              <StatCard
                title="Service Zones"
                value={(data.zones?.items || []).length}
                icon={MapPin}
                color="green"
                hint="Coverage areas"
              />
              <StatCard
                title="Households"
                value={(data.households?.items || []).length}
                icon={Home}
                color="purple"
                trend={8.3}
                hint="Registered homes"
              />
              <StatCard
                title="Smart Bins"
                value={(data.bins?.items || []).length}
                icon={Trash2}
                color="orange"
                hint="IoT enabled"
              />
              <StatCard
                title="Fleet Vehicles"
                value={(data.vehicles?.items || []).length}
                icon={Truck}
                color="pink"
                hint="Active trucks"
              />
            </div>
          </div>

          <div>
            <SectionHeader icon={Activity} title="Analytics & Insights" />
            <div className="lg:col-span-2">
              <AdminBinsHeatmapCard />
            </div>
          </div>
        </>
      )}

      {/* SUPERVISOR Dashboard */}
      {role === "SUPERVISOR" && (
        <div>
          <SectionHeader icon={Monitor} title="Operations Center" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Active Cases"
              value={(data.ops_cases?.items || []).length}
              icon={FileText}
              color="blue"
              hint="Pending resolution"
            />
            <StatCard
              title="Assigned Tasks"
              value={(data.ops_tasks?.items || []).length}
              icon={CheckSquare}
              color="green"
              hint="In progress"
            />
            <StatCard
              title="Route Planning"
              value="Optimize"
              icon={Route}
              color="purple"
              hint="Generate & publish routes"
            />
            <StatCard
              title="Digital Twin"
              value="Monitor"
              icon={Monitor}
              color="orange"
              hint="Real-time bin levels"
            />
          </div>
        </div>
      )}

      {/* CREW Dashboard */}
      {role === "CREW" && (
        <div>
          <SectionHeader icon={Truck} title="Field Operations" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Today's Routes"
              value={(data.crew_today?.routes || []).length}
              icon={Calendar}
              color="blue"
              hint="Scheduled pickups"
            />
            <StatCard
              title="My Tasks"
              value={(data.crew_tasks?.items || []).length}
              icon={CheckSquare}
              color="green"
              hint="Pending completion"
            />
            <StatCard
              title="Proof Upload"
              value="Required"
              icon={Package}
              color="purple"
              hint="Service verification"
            />
            <StatCard
              title="Recyclables"
              value="Verify"
              icon={Recycle}
              color="orange"
              hint="Quality check needed"
            />
          </div>
        </div>
      )}

      {/* CITIZEN Dashboard */}
      {role === "CITIZEN" && (
        <div>
          <SectionHeader icon={Wallet} title="Your Account" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Wallet Balance"
              value={`Rs. ${formatMoney(data.wallet?.balance || 0)}`}

              color="green"
              trend={15.2}
              hint="Available funds"
            />
            <StatCard
              title="Open Invoices"
              value={(data.invoices?.items || []).filter((x) => x.status !== "PAID").length}
              icon={FileText}
              color="orange"
              hint="Pending payments"
            />
            <StatCard
              title="Notifications"
              value={(data.notifications?.items || []).length}
              icon={Bell}
              color="blue"
              hint="Unread alerts"
            />
            <StatCard
              title="Rewards"
              value="Earn More"
              icon={Award}
              color="purple"
              hint="Submit recyclables"
            />
          </div>
        </div>
      )}

      {/* Quick Actions Section */}
      <div>
        <SectionHeader icon={Zap} title="Quick Actions" badge="Most Used" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {role === "ADMIN" && (
            <>
              <QuickActionButton to="/app/admin/users" icon={Users} label="Create Users" description="Add new system users" />
              <QuickActionButton to="/app/admin/zones" icon={MapPin} label="Manage Zones" description="Configure service areas" />
              <QuickActionButton to="/app/ops/routes" icon={Route} label="Generate Routes" description="Optimize collection paths" />
              <QuickActionButton to="/app/admin/billing-plans" icon={DollarSign} label="Billing Plans" description="Manage pricing tiers" />
            </>
          )}

          {role === "SUPERVISOR" && (
            <>
              <QuickActionButton to="/app/ops/cases" icon={FileText} label="Review Cases" description="Process incidents" />
              <QuickActionButton to="/app/ops/tasks" icon={CheckSquare} label="Assign Tasks" description="Delegate work items" />
              <QuickActionButton to="/app/ops/routes" icon={Route} label="Routes" description="Plan collections" />
              <QuickActionButton to="/app/ops/digital-twin" icon={Monitor} label="Digital Twin" description="View live status" />
            </>
          )}

          {role === "CREW" && (
            <>
              <QuickActionButton to="/app/crew/today" icon={Calendar} label="Today's Route" description="View schedule" />
              <QuickActionButton to="/app/crew/tasks" icon={CheckSquare} label="My Tasks" description="Complete assignments" />
              <QuickActionButton to="/app/crew/recyclables" icon={Recycle} label="Verify Recyclables" description="Quality inspection" />
              <QuickActionButton to="/app" icon={Eye} label="Field Overview" description="Status dashboard" />
            </>
          )}

          {role === "CITIZEN" && (
            <>
              <QuickActionButton to="/app/citizen/litter-report" icon={AlertCircle} label="Report Litter" description="Flag issues" />
              <QuickActionButton to="/app/citizen/bulky-request" icon={Package} label="Bulky Pickup" description="Request collection" />
              <QuickActionButton to="/app/citizen/recyclables" icon={Recycle} label="Submit Recyclables" description="Earn rewards" />
              <QuickActionButton to="/app/citizen/invoices" icon={FileText} label="Pay Invoices" description="Manage bills" />
            </>
          )}
        </div>
      </div>

      {/* Tips Section - Dark Mode Optimized */}
      <Card className="
        border-2 border-dashed 
        border-primary/30 dark:border-primary/20
        bg-primary/5 dark:bg-primary/10
        backdrop-blur-sm
      ">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="
              p-2 rounded-lg 
              bg-primary/10 dark:bg-primary/20
              text-primary dark:text-primary-foreground
            ">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base mb-1 text-gray-900 dark:text-gray-100">
                Pro Tip
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Keep your backend seed script updated and add missing edit/delete endpoints when needed.
                The UI will automatically enable those actions once the APIs exist.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

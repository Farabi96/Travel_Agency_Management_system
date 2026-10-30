import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MapPin,
  Package,
  Users,
  CalendarCheck,
  CreditCard,
  Wrench,
  ArrowUpRight,
  Clock3,
  ShieldCheck,
  Receipt,
  RefreshCw,
  Globe2,
  TrendingUp,
  UserRound,
  CircleDollarSign,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import CustomerDashboard from "./CustomerDashboard";
import StaffDashboard from "./StaffDashboard";

const API_BASE_URL = "http://127.0.0.1:5000/api";

const CHART_COLORS = [
  "#0f766e",
  "#2563eb",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#64748b",
];

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Destinations", icon: MapPin, to: "/destinations" },
  { label: "Tour Packages", icon: Package, to: "/packages" },
  { label: "Users & Staff", icon: Users, to: "/admin/users" },
  { label: "Bookings", icon: CalendarCheck, to: "/booking-tracking" },
  { label: "Payments", icon: CreditCard, to: "/payments" },
  { label: "Refund Management", icon: Receipt, to: "/refunds" },
  { label: "Staff Activity", icon: UserRound, to: "/admin/staff-activity" },
  { label: "Utilities", icon: Wrench, to: "/admin/utilities" },

];

const formatBDT = (amount) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const compactNumber = (value) =>
  new Intl.NumberFormat("en-BD", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
            {eyebrow}
          </p>
        )}
        <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function ChartCard({ title, description, children, className = "" }) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6 ${className}`}
    >
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyChart({ loading, message }) {
  return (
    <div className="flex h-full min-h-56 flex-col items-center justify-center rounded-xl bg-slate-50/80 px-4 text-center">
      <div className="mb-3 rounded-full bg-white p-3 text-slate-400 shadow-sm">
        <TrendingUp size={22} />
      </div>
      <p className="text-sm font-medium text-slate-600">
        {loading ? "Loading analytics…" : message}
      </p>
      {!loading && (
        <p className="mt-1 text-xs text-slate-400">
          Data will appear here when available.
        </p>
      )}
    </div>
  );
}

function StatCard({ title, value, note, icon: Icon, accent, loading }) {
  const accentStyles = {
    teal: "bg-teal-50 text-teal-700 ring-teal-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  };

  return (
    <article className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className={`rounded-xl p-3 ring-1 ${accentStyles[accent] || accentStyles.teal}`}>
          <Icon size={21} strokeWidth={2} />
        </div>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
          Overview
        </span>
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
        {loading ? (
          <span className="inline-block h-8 w-24 animate-pulse rounded-md bg-slate-100 align-middle" />
        ) : (
          value
        )}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p>
    </article>
  );
}

export default function Dashboard() {
  const location = useLocation();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    destinations: null,
    packages: null,
    users: null,
    customers: null,
    bookings: null,
    paidRevenue: null,
    refundedAmount: null,
    netRevenue: null,
    bookingStatusBreakdown: {},
    paymentStatusBreakdown: {},
    monthlyBookings: [],
    monthlyRevenue: [],
    loading: true,
    error: "",
  });

  const token = sessionStorage.getItem("access_token");
  const savedUser = sessionStorage.getItem("user");

  const user = useMemo(() => {
    if (!savedUser) return null;
    try {
      return JSON.parse(savedUser);
    } catch {
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("user");
      return null;
    }
  }, [savedUser]);

  useEffect(() => {
    if (!token || !user || user.role_name !== "HIGHER_ADMIN") return undefined;

    const controller = new AbortController();

    async function loadStats() {
      setRefreshing(true);
      try {
        const [destinationResponse, packageResponse, statsResponse] =
          await Promise.all([
            fetch(`${API_BASE_URL}/destinations/`, {
              signal: controller.signal,
            }),
            fetch(`${API_BASE_URL}/packages/`, {
              signal: controller.signal,
            }),
            fetch(`${API_BASE_URL}/admin/stats`, {
              headers: { Authorization: `Bearer ${token}` },
              signal: controller.signal,
            }),
          ]);

        if (!destinationResponse.ok || !packageResponse.ok || !statsResponse.ok) {
          if (statsResponse.status === 401) {
            throw new Error("Your session may have expired. Please log in again.");
          }
          if (statsResponse.status === 403) {
            throw new Error("You are not authorized to view admin statistics.");
          }
          throw new Error("Unable to load dashboard statistics. Please try again.");
        }

        const [destinations, packages, userStats] = await Promise.all([
          destinationResponse.json(),
          packageResponse.json(),
          statsResponse.json(),
        ]);

        setStats({
          destinations: Array.isArray(destinations) ? destinations.length : 0,
          packages: Array.isArray(packages) ? packages.length : 0,
          users: userStats.total_users ?? 0,
          customers: userStats.total_customers ?? 0,
          bookings: userStats.total_bookings ?? 0,
          paidRevenue: userStats.paid_revenue ?? 0,
          refundedAmount: userStats.refunded_amount ?? 0,
          netRevenue: userStats.net_revenue ?? 0,
          bookingStatusBreakdown: userStats.booking_status_breakdown ?? {},
          paymentStatusBreakdown: userStats.payment_status_breakdown ?? {},
          monthlyBookings: Array.isArray(userStats.monthly_bookings)
            ? userStats.monthly_bookings
            : [],
          monthlyRevenue: Array.isArray(userStats.monthly_revenue)
            ? userStats.monthly_revenue
            : [],
          loading: false,
          error: "",
        });
      } catch (error) {
        if (error.name === "AbortError") return;
        setStats((previous) => ({
          ...previous,
          loading: false,
          error: error.message || "Statistics could not be loaded.",
        }));
      } finally {
        if (!controller.signal.aborted) setRefreshing(false);
      }
    }

    loadStats();
    return () => controller.abort();
  }, [token, user?.role_name, location.key]);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role_name === "HIGHER_ADMIN") {
    const bookingStatusData = Object.entries(stats.bookingStatusBreakdown).map(
      ([name, value]) => ({ name: name.replaceAll("_", " "), count: Number(value) || 0 })
    );
    const paymentStatusData = Object.entries(stats.paymentStatusBreakdown).map(
      ([name, value]) => ({ name: name.replaceAll("_", " "), count: Number(value) || 0 })
    );

    // Always display the last six calendar months. Months with no records are
    // explicitly shown as zero instead of disappearing from the timeline.
    const lastSixMonths = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - index));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en", { month: "short", year: "2-digit" });
      return { key, label };
    });

    const monthlyBookingsByMonth = new Map(
      stats.monthlyBookings.map((item) => [item.month, Number(item.bookings) || 0])
    );
    const monthlyRevenueByMonth = new Map(
      stats.monthlyRevenue.map((item) => [item.month, {
        paidRevenue: Number(item.paid_revenue) || 0,
        refundedAmount: Number(item.refunded_amount) || 0,
        netRevenue: Number(item.net_revenue) || 0,
      }])
    );

    const monthlyBookingsChart = lastSixMonths.map(({ key, label }) => ({
      month: label,
      bookings: monthlyBookingsByMonth.get(key) ?? 0,
    }));
    const monthlyRevenueChart = lastSixMonths.map(({ key, label }) => {
      const revenue = monthlyRevenueByMonth.get(key) ?? {};
      return {
        month: label,
        paid_revenue: revenue.paidRevenue ?? 0,
        refunded_amount: revenue.refundedAmount ?? 0,
        net_revenue: revenue.netRevenue ?? 0,
      };
    });

    const overviewCards = [
      {
        title: "Destinations",
        value: stats.destinations ?? "—",
        note: "Places available in your catalogue",
        icon: MapPin,
        accent: "teal",
      },
      {
        title: "Tour packages",
        value: stats.packages ?? "—",
        note: "Packages available to customers",
        icon: Package,
        accent: "blue",
      },
      {
        title: "Total bookings",
        value: stats.bookings ?? "—",
        note: "All recorded bookings",
        icon: CalendarCheck,
        accent: "violet",
      },
      {
        title: "Registered users",
        value: stats.users ?? "—",
        note: "All registered accounts",
        icon: Users,
        accent: "amber",
      },
      {
        title: "Customers",
        value: stats.customers ?? "—",
        note: "Registered customer accounts",
        icon: UserRound,
        accent: "rose",
      },
      {
        title: "Paid revenue",
        value: formatBDT(stats.paidRevenue),
        note: "Payments marked as paid",
        icon: CircleDollarSign,
        accent: "emerald",
      },
    ];

    const isOverview = location.pathname === "/dashboard";

    return (
      <main className="min-h-screen bg-[#f5f7fb] text-slate-800">
        <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col lg:flex-row">
          {/* Admin sidebar */}
          <aside className="z-10 w-full shrink-0 border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-[260px] lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between px-5 py-5 sm:px-6 lg:justify-start lg:py-7">
              <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-lg shadow-teal-900/15">
                  <ShieldCheck size={23} />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-extrabold tracking-tight text-slate-900">
                    TravelMate
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-slate-500">
                    Administration
                  </span>
                </span>
              </Link>
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 lg:hidden">
                Admin
              </span>
            </div>

            <div className="px-4 pb-4 lg:px-4 lg:pb-6">
              <p className="mb-3 hidden px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 lg:block">
                Workspace
              </p>
              <nav className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active =
                    item.to === "/dashboard"
                      ? isOverview
                      : location.pathname === item.to ||
                        location.pathname.startsWith(`${item.to}/`);

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`group flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition duration-150 lg:w-full ${
                        active
                          ? "bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-100"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                      }`}
                    >
                      <Icon
                        size={18}
                        strokeWidth={active ? 2.3 : 1.9}
                        className={active ? "text-teal-700" : "text-slate-400 group-hover:text-slate-600"}
                      />
                      <span>{item.label}</span>
                      {active && (
                        <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-teal-600 lg:block" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="mx-4 mb-5 hidden rounded-2xl border border-slate-200 bg-slate-50/80 p-4 lg:block">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-teal-700 shadow-sm">
                  <ShieldCheck size={16} />
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-800">Administrator access</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Full management permissions</p>
                </div>
              </div>
            </div>

            <div className="hidden border-t border-slate-100 p-4 lg:block">
              <div className="flex items-center gap-3 rounded-xl p-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  {(user.username || "A").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {user.username || "Administrator"}
                  </p>
                  <p className="truncate text-xs text-slate-500">Higher Administrator</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main dashboard content */}
          <div className="min-w-0 flex-1">
            <header className="border-b border-slate-200/80 bg-white/90 px-5 py-5 sm:px-8 lg:px-10">
              <div className="mx-auto flex max-w-[1450px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <span>TravelMate</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-teal-700">Admin workspace</span>
                  </div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                    {isOverview ? "Dashboard overview" : "Admin workspace"}
                  </h1>
                  <p className="mt-1.5 text-sm text-slate-500">
                    Welcome back, <span className="font-semibold text-slate-700">{user.username}</span>. Here’s your travel operations at a glance.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                    title="Refresh dashboard"
                  >
                    <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                    Refresh
                  </button>
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
                  >
                    <Globe2 size={16} />
                    View website
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              </div>
            </header>

            <div className="mx-auto max-w-[1450px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
              {stats.error && (
                <div
                  role="alert"
                  className="mb-6 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-bold">Dashboard data could not be loaded</p>
                    <p className="mt-1">{stats.error}</p>
                  </div>
                  <Link
                    to="/login"
                    className="shrink-0 font-semibold underline underline-offset-4"
                  >
                    Check sign-in
                  </Link>
                </div>
              )}

              <section>
                <SectionHeading
                  eyebrow="Performance snapshot"
                  title="At a glance"
                  description="A live overview of your destinations, customers, bookings and revenue."
                  action={
                    <span className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
                      <Clock3 size={13} />
                      {refreshing ? "Updating data…" : "Latest available data"}
                    </span>
                  }
                />
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {overviewCards.map((card) => (
                    <StatCard
                      key={card.title}
                      {...card}
                      loading={stats.loading}
                    />
                  ))}
                </div>
              </section>

              <section className="mt-10">
                <SectionHeading
                  eyebrow="Analytics"
                  title="Booking and revenue insights"
                  description="Understand booking activity, payment outcomes and revenue trends."
                />
                <div className="grid min-w-0 gap-5 xl:grid-cols-2">
                  <ChartCard
                    title="Monthly bookings"
                    description="Number of bookings recorded each month"
                  >
                    <div className="h-[290px] w-full">
                      {monthlyBookingsChart.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyBookingsChart} margin={{ top: 8, right: 8, left: -12, bottom: 4 }}>
                            <CartesianGrid stroke="#e8edf3" strokeDasharray="4 4" vertical={false} />
                            <XAxis
                              dataKey="month"
                              tick={{ fontSize: 11, fill: "#64748b" }}
                              tickLine={false}
                              axisLine={{ stroke: "#dbe3ec" }}
                              minTickGap={12}
                            />
                            <YAxis
                              allowDecimals={false}
                              width={42}
                              tick={{ fontSize: 11, fill: "#64748b" }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              formatter={(value) => [Number(value) || 0, "Bookings"]}
                              labelFormatter={(label) => `Month: ${label}`}
                              contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 8px 24px rgba(15,23,42,0.08)" }}
                              cursor={{ fill: "#f1f5f9" }}
                            />
                            <Bar dataKey="bookings" name="Bookings" fill="#0f766e" radius={[6, 6, 0, 0]} maxBarSize={42} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <EmptyChart loading={stats.loading} message="No booking data available" />
                      )}
                    </div>
                  </ChartCard>

                  <ChartCard
                    title="Monthly revenue"
                    description="Paid revenue, completed refunds, and net revenue (BDT)"
                  >
                    <div className="h-[290px] w-full">
                      {monthlyRevenueChart.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={monthlyRevenueChart} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
                            <CartesianGrid stroke="#e8edf3" strokeDasharray="4 4" vertical={false} />
                            <XAxis
                              dataKey="month"
                              tick={{ fontSize: 11, fill: "#64748b" }}
                              tickLine={false}
                              axisLine={{ stroke: "#dbe3ec" }}
                              minTickGap={12}
                            />
                            <YAxis
                              width={66}
                              tickFormatter={compactNumber}
                              tick={{ fontSize: 11, fill: "#64748b" }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              formatter={(value, name) => [formatBDT(value), name]}
                              labelFormatter={(label) => `Month: ${label}`}
                              contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 8px 24px rgba(15,23,42,0.08)" }}
                            />
                            <Line
                              type="monotone"
                              dataKey="paid_revenue"
                              name="Paid Revenue"
                              stroke="#2563eb"
                              strokeWidth={3}
                              dot={{ r: 4, fill: "#2563eb", strokeWidth: 2, stroke: "#ffffff" }}
                              activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="refunded_amount"
                              name="Refunded Amount"
                              stroke="#dc2626"
                              strokeWidth={3}
                              dot={{ r: 4, fill: "#dc2626", strokeWidth: 2, stroke: "#ffffff" }}
                              activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="net_revenue"
                              name="Net Revenue"
                              stroke="#0f766e"
                              strokeWidth={3}
                              dot={{ r: 4, fill: "#0f766e", strokeWidth: 2, stroke: "#ffffff" }}
                              activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <EmptyChart loading={stats.loading} message="No revenue data available" />
                      )}
                    </div>
                  </ChartCard>

                  <ChartCard
                    title="Booking status"
                    description="How current bookings are distributed by status"
                  >
                    <div className="h-[290px] w-full">
                      {bookingStatusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={bookingStatusData}
                              dataKey="count"
                              nameKey="name"
                              cx="50%"
                              cy="46%"
                              innerRadius={58}
                              outerRadius={91}
                              paddingAngle={3}
                              labelLine={false}
                              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                            >
                              {bookingStatusData.map((entry, index) => (
                                <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="#ffffff" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value, name) => [`${Number(value) || 0} bookings`, name]}
                              contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 8px 24px rgba(15,23,42,0.08)" }}
                            />
                            <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <EmptyChart loading={stats.loading} message="No booking status data available" />
                      )}
                    </div>
                  </ChartCard>

                  <ChartCard
                    title="Payment overview"
                    description="Payment status distribution and refund summary"
                  >
                    <div className="h-[260px] w-full">
                      {paymentStatusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={paymentStatusData}
                              dataKey="count"
                              nameKey="name"
                              cx="50%"
                              cy="46%"
                              innerRadius={56}
                              outerRadius={87}
                              paddingAngle={3}
                              labelLine={false}
                              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                            >
                              {paymentStatusData.map((entry, index) => (
                                <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="#ffffff" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value, name) => [`${Number(value) || 0} payments`, name]}
                              contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 8px 24px rgba(15,23,42,0.08)" }}
                            />
                            <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <EmptyChart loading={stats.loading} message="No payment status data available" />
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-rose-100 bg-rose-50/70 p-4">
                      <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-white p-2 text-rose-700 shadow-sm">
                          <Receipt size={18} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">Total refunded amount</p>
                          <p className="mt-0.5 text-xs text-slate-500">Recorded refunds</p>
                        </div>
                      </div>
                      <p className="text-right text-lg font-extrabold tracking-tight text-rose-800">
                        {stats.loading ? "…" : formatBDT(stats.refundedAmount)}
                      </p>
                    </div>
                  </ChartCard>
                </div>
              </section>

              <section className="mt-10">
                <SectionHeading
                  eyebrow="Quick access"
                  title="Management center"
                  description="Jump directly to the main areas of your travel agency."
                />
                <div className="grid gap-5 xl:grid-cols-3">
                  <div className="grid gap-4 sm:grid-cols-2 xl:col-span-2">
                    <Link
                      to="/destinations"
                      className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md sm:p-6"
                    >
                      <div className="flex items-start justify-between">
                        <span className="rounded-xl bg-teal-50 p-3 text-teal-700">
                          <MapPin size={22} />
                        </span>
                        <ArrowUpRight size={18} className="text-slate-300 transition group-hover:text-teal-700" />
                      </div>
                      <h3 className="mt-5 font-bold text-slate-900">Manage destinations</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Maintain the places and destination information customers can explore.
                      </p>
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-teal-700">
                        Open destinations <span aria-hidden="true">→</span>
                      </span>
                    </Link>

                    <Link
                      to="/packages"
                      className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:p-6"
                    >
                      <div className="flex items-start justify-between">
                        <span className="rounded-xl bg-blue-50 p-3 text-blue-700">
                          <Package size={22} />
                        </span>
                        <ArrowUpRight size={18} className="text-slate-300 transition group-hover:text-blue-700" />
                      </div>
                      <h3 className="mt-5 font-bold text-slate-900">Manage tour packages</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Review package details and keep your travel offerings up to date.
                      </p>
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-700">
                        Open packages <span aria-hidden="true">→</span>
                      </span>
                    </Link>
                  </div>

                  <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                        <UserRound size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">Admin account</h3>
                        <p className="text-xs text-slate-500">Current session details</p>
                      </div>
                    </div>
                    <dl className="mt-5 space-y-4">
                      <div className="border-b border-slate-100 pb-3">
                        <dt className="text-xs font-medium text-slate-400">Username</dt>
                        <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{user.username || "Not available"}</dd>
                      </div>
                      <div className="border-b border-slate-100 pb-3">
                        <dt className="text-xs font-medium text-slate-400">Email</dt>
                        <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{user.email || "Not available"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-400">Role</dt>
                        <dd className="mt-1 inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800">
                          Higher Administrator
                        </dd>
                      </div>
                    </dl>
                  </section>
                </div>
              </section>

              <footer className="mt-10 border-t border-slate-200 pt-5 text-center text-xs text-slate-400">
                TravelMate Administration <span className="mx-1.5">·</span> Dashboard overview
              </footer>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (user.role_name === "CUSTOMER") {
    return <CustomerDashboard user={user} />;
  }

  if (user.role_name === "STAFF") {
    return <StaffDashboard user={user} />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <ShieldCheck className="mx-auto text-rose-600" size={34} />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Unrecognized account role</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your account role is not recognized. Please contact the administrator.
        </p>
      </div>
    </main>
  );
}

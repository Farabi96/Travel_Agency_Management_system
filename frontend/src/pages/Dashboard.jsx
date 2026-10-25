 
import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import {
  LayoutDashboard,
  MapPin,
  Package,
  Users,
  CalendarCheck,
  CreditCard,
  Settings,
  ArrowUpRight,
  Clock,
  ShieldCheck,
   Receipt,
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

export default function Dashboard() {
  const [stats, setStats] = useState({
  destinations: null,
  packages: null,
  users: null,
  customers: null,
  bookings: null,
  paidRevenue: null,
  refundedAmount: null,
  bookingStatusBreakdown: {},
  paymentStatusBreakdown: {},
  monthlyBookings: [],
  monthlyRevenue: [],
  loading: true,
  error: "",
});

  const token = sessionStorage.getItem("access_token");
  const savedUser = sessionStorage.getItem("user");

  let user = null;

  if (savedUser) {
    try {
      user = JSON.parse(savedUser);
    } catch {
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("user");
    }
  }

  useEffect(() => {
    if (!token || !user || user.role_name !== "HIGHER_ADMIN") {
      return;
    }

    const controller = new AbortController();

    async function loadStats() {
      try {
        const [destinationResponse, packageResponse, usersResponse] =
          await Promise.all([
            fetch("http://127.0.0.1:5000/api/destinations/", {
              signal: controller.signal,
            }),
            fetch("http://127.0.0.1:5000/api/packages/", {
              signal: controller.signal,
            }),
            fetch("http://127.0.0.1:5000/api/admin/stats", {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              signal: controller.signal,
            }),
          ]);

        if (
          !destinationResponse.ok ||
          !packageResponse.ok ||
          !usersResponse.ok
        ) {
          if (usersResponse.status === 401) {
            throw new Error("Your session may have expired. Please log in again.");
          }

          if (usersResponse.status === 403) {
            throw new Error("You are not authorized to view admin statistics.");
          }

          throw new Error("Unable to load dashboard statistics.");
        }

        const [destinations, packages, userStats] = await Promise.all([
          destinationResponse.json(),
          packageResponse.json(),
          usersResponse.json(),
        ]);
 setStats({
  destinations: destinations.length,
  packages: packages.length,
  users: userStats.total_users ?? 0,
  customers: userStats.total_customers ?? 0,
  bookings: userStats.total_bookings ?? 0,
  paidRevenue: userStats.paid_revenue ?? 0,
  refundedAmount: userStats.refunded_amount ?? 0,
  bookingStatusBreakdown: userStats.booking_status_breakdown ?? {},
  paymentStatusBreakdown: userStats.payment_status_breakdown ?? {},
  monthlyBookings: userStats.monthly_bookings ?? [],
  monthlyRevenue: userStats.monthly_revenue ?? [],
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
      }
    }

    loadStats();

    return () => controller.abort();
  }, [token, user?.role_name]);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role_name === "HIGHER_ADMIN") {
    const menuItems = [
      { label: "Overview", icon: LayoutDashboard, to: "/dashboard" },
      { label: "Destinations", icon: MapPin, to: "/destinations" },
      { label: "Tour Packages", icon: Package, to: "/packages" },
     { label: "Users & Staff", icon: Users, to: "/admin/users" },
     { label: "Bookings", icon: CalendarCheck, to: "/booking-tracking" },
       { label: "Payments", icon: CreditCard, to: "/payments" },
      { label: "Settings", icon: Settings, to: "/dashboard" },
      { label: "Refund Management", icon: Receipt, to: "/refunds" },
    ];

const formatBDT = (amount) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const bookingStatusData = Object.entries(
  stats.bookingStatusBreakdown
).map(([name, value]) => ({
  name,
  count: Number(value) || 0,
}));

const paymentStatusData = Object.entries(
  stats.paymentStatusBreakdown
).map(([name, value]) => ({
  name,
  count: Number(value) || 0,
}));

const chartColors = [
  "#0d9488",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#64748b",
];

     const overviewCards = [
  {
    title: "Destinations",
    value: stats.loading ? "..." : stats.destinations ?? "—",
    note: "Total destinations",
    icon: MapPin,
  },
  {
    title: "Tour Packages",
    value: stats.loading ? "..." : stats.packages ?? "—",
    note: "Total tour packages",
    icon: Package,
  },
  {
    title: "Total Bookings",
    value: stats.loading ? "..." : stats.bookings ?? "—",
    note: "All recorded bookings",
    icon: CalendarCheck,
  },
  {
    title: "Registered Users",
    value: stats.loading ? "..." : stats.users ?? "—",
    note: "All registered accounts",
    icon: Users,
  },
  {
    title: "Customers",
    value: stats.loading ? "..." : stats.customers ?? "—",
    note: "Registered customers",
    icon: Users,
  },
  {
    title: "Paid Revenue",
    value: stats.loading
      ? "..."
      : formatBDT(stats.paidRevenue),
    note: "Payments marked as PAID",
    icon: CreditCard,
  },
];
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto flex max-w-[1600px] flex-col md:flex-row">
          <aside className="w-full border-b border-slate-200 bg-white p-5 md:min-h-[calc(100vh-72px)] md:w-64 md:border-b-0 md:border-r">
            <div className="mb-8 flex items-center gap-3">
              <span className="rounded-xl bg-teal-600 p-3 text-white">
                <ShieldCheck size={24} />
              </span>

              <div>
                <h2 className="font-bold text-slate-900">Admin Panel</h2>
                <p className="text-xs text-slate-500">
                  TravelMate Management
                </p>
              </div>
            </div>

            <nav className="grid grid-cols-2 gap-2 md:grid-cols-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = item.label === "Overview";

                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-teal-50 text-teal-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon size={19} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-8 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Signed in as
              </p>
              <p className="mt-2 break-words font-semibold text-slate-900">
                {user.username}
              </p>
              <p className="mt-1 text-xs text-teal-700">
                Higher Administrator
              </p>
            </div>
          </aside>

          <section className="min-w-0 flex-1 p-5 sm:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-medium text-teal-700">
                  TravelMate / Overview
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">
                  Admin Dashboard
                </h1>
                <p className="mt-2 text-slate-600">
                  Welcome back, {user.username}. Manage your travel operations
                  here.
                </p>
              </div>

              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                View Website <ArrowUpRight size={17} />
              </Link>
            </div>

            {stats.error && (
              <p
                role="alert"
                className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700"
              >
                {stats.error}
              </p>
            )}

           <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {overviewCards.map((card) => {
                const Icon = card.icon;

                return (
                  <article
                    key={card.title}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-xl bg-teal-50 p-3 text-teal-700">
                        <Icon size={22} />
                      </span>
                      <Clock size={17} className="text-slate-400" />
                    </div>

                    <p className="mt-5 text-sm font-medium text-slate-500">
                      {card.title}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-slate-900">
                      {card.value}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {card.note}
                    </p>
                  </article>
                );
              })}
            </div>

            {/* Booking and revenue analytics */}
<div className="mt-8 grid gap-6 xl:grid-cols-2">
  <section className="rounded-2xl border border-slate-200 bg-white p-6">
    <h2 className="text-lg font-bold text-slate-900">
      Monthly Bookings
    </h2>
    <p className="mt-1 text-sm text-slate-500">
      Booking activity over recent months
    </p>

    <div className="mt-6 h-72">
      {stats.monthlyBookings.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.monthlyBookings}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="bookings"
              name="Bookings"
              fill="#0d9488"
              radius={[5, 5, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          {stats.loading ? "Loading chart..." : "No booking data available"}
        </div>
      )}
    </div>
  </section>

  <section className="rounded-2xl border border-slate-200 bg-white p-6">
    <h2 className="text-lg font-bold text-slate-900">
      Monthly Revenue
    </h2>
    <p className="mt-1 text-sm text-slate-500">
      Revenue from payments marked as PAID
    </p>

    <div className="mt-6 h-72">
      {stats.monthlyRevenue.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={stats.monthlyRevenue}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              formatter={(value) => formatBDT(value)}
            />
            <Legend />
             <Line
  type="monotone"
  dataKey="revenue"
  name="Revenue (BDT)"
  stroke="#2563eb"
  strokeWidth={3}
  dot={{ r: 5, fill: "#2563eb", strokeWidth: 2 }}
  activeDot={{ r: 7 }}
/>
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          {stats.loading ? "Loading chart..." : "No revenue data available"}
        </div>
      )}
    </div>
  </section>

  <section className="rounded-2xl border border-slate-200 bg-white p-6">
    <h2 className="text-lg font-bold text-slate-900">
      Booking Status
    </h2>
    <p className="mt-1 text-sm text-slate-500">
      Distribution of booking statuses
    </p>

    <div className="mt-6 h-72">
      {bookingStatusData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={bookingStatusData}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label
            >
              {bookingStatusData.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={chartColors[index % chartColors.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          {stats.loading ? "Loading chart..." : "No booking status data available"}
        </div>
      )}
    </div>
  </section>

  <section className="rounded-2xl border border-slate-200 bg-white p-6">
    <h2 className="text-lg font-bold text-slate-900">
      Payment Overview
    </h2>
    <p className="mt-1 text-sm text-slate-500">
      Payment status distribution and refunds
    </p>

    <div className="mt-6 h-72">
      {paymentStatusData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={paymentStatusData}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label
            >
              {paymentStatusData.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={chartColors[index % chartColors.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          {stats.loading ? "Loading chart..." : "No payment status data available"}
        </div>
      )}
    </div>

    <div className="mt-4 rounded-xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">Total refunded amount</p>
      <p className="mt-1 text-xl font-bold text-slate-900">
        {stats.loading ? "..." : formatBDT(stats.refundedAmount)}
      </p>
    </div>
  </section>
</div>

            <div className="mt-8 grid gap-6 xl:grid-cols-3">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 xl:col-span-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Management Center
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Open a section to manage your travel agency.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Link
                    to="/destinations"
                    className="group rounded-xl border border-slate-200 p-5 transition hover:border-teal-300 hover:bg-teal-50/50"
                  >
                    <MapPin size={25} className="text-teal-700" />
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-900">
                        Manage Destinations
                      </h3>
                      <ArrowUpRight
                        size={17}
                        className="text-slate-400 group-hover:text-teal-700"
                      />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      View destination information and available locations.
                    </p>
                  </Link>

                  <Link
                    to="/packages"
                    className="group rounded-xl border border-slate-200 p-5 transition hover:border-teal-300 hover:bg-teal-50/50"
                  >
                    <Package size={25} className="text-teal-700" />
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-900">
                        Manage Packages
                      </h3>
                      <ArrowUpRight
                        size={17}
                        className="text-slate-400 group-hover:text-teal-700"
                      />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Browse the tour packages currently available.
                    </p>
                  </Link>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Admin Account
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Current session information
                </p>

                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-xs text-slate-500">Username</p>
                    <p className="mt-1 break-words font-medium text-slate-900">
                      {user.username}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="mt-1 break-words font-medium text-slate-900">
                      {user.email || "Not available"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Role</p>
                    <p className="mt-1 font-medium text-teal-700">
                      {user.role_name}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <p className="mt-8 text-center text-xs text-slate-400">
              TravelMate Administration · Dashboard overview
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (user.role_name === "CUSTOMER") {
  return <CustomerDashboard user={user} />;
}

  const dashboardInfo = {
    STAFF: {
      title: "Staff Dashboard",
      description:
        "Manage bookings, customer services, and travel operations.",
    },
    CUSTOMER: {
      title: "Customer Dashboard",
      description: "Explore tours and manage your travel bookings.",
    },
  };

  const info = dashboardInfo[user.role_name];

  if (!info) {
    return (
      <main className="p-8 text-center text-red-700">
        Your account role is not recognized. Please contact the administrator.
      </main>
    );
  }

  return (
    <main className="min-h-[80vh] bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-slate-900">{info.title}</h1>
        <p className="mt-3 text-slate-600">Welcome, {user.username}!</p>
        <p className="mt-2 text-slate-700">{info.description}</p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/destinations"
            className="rounded-lg bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700"
          >
            Explore Destinations
          </Link>
          <Link
            to="/packages"
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-100"
          >
            Browse Packages
          </Link>
        </div>
      </div>
    </main>
  );
}

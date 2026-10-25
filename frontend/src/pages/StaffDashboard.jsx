
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  CreditCard,
  RotateCcw,
  Activity,
  RefreshCw,
  AlertCircle,
  MapPin,
  Package,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  getBookingTracking,
  getPaymentOverview,
  getRefunds,
  getAuditLogs,
} from "../services/api";
import TravelCalendar from "./TravelCalendar";

const COLORS = ["#0d9488", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

const formatBDT = (value) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const getStatus = (item) =>
  String(
    item?.booking_status ??
      item?.status_name ??
      item?.status ??
      item?.payment_summary ??
      "UNKNOWN"
  ).toUpperCase();

const asArray = (value) => (Array.isArray(value) ? value : []);

function SummaryCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="rounded-xl bg-teal-50 p-3">
          <Icon size={21} className="text-teal-700" />
        </div>
      </div>
      <p className="mt-4 break-words text-2xl font-bold text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <p className="py-8 text-center text-sm text-slate-500">{message}</p>
  );
}

export default function StaffDashboard({ user }) {
  const [data, setData] = useState({
    bookings: [],
    payments: [],
    refunds: [],
    activities: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      const results = await Promise.allSettled([
        getBookingTracking(),
        getPaymentOverview(),
        getRefunds(),
        getAuditLogs(),
      ]);

      if (!active) return;

      const [bookingResult, paymentResult, refundResult, activityResult] =
        results;

      const failedSections = [];

      if (bookingResult.status === "rejected") {
        failedSections.push("bookings");
      }
      if (paymentResult.status === "rejected") {
        failedSections.push("payments");
      }
      if (refundResult.status === "rejected") {
        failedSections.push("refunds");
      }
      if (activityResult.status === "rejected") {
        failedSections.push("activity");
      }

      setData({
        bookings:
          bookingResult.status === "fulfilled"
            ? asArray(bookingResult.value)
            : [],
        payments:
          paymentResult.status === "fulfilled"
            ? asArray(paymentResult.value)
            : [],
        refunds:
          refundResult.status === "fulfilled"
            ? asArray(refundResult.value)
            : [],
        activities:
          activityResult.status === "fulfilled"
            ? asArray(activityResult.value)
            : [],
      });

      if (failedSections.length) {
        setError(
          `Some dashboard data could not be loaded: ${failedSections.join(", ")}.`
        );
      }

      setLoading(false);
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const bookingStatusData = useMemo(() => {
    const counts = {};

    data.bookings.forEach((booking) => {
      const status = getStatus(booking);
      counts[status] = (counts[status] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [data.bookings]);

  const paymentStatusData = useMemo(() => {
    const counts = {};

    data.payments.forEach((payment) => {
      const status = String(
        payment.payment_summary ??
          payment.payment_status ??
          payment.status_name ??
          "UNKNOWN"
      ).toUpperCase();

      counts[status] = (counts[status] || 0) + 1;
    });

    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [data.payments]);

  const totals = useMemo(() => {
    const pendingBookings = data.bookings.filter((booking) =>
      ["PENDING", "CONFIRMED"].includes(getStatus(booking))
    ).length;

    const outstanding = data.payments.reduce((sum, payment) => {
      if (["CANCELLED", "CANCELED"].includes(getStatus(payment))) {
        return sum;
      }

      return sum + Math.max(0, Number(payment.balance) || 0);
    }, 0);

    const paid = data.payments.reduce(
      (sum, payment) => sum + (Number(payment.paid_amount) || 0),
      0
    );

    const pendingRefunds = data.refunds.filter((refund) =>
      ["PENDING", "REQUESTED", "UNDER_REVIEW"].includes(
        String(
          refund.refund_status ??
            refund.status_name ??
            refund.status ??
            ""
        ).toUpperCase()
      )
    ).length;

    return {
      bookings: data.bookings.length,
      pendingBookings,
      paid,
      outstanding,
      pendingRefunds,
    };
  }, [data]);

  const recentActivities = [...data.activities]
    .sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    )
    .slice(0, 6);

  const recentBookings = [...data.payments]
    .sort(
      (a, b) =>
        Number(b.booking_id || 0) - Number(a.booking_id || 0)
    )
    .slice(0, 5);

  const quickLinks = [
    {
      label: "Manage Bookings",
      description: "Track bookings and travel schedules.",
      to: "/booking-tracking",
      icon: CalendarCheck,
    },
    {
      label: "Payment Management",
      description: "Review payments and outstanding balances.",
      to: "/payments",
      icon: CreditCard,
    },
    {
      label: "Explore Destinations",
      description: "Browse available travel destinations.",
      to: "/destinations",
      icon: MapPin,
    },
    {
      label: "Browse Tour Packages",
      description: "Explore available tour packages.",
      to: "/packages",
      icon: Package,
    },
  ];

  return (
    <main className="min-h-[80vh] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-teal-800 to-teal-600 p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-teal-100">
                Travel Agency Operations
              </p>
              <h1 className="mt-2 text-3xl font-bold">
                Staff Dashboard
              </h1>
              <p className="mt-2 text-teal-50">
                Welcome, {user?.username || "Staff"}! Here is your operations
                overview.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-white px-4 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-50"
            >
              <RefreshCw size={16} />
              Refresh Dashboard
            </button>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <p>{error} Refresh the dashboard or check your staff API permissions.</p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
            <RefreshCw className="mx-auto mb-3 animate-spin" size={25} />
            Loading your dashboard...
          </div>
        ) : (
          <>
           <section>
              <TravelCalendar />
            </section>


            <section>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900">
                  Operations Overview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Current totals based on the available API records.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  title="Total Bookings"
                  value={totals.bookings}
                  subtitle="Bookings available to staff"
                  icon={CalendarCheck}
                />
                <SummaryCard
                  title="Pending / Confirmed"
                  value={totals.pendingBookings}
                  subtitle="Bookings in these two statuses"
                  icon={Activity}
                />
                <SummaryCard
                  title="Payments Received"
                  value={formatBDT(totals.paid)}
                  subtitle="Recorded paid amounts"
                  icon={CreditCard}
                />
                <SummaryCard
                  title="Outstanding Balance"
                  value={formatBDT(totals.outstanding)}
                  subtitle="Excludes cancelled bookings"
                  icon={RotateCcw}
                />
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  Booking Status
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Distribution of bookings by status.
                </p>
                {bookingStatusData.length ? (
                  <div className="mt-4 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={bookingStatusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label
                        >
                          {bookingStatusData.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState message="No booking status data is available." />
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  Payment Summary
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Booking counts grouped by payment summary.
                </p>
                {paymentStatusData.length ? (
                  <div className="mt-4 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={paymentStatusData}
                        margin={{ top: 10, right: 10, left: -15, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-15} textAnchor="end" height={65} interval={0} fontSize={11} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState message="No payment summary data is available." />
                )}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-slate-900">
                    Recent Booking Payments
                  </h2>
                  <Link
                    to="/payments"
                    className="text-sm font-semibold text-teal-700 hover:text-teal-900"
                  >
                    View all
                  </Link>
                </div>
                {recentBookings.length ? (
                  <div className="mt-4 space-y-3">
                    {recentBookings.map((booking) => (
                      <div
                        key={booking.booking_id}
                        className="flex flex-col justify-between gap-2 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">
                            {booking.booking_reference ||
                              `Booking #${booking.booking_id}`}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {booking.customer_name || "Unknown customer"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {booking.package_name || "Package not specified"}
                          </p>
                        </div>
                        <div className="sm:text-right">
                          <p className="font-semibold text-teal-800">
                            {formatBDT(booking.paid_amount)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {String(
                              booking.payment_summary || "UNKNOWN"
                            ).replaceAll("_", " ")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No booking payment records are available." />
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-slate-900">
                    Recent Staff Activity
                  </h2>
                  <Activity size={20} className="text-teal-700" />
                </div>
                {recentActivities.length ? (
                  <div className="mt-4 space-y-3">
                    {recentActivities.map((activity) => (
                      <div
                        key={activity.log_id}
                        className="rounded-xl border border-slate-100 p-4"
                      >
                        <p className="font-medium text-slate-800">
                          {String(activity.action || "Activity recorded").replaceAll("_", " ")}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {activity.table_name || "System"} 
                          {activity.record_id != null
                            ? ` · Record #${activity.record_id}`
                            : ""}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          {activity.created_at
                            ? new Date(activity.created_at).toLocaleString()
                            : "Time unavailable"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No activity records are available." />
                )}
              </div>
            </section>

            <section>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900">
                  Quick Actions
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Shortcuts to your everyday operational tasks.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {quickLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
                    >
                      <div className="inline-flex rounded-xl bg-teal-50 p-3 text-teal-700">
                        <Icon size={22} />
                      </div>
                      <h3 className="mt-4 font-bold text-slate-900">
                        {item.label}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {item.description}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>

            <p className="text-sm text-slate-500">
              Pending refunds: <strong>{data.refunds.length ? totals.pendingRefunds : 0}</strong>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

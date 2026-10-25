
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  CreditCard,
  MapPin,
  Package,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { getMyBookings, getMyPayments } from "../services/api";

const formatBDT = (amount) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const formatDate = (value) => {
  if (!value) return "Not scheduled";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const statusClass = (status) => {
  const value = String(status || "").toUpperCase();

  if (["CONFIRMED", "COMPLETED", "PAID", "APPROVED"].includes(value)) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (["CANCELLED", "CANCELED", "FAILED", "REJECTED"].includes(value)) {
    return "bg-red-50 text-red-700";
  }

  return "bg-amber-50 text-amber-700";
};

export default function CustomerDashboard({ user }) {
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const [bookingData, paymentData] = await Promise.all([
          getMyBookings(),
          getMyPayments(),
        ]);

        if (!active) return;

        setBookings(Array.isArray(bookingData) ? bookingData : []);
        setPayments(Array.isArray(paymentData) ? paymentData : []);
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load your dashboard.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const today = new Date();

  const upcomingTrips = bookings.filter((booking) => {
    const dateValue =
      booking.departure_datetime || booking.travel_date;

    if (!dateValue || Number.isNaN(new Date(dateValue).getTime())) {
      return false;
    }

    const status = String(booking.status || "").toUpperCase();

    return (
      new Date(dateValue) >= today &&
      !["CANCELLED", "CANCELED", "COMPLETED", "REJECTED"].includes(status)
    );
  });

  const pendingPayments = payments.filter(
    (payment) =>
      String(payment.payment_status || "").toUpperCase() === "PENDING"
  );

  const cards = [
    {
      title: "Total Bookings",
      value: bookings.length,
      note: "All your bookings",
      icon: CalendarCheck,
      color: "text-teal-700 bg-teal-50",
    },
    {
      title: "Upcoming Trips",
      value: upcomingTrips.length,
      note: "Trips scheduled for the future",
      icon: MapPin,
      color: "text-blue-700 bg-blue-50",
    },
    {
      title: "Pending Payments",
      value: pendingPayments.length,
      note: "Payments awaiting verification",
      icon: CreditCard,
      color: "text-amber-700 bg-amber-50",
    },
    {
      title: "Payment Records",
      value: payments.length,
      note: "Your recorded payments",
      icon: CheckCircle2,
      color: "text-violet-700 bg-violet-50",
    },
  ];

  return (
    <main className="min-h-[80vh] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-teal-700">
              TravelMate / Customer Portal
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Welcome back, {user?.username || "Traveler"}!
            </h1>

            <p className="mt-2 text-slate-600">
              Manage your bookings, upcoming trips and payments in one place.
            </p>
          </div>

          <Link
            to="/packages"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            <Package size={18} />
            Explore Packages
          </Link>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle size={20} className="mt-0.5 shrink-0" />

            <div>
              <p className="font-semibold">Dashboard data could not be loaded</p>
              <p className="mt-1">{error}</p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 inline-flex items-center gap-2 font-semibold underline"
              >
                <RefreshCw size={14} />
                Try again
              </button>
            </div>
          </div>
        )}

        <section
          aria-label="Customer statistics"
          className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4"
        >
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className={`rounded-xl p-3 ${card.color}`}>
                    <Icon size={23} />
                  </span>

                  <Clock size={17} className="text-slate-400" />
                </div>

                <p className="mt-5 text-sm font-medium text-slate-500">
                  {card.title}
                </p>

                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {loading ? "..." : card.value}
                </p>

                <p className="mt-2 text-xs text-slate-500">{card.note}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Recent Bookings
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Track your latest travel reservations.
              </p>
            </div>

            <Link
               to="/customer/bookings"
              className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800"
            >
              View all bookings <ArrowUpRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">
              Loading your bookings...
            </div>
          ) : bookings.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Package className="mx-auto text-slate-400" size={38} />

              <h3 className="mt-4 font-semibold text-slate-900">
                No bookings yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Find a tour package and start planning your next trip.
              </p>

              <Link
                to="/packages"
                className="mt-5 inline-flex rounded-lg bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Browse Packages
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Booking</th>
                    <th className="px-5 py-4 font-semibold">Package</th>
                    <th className="px-5 py-4 font-semibold">Travel Date</th>
                    <th className="px-5 py-4 font-semibold">Amount</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {bookings.slice(0, 5).map((booking) => (
                    <tr key={booking.booking_id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {booking.booking_reference ||
                          `#${booking.booking_id}`}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {booking.package_name || "Tour package"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(
                          booking.departure_datetime || booking.travel_date
                        )}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-800">
                        {formatBDT(booking.total_amount)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            booking.status
                          )}`}
                        >
                          {booking.status || "Unknown"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <Link
            to="/destinations"
            className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-teal-300 hover:shadow-sm"
          >
            <MapPin className="text-teal-700" size={25} />
            <h3 className="mt-4 font-bold text-slate-900">
              Explore Destinations
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Discover places for your next adventure.
            </p>
            <ArrowUpRight
              className="mt-4 text-slate-400 group-hover:text-teal-700"
              size={18}
            />
          </Link>

          <Link
            to="/packages"
            className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-teal-300 hover:shadow-sm"
          >
            <Package className="text-teal-700" size={25} />
            <h3 className="mt-4 font-bold text-slate-900">
              Browse Packages
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Compare tours and find your ideal package.
            </p>
            <ArrowUpRight
              className="mt-4 text-slate-400 group-hover:text-teal-700"
              size={18}
            />
          </Link>

              <Link
                to="/customer/profile"
            className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-teal-300 hover:shadow-sm"
          >
            <CheckCircle2 className="text-teal-700" size={25} />
            <h3 className="mt-4 font-bold text-slate-900">My Profile</h3>
            <p className="mt-2 text-sm text-slate-500">
              Review and update your customer information.
            </p>
            <ArrowUpRight
              className="mt-4 text-slate-400 group-hover:text-teal-700"
              size={18}
            />
          </Link>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Payment Activity
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your latest payment records and verification status.
              </p>
            </div>
          </div>

          {loading ? (
            <p className="mt-5 text-sm text-slate-500">
              Loading payments...
            </p>
          ) : payments.length === 0 ? (
            <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              No payment records found.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {payments.slice(0, 3).map((payment) => (
                <div
                  key={payment.payment_id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      Booking #{payment.booking_id}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {payment.payment_method || "Payment method unavailable"}
                      {" · "}
                      {formatDate(payment.payment_date)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="font-semibold text-slate-900">
                      {formatBDT(payment.amount)}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                        payment.payment_status
                      )}`}
                    >
                      {payment.payment_status || "Unknown"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="mt-8 text-center text-xs text-slate-400">
          TravelMate Customer Portal
        </p>
      </div>
    </main>
  );
}

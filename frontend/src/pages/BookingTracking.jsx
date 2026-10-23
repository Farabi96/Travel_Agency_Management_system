
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, CalendarDays, Users, Wallet } from "lucide-react";
import { getBookingTracking } from "../services/api";

const dateTime = (value) => {
  if (!value) return "Not scheduled";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const money = (value) =>
  `৳${Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function StatusBadge({ value }) {
  const styles = {
    Paid: "bg-emerald-100 text-emerald-800",
    "Partially Paid": "bg-amber-100 text-amber-800",
    "Payment Pending": "bg-sky-100 text-sky-800",
    Unpaid: "bg-rose-100 text-rose-800",
    CONFIRMED: "bg-emerald-100 text-emerald-800",
    PENDING: "bg-amber-100 text-amber-800",
    COMPLETED: "bg-slate-200 text-slate-800",
    CANCELLED: "bg-rose-100 text-rose-800",
    CANCELED: "bg-rose-100 text-rose-800",
    Upcoming: "bg-blue-100 text-blue-800",
    Ongoing: "bg-violet-100 text-violet-800",
    Completed: "bg-emerald-100 text-emerald-800",
    Cancelled: "bg-rose-100 text-rose-800",
    "Schedule unavailable": "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[value] || "bg-slate-100 text-slate-700"
      }`}
    >
      {value || "Unknown"}
    </span>
  );
}

export default function BookingTracking() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [bookingFilter, setBookingFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [journeyFilter, setJourneyFilter] = useState("All");

  const loadBookings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const data = await getBookingTracking();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Could not load booking tracking data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesSearch =
        !term ||
        [
          booking.customer_name,
          booking.customer_phone,
          booking.booking_reference,
          booking.package_name,
        ].some((value) => String(value || "").toLowerCase().includes(term));

      return (
        matchesSearch &&
        (bookingFilter === "All" ||
          booking.booking_status === bookingFilter) &&
        (paymentFilter === "All" ||
          booking.payment_status === paymentFilter) &&
        (journeyFilter === "All" ||
          booking.journey_status === journeyFilter)
      );
    });
  }, [bookings, search, bookingFilter, paymentFilter, journeyFilter]);

  const counts = useMemo(
    () => ({
      total: bookings.length,
      ongoing: bookings.filter((b) => b.journey_status === "Ongoing").length,
      upcoming: bookings.filter((b) => b.journey_status === "Upcoming").length,
      unpaid: bookings.filter(
        (b) => ["Unpaid", "Payment Pending", "Partially Paid"].includes(b.payment_status)
      ).length,
    }),
    [bookings]
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
              Operations
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Booking & Tour Tracking
            </h1>
            <p className="mt-2 text-slate-600">
              Track customers, payments, and tour schedules in one place.
            </p>
          </div>

          <button
            onClick={() => loadBookings(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
            <p className="font-semibold">Unable to load tracking data</p>
            <p className="mt-1 text-sm">{error}</p>
            <button
              onClick={() => loadBookings()}
              className="mt-3 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total bookings", value: counts.total, Icon: Users },
            { label: "Tours ongoing", value: counts.ongoing, Icon: CalendarDays },
            { label: "Tours upcoming", value: counts.upcoming, Icon: CalendarDays },
            { label: "Payment follow-up", value: counts.unpaid, Icon: Wallet },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{label}</p>
                <Icon size={20} className="text-teal-700" />
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, phone, booking..."
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <select
              value={bookingFilter}
              onChange={(event) => setBookingFilter(event.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2.5"
            >
              <option value="All">All booking statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="CANCELED">Canceled</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2.5"
            >
              <option value="All">All payment statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Payment Pending">Payment Pending</option>
              <option value="Unpaid">Unpaid</option>
            </select>

            <select
              value={journeyFilter}
              onChange={(event) => setJourneyFilter(event.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2.5"
            >
              <option value="All">All journey statuses</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Schedule unavailable">Schedule unavailable</option>
            </select>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>
              Showing <strong className="text-slate-800">{filteredBookings.length}</strong> of{" "}
              <strong className="text-slate-800">{bookings.length}</strong> bookings
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-500">
              Loading booking information...
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1250px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Booking / Package</th>
                    <th className="px-4 py-3">Booking status</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Tour schedule</th>
                    <th className="px-4 py-3">Journey</th>
                    <th className="px-4 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((booking) => (
                    <tr key={booking.booking_id} className="align-top hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {booking.customer_name}
                        </p>
                        <p className="mt-1 text-slate-500">
                          {booking.customer_phone || "No phone recorded"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-teal-800">
                          {booking.booking_reference}
                        </p>
                        <p className="mt-1 max-w-56 text-slate-600">
                          {booking.package_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {booking.number_of_travelers} traveler(s)
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge value={booking.booking_status} />
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge value={booking.payment_status} />
                        <p className="mt-2 text-xs text-slate-500">
                          Paid: {money(booking.paid_amount)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-xs font-semibold text-slate-500">DEPARTURE</p>
                        <p className="mt-1 text-slate-800">
                          {dateTime(booking.departure_datetime)}
                        </p>
                        <p className="mt-3 text-xs font-semibold text-slate-500">RETURN</p>
                        <p className="mt-1 text-slate-800">
                          {dateTime(booking.return_datetime)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge value={booking.journey_status} />
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {money(booking.total_amount)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Due: {money(booking.remaining_amount)}
                        </p>
                      </td>
                    </tr>
                  ))}

                  {!filteredBookings.length && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                        {error
                          ? "Booking information could not be loaded."
                          : "No bookings match your search and filters."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

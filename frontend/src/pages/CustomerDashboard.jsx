import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  CreditCard,
  MapPin,
  Package,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Compass,
  PlaneTakeoff,
  Wallet,
  Sparkles,
  ChevronRight,
  UserRound,
  Heart,
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
  if (["CONFIRMED", "COMPLETED", "PAID", "APPROVED"].includes(value))
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["CANCELLED", "CANCELED", "FAILED", "REJECTED"].includes(value))
    return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
};

export default function CustomerDashboard({ user }) {
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [bookingData, paymentData] = await Promise.all([
        getMyBookings(),
        getMyPayments(),
      ]);
      setBookings(Array.isArray(bookingData) ? bookingData : []);
      setPayments(Array.isArray(paymentData) ? paymentData : []);
    } catch (err) {
      setError(err?.message || "Unable to load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
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
        if (active) setError(err?.message || "Unable to load your dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const today = new Date();
  const upcomingTrips = useMemo(() => bookings.filter((booking) => {
    const dateValue = booking.departure_datetime || booking.travel_date;
    if (!dateValue || Number.isNaN(new Date(dateValue).getTime())) return false;
    const status = String(booking.status || "").toUpperCase();
    return new Date(dateValue) >= today &&
      !["CANCELLED", "CANCELED", "COMPLETED", "REJECTED"].includes(status);
  }), [bookings]);

  const pendingPayments = payments.filter((payment) =>
    String(payment.payment_status || "").toUpperCase() === "PENDING"
  );

  const cards = [
    { title: "Total bookings", value: bookings.length, note: "All your reservations", icon: CalendarCheck, theme: "from-teal-500 to-cyan-500", tint: "bg-teal-50 text-teal-700" },
    { title: "Upcoming trips", value: upcomingTrips.length, note: "Your next adventures", icon: MapPin, theme: "from-blue-500 to-indigo-500", tint: "bg-blue-50 text-blue-700" },
    { title: "Pending payments", value: pendingPayments.length, note: "Awaiting verification", icon: CreditCard, theme: "from-amber-400 to-orange-500", tint: "bg-amber-50 text-amber-700" },
    { title: "Payment records", value: payments.length, note: "Your payment activity", icon: CheckCircle2, theme: "from-violet-500 to-fuchsia-500", tint: "bg-violet-50 text-violet-700" },
  ];

  return (
    <main className="min-h-screen bg-[#f4f8fb] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
      <div className="mx-auto max-w-7xl space-y-7">
        {/* Welcome banner */}
        <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#073b4c] via-[#086b70] to-[#12a89b] px-6 py-8 text-white shadow-xl shadow-teal-900/10 sm:px-9 sm:py-10">
          <div className="absolute -right-12 -top-24 -z-10 h-72 w-72 rounded-full border-[38px] border-white/10" />
          <div className="absolute right-24 bottom-[-110px] -z-10 h-64 w-64 rounded-full bg-cyan-300/15 blur-2xl" />
          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-teal-50">
                <Sparkles size={14} /> YOUR TRAVEL SPACE
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Welcome back, {user?.username || "Traveler"}!
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-teal-50/90 sm:text-base">
                Your next adventure starts here. Keep an eye on your bookings, trip dates and payments—all in one place.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/packages" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-teal-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-teal-50">
                  <Compass size={18} /> Explore packages <ArrowUpRight size={16} />
                </Link>
                <Link to="/customer/bookings" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20">
                  <CalendarCheck size={18} /> My bookings
                </Link>
              </div>
            </div>
            <div className="hidden shrink-0 md:block">
              <div className="flex h-36 w-36 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-inner">
                <PlaneTakeoff size={68} strokeWidth={1.3} className="-rotate-12 text-white" />
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div className="flex-1"><p className="font-bold">Dashboard data could not be loaded</p><p className="mt-1">{error}</p></div>
            <button type="button" onClick={loadDashboard} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold hover:bg-rose-100"><RefreshCw size={14} /> Retry</button>
          </div>
        )}

        {/* Statistics */}
        <section aria-label="Customer statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.theme}`} />
                <div className="flex items-start justify-between">
                  <span className={`rounded-2xl p-3 ${card.tint}`}><Icon size={22} /></span>
                  <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-400">OVERVIEW</span>
                </div>
                <p className="mt-5 text-sm font-medium text-slate-500">{card.title}</p>
                <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{loading ? "—" : card.value}</p>
                <p className="mt-2 text-xs text-slate-500">{card.note}</p>
              </article>
            );
          })}
        </section>

        {/* Recent bookings */}
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div><div className="flex items-center gap-2"><span className="rounded-lg bg-teal-50 p-2 text-teal-700"><CalendarCheck size={18} /></span><h2 className="text-lg font-bold text-slate-900">Recent bookings</h2></div><p className="mt-2 text-sm text-slate-500">A quick look at your latest reservations.</p></div>
            <Link to="/customer/bookings" className="inline-flex items-center gap-1 self-start rounded-lg px-3 py-2 text-sm font-bold text-teal-700 transition hover:bg-teal-50 sm:self-auto">View all bookings <ChevronRight size={17} /></Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-3 p-10 text-sm text-slate-500"><RefreshCw size={17} className="animate-spin" /> Loading your bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="px-5 py-12 text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600"><Package size={30} /></span><h3 className="mt-4 font-bold text-slate-900">Your journey starts here</h3><p className="mt-2 text-sm text-slate-500">You haven't made any bookings yet. Explore a package and plan your next trip.</p><Link to="/packages" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-700"><Package size={17} /> Browse packages</Link></div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-4 font-bold">Booking reference</th><th className="px-6 py-4 font-bold">Package</th><th className="px-6 py-4 font-bold">Travel date</th><th className="px-6 py-4 font-bold">Amount</th><th className="px-6 py-4 font-bold">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{bookings.slice(0, 5).map((booking) => <tr key={booking.booking_id} className="transition hover:bg-teal-50/30"><td className="px-6 py-4"><span className="font-bold text-slate-800">{booking.booking_reference || `#${booking.booking_id}`}</span></td><td className="px-6 py-4"><span className="font-medium text-slate-700">{booking.package_name || "Tour package"}</span></td><td className="px-6 py-4 text-slate-600">{formatDate(booking.departure_datetime || booking.travel_date)}</td><td className="px-6 py-4 font-bold text-slate-800">{formatBDT(booking.total_amount)}</td><td className="px-6 py-4"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(booking.status)}`}>{booking.status || "Unknown"}</span></td></tr>)}</tbody></table></div>
          )}
        </section>

        {/* Quick links */}
        <section>
          <div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Make it yours</p><h2 className="mt-1 text-xl font-black text-slate-900">Quick access</h2></div></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Link to="/destinations" className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><MapPin size={23} /></span><h3 className="mt-4 font-bold text-slate-900">Explore destinations</h3><p className="mt-1 text-sm leading-5 text-slate-500">Find your next favorite place.</p><span className="mt-4 flex items-center gap-1 text-sm font-bold text-teal-700">Discover places <ArrowUpRight size={16} /></span></Link>
            <Link to="/packages" className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Package size={23} /></span><h3 className="mt-4 font-bold text-slate-900">Browse tour packages</h3><p className="mt-1 text-sm leading-5 text-slate-500">Compare tours and choose your getaway.</p><span className="mt-4 flex items-center gap-1 text-sm font-bold text-blue-700">Find a package <ArrowUpRight size={16} /></span></Link>
            <Link to="/wishlist" className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Heart size={23} /></span><h3 className="mt-4 font-bold text-slate-900">My Wishlist</h3><p className="mt-1 text-sm leading-5 text-slate-500">Keep your favorite tour packages in one place.</p><span className="mt-4 flex items-center gap-1 text-sm font-bold text-rose-600">View wishlist <ArrowUpRight size={16} /></span></Link>
            <Link to="/customer/profile" className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><UserRound size={23} /></span><h3 className="mt-4 font-bold text-slate-900">My profile</h3><p className="mt-1 text-sm leading-5 text-slate-500">Keep your customer information up to date.</p><span className="mt-4 flex items-center gap-1 text-sm font-bold text-violet-700">View profile <ArrowUpRight size={16} /></span></Link>
          </div>
        </section>

        {/* Payment activity */}
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><span className="rounded-lg bg-violet-50 p-2 text-violet-700"><Wallet size={18} /></span><h2 className="text-lg font-bold text-slate-900">Payment activity</h2></div><p className="mt-2 text-sm text-slate-500">Recent payments and their verification status.</p></div><span className="inline-flex items-center gap-2 self-start rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500"><Clock size={14} /> Latest 3 records</span></div>
          {loading ? <p className="mt-5 text-sm text-slate-500">Loading payments...</p> : payments.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No payment records found.</p> : <div className="mt-5 space-y-3">{payments.slice(0, 3).map((payment) => <div key={payment.payment_id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-100 p-4 transition hover:border-teal-100 hover:bg-teal-50/20 sm:flex-row sm:items-center"><div><p className="font-bold text-slate-800">Booking #{payment.booking_id}</p><p className="mt-1 text-xs text-slate-500">{payment.payment_method || "Payment method unavailable"} <span className="mx-1">·</span> {formatDate(payment.payment_date)}</p></div><div className="flex items-center justify-between gap-3 sm:justify-end"><span className="font-bold text-slate-900">{formatBDT(payment.amount)}</span><span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(payment.payment_status)}`}>{payment.payment_status || "Unknown"}</span></div></div>)}</div>}
        </section>
        <p className="pb-2 text-center text-xs font-medium text-slate-400">TravelMate · Your journey, beautifully organized</p>
      </div>
    </main>
  );
}

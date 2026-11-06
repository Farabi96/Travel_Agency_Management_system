import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMyBookings,
  getPaymentMethods,
  createPaymentRequest,
  getInvoiceByBooking,
  getBookingPayments,
  cancelBooking,
  getMyReviews,
  updateReview,
} from "../services/api";

const money = (value) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const dateText = (value) =>
  value ? new Date(value).toLocaleDateString("en-GB") : "Not available";

const getStatus = (booking) =>
  String(
    booking.status_name ||
      booking.status?.status_name ||
      booking.status ||
      "UNKNOWN"
  )
    .trim()
    .toUpperCase();

const statusStyles = (status) => {
  if (["CONFIRMED", "BOOKED", "COMPLETED", "FINISHED"].includes(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["CANCELLED", "CANCELED", "REJECTED"].includes(status)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (["PENDING", "IN_PROGRESS", "ACTIVE"].includes(status)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-600";
};

const paymentStatusStyles = (status) => {
  if (status === "PAID") return "text-emerald-700";
  if (status === "PENDING") return "text-amber-700";
  if (status === "FAILED" || status === "REFUNDED") return "text-rose-700";
  return "text-slate-600";
};

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [reviewDraft, setReviewDraft] = useState({
    rating: "5",
    comment: "",
  });
  const [reviewBusy, setReviewBusy] = useState(false);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [paymentsByBooking, setPaymentsByBooking] = useState({});
  const [methods, setMethods] = useState([]);
  const [forms, setForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [invoiceView, setInvoiceView] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  // Refresh countdowns once per second without reloading booking/payment data.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function countdownText(value) {
    if (!value) return "Schedule not available";

    const target = new Date(value).getTime();
    if (Number.isNaN(target)) return "Schedule not available";

    const diff = target - now;
    if (diff <= 0) return "Time reached";

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  function scheduleLabel(booking) {
    const status = getStatus(booking);

    if (["CANCELLED", "CANCELED"].includes(status)) {
      return "Journey cancelled";
    }

    if (["COMPLETED", "FINISHED"].includes(status)) {
      return "Journey completed";
    }

    if (
      booking.return_datetime &&
      new Date(booking.return_datetime).getTime() <= now
    ) {
      return "Journey return time passed — server must update booking status";
    }

    if (
      booking.departure_datetime &&
      new Date(booking.departure_datetime).getTime() > now
    ) {
      return `Journey starts in ${countdownText(
        booking.departure_datetime
      )}`;
    }

    if (
      booking.return_datetime &&
      new Date(booking.return_datetime).getTime() > now
    ) {
      return `Journey ends in ${countdownText(booking.return_datetime)}`;
    }

    return "Schedule not available";
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Bookings are essential: load them independently.
      const bookingData = await getMyBookings();
      const ownBookings = Array.isArray(bookingData) ? bookingData : [];

      setBookings(ownBookings);

      // Optional data should not prevent the bookings from appearing.
      const [methodResult, reviewResult] = await Promise.allSettled([
        getPaymentMethods(),
        getMyReviews(),
      ]);

      setMethods(
        methodResult.status === "fulfilled" &&
          Array.isArray(methodResult.value)
          ? methodResult.value.filter((method) => method.available_for_request)
          : []
      );

      setReviews(
        reviewResult.status === "fulfilled" &&
          Array.isArray(reviewResult.value)
          ? reviewResult.value
          : []
      );

      // Load payment history for each booking independently.
      const paymentEntries = await Promise.all(
        ownBookings.map(async (booking) => {
          try {
            const records = await getBookingPayments(booking.booking_id);
            return [
              booking.booking_id,
              Array.isArray(records) ? records : [],
            ];
          } catch {
            return [booking.booking_id, []];
          }
        })
      );

      setPaymentsByBooking(Object.fromEntries(paymentEntries));
    } catch (e) {
      setError(e.message || "Could not load bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const bookingMatchesFilter = (booking, filter) => {
    const status = getStatus(booking);

    if (filter === "ALL") return true;

    if (filter === "SCHEDULED") {
      return [
        "PENDING",
        "CONFIRMED",
        "BOOKED",
        "IN_PROGRESS",
        "ACTIVE",
      ].includes(status);
    }

    if (filter === "COMPLETED") {
      return ["COMPLETED", "FINISHED"].includes(status);
    }

    if (filter === "CANCELLED") {
      return ["CANCELLED", "CANCELED"].includes(status);
    }

    return true;
  };

  const filteredBookings = bookings.filter((booking) =>
    bookingMatchesFilter(booking, activeFilter)
  );

  const bookingSummary = bookings.reduce(
    (summary, booking) => {
      const status = getStatus(booking);
      const travelDate = new Date(
        booking.departure_datetime || booking.travel_date
      ).getTime();

      const isUpcoming =
        Number.isFinite(travelDate) &&
        travelDate >= Date.now() &&
        ![
          "CANCELLED",
          "CANCELED",
          "COMPLETED",
          "FINISHED",
          "REJECTED",
        ].includes(status);

      const payments = paymentsByBooking[booking.booking_id] || [];

      const paid = payments
        .filter((payment) => payment.payment_status === "PAID")
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      const total = Number(booking.total_amount || 0);
      const isCancelled = ["CANCELLED", "CANCELED"].includes(status);

      summary.total += 1;
      summary.upcoming += isUpcoming ? 1 : 0;
      summary.paid += paid;
      summary.outstanding += isCancelled ? 0 : Math.max(0, total - paid);

      return summary;
    },
    { total: 0, upcoming: 0, paid: 0, outstanding: 0 }
  );

  const bookingFilters = [
    { id: "ALL", label: "All bookings" },
    { id: "SCHEDULED", label: "Scheduled / active" },
    { id: "COMPLETED", label: "Completed" },
    { id: "CANCELLED", label: "Cancelled" },
  ];

  const setForm = (id, patch) =>
    setForms((old) => ({
      ...old,
      [id]: {
        payment_method_id: "",
        amount: "",
        transaction_reference: "",
        ...(old[id] || {}),
        ...patch,
      },
    }));

  async function submitPayment(booking) {
    const form = forms[booking.booking_id] || {};

    setError("");
    setMessage("");

    if (
      !form.payment_method_id ||
      !form.amount ||
      !form.transaction_reference?.trim()
    ) {
      setError(
        "Choose a payment method and enter the amount and actual transaction/reference ID."
      );
      return;
    }

    const amount = Number(form.amount);
    const paymentRecords = paymentsByBooking[booking.booking_id] || [];

    const paidAmount = paymentRecords
      .filter((payment) => payment.payment_status === "PAID")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const pendingRequest = paymentRecords.some(
      (payment) => payment.payment_status === "PENDING"
    );

    const totalAmount = Number(booking.total_amount || 0);
    const outstanding = Math.max(0, totalAmount - paidAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    if (amount > outstanding + 0.001) {
      setError("Payment amount cannot exceed the outstanding balance.");
      return;
    }

    if (pendingRequest) {
      setError(
        "Please wait until your pending payment request is reviewed."
      );
      return;
    }

    if (amount < outstanding - 0.001) {
      setError(
        `Full payment is required. Please pay the remaining balance of ${money(
          outstanding
        )}.`
      );
      return;
    }

    setBusyId(booking.booking_id);

    try {
      const result = await createPaymentRequest({
        booking_id: booking.booking_id,
        payment_method_id: Number(form.payment_method_id),
        amount: form.amount,
        transaction_reference: form.transaction_reference.trim(),
      });

      setMessage(
        result.message ||
          "Payment request submitted. It remains pending until staff verifies it."
      );

      setForm(booking.booking_id, {
        amount: "",
        transaction_reference: "",
      });

      await load();
    } catch (e) {
      setError(e.message || "Could not submit payment request.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancelBooking(booking) {
    const currentStatus = getStatus(booking);

    if (
      ["CANCELLED", "CANCELED", "COMPLETED", "FINISHED"].includes(
        currentStatus
      )
    ) {
      return;
    }

    const accepted = window.confirm(
      `Cancel booking ${booking.booking_reference}? This will not issue a refund automatically. Refund handling may be added separately later. Continue?`
    );

    if (!accepted) return;

    setError("");
    setMessage("");
    setBusyId(booking.booking_id);

    try {
      const result = await cancelBooking(booking.booking_id);
      setMessage(result.message || "Booking cancelled successfully.");
      await load();
    } catch (e) {
      setError(e.message || "Could not cancel this booking.");
    } finally {
      setBusyId(null);
    }
  }

  function beginReviewEdit(review) {
    setError("");
    setMessage("");
    setEditingReviewId(review.review_id);
    setReviewDraft({
      rating: String(review.rating ?? 5),
      comment: review.comment ?? "",
    });
  }

  async function saveReviewEdit(review) {
    const rating = Number(reviewDraft.rating);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setError("Choose a rating from 1 to 5 stars.");
      return;
    }

    setError("");
    setMessage("");
    setReviewBusy(true);

    try {
      const result = await updateReview(review.review_id, {
        rating,
        comment: reviewDraft.comment.trim(),
      });

      setReviews((current) =>
        current.map((item) =>
          String(item.review_id) === String(review.review_id)
            ? {
                ...item,
                rating,
                comment: reviewDraft.comment.trim(),
                review_status:
                  result.review_status ?? item.review_status,
              }
            : item
        )
      );

      setEditingReviewId(null);
      setMessage(result.message || "Your review was updated successfully.");
    } catch (e) {
      setError(e.message || "Could not update your review.");
    } finally {
      setReviewBusy(false);
    }
  }

  async function openInvoice(booking) {
    setError("");
    setMessage("");

    try {
      const [invoice, payments] = await Promise.all([
        getInvoiceByBooking(booking.booking_id),
        getBookingPayments(booking.booking_id),
      ]);

      const paid = payments
        .filter((payment) => payment.payment_status === "PAID")
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      const pending = payments.filter(
        (payment) => payment.payment_status === "PENDING"
      );

      const isCancelled = ["CANCELLED", "CANCELED"].includes(
        getStatus(booking)
      );

      const balance = isCancelled
        ? 0
        : Math.max(0, Number(invoice.total_amount || 0) - paid);

      setInvoiceView({
        booking,
        invoice,
        payments,
        paid,
        pending,
        balance,
      });
    } catch (e) {
      setError(
        e.message ||
          "Invoice is not available yet. Submit a payment request to generate it."
      );
    }
  }

  function printInvoice() {
    if (!invoiceView) return;

    const { booking, invoice, payments, paid, pending, balance } =
      invoiceView;

    const esc = (value) =>
      String(value ?? "—").replace(
        /[&<>"']/g,
        (character) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[character]
      );

    const rows = (payments || [])
      .map(
        (payment) =>
          `<tr><td>${esc(payment.transaction_reference)}</td><td>${esc(
            payment.payment_method
          )}</td><td>${esc(payment.payment_status)}</td><td>${money(
            payment.amount
          )}</td></tr>`
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) {
      setError(
        "Your browser blocked the print window. Allow pop-ups and try again."
      );
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
      <head>
        <title>${esc(invoice.invoice_number)}</title>
        <meta charset="utf-8">
        <style>
          body{font-family:Arial,sans-serif;margin:36px;color:#172033}
          h1{margin-bottom:4px}
          small{color:#64748b}
          .row{display:flex;justify-content:space-between;margin:24px 0}
          .box{background:#f1f5f9;padding:14px;margin:8px 0}
          table{width:100%;border-collapse:collapse;margin-top:18px}
          th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}
          .total{font-size:20px;font-weight:bold}
          @media print{button{display:none}}
        </style>
      </head>
      <body>
        <h1>Travel Agency Invoice</h1>
        <small>Invoice ${esc(invoice.invoice_number)}</small>
        <div class="row">
          <div>
            <b>Booking reference</b><br>${esc(booking.booking_reference)}<br>
            <b>Package</b><br>${esc(
              booking.package_name || booking.package?.package_name
            )}
          </div>
          <div>
            <b>Invoice date</b><br>${esc(dateText(invoice.invoice_date))}<br>
            <b>Travel date</b><br>${esc(dateText(booking.travel_date))}
          </div>
        </div>
        <div class="box">
          Invoice total: <b>${money(invoice.total_amount)}</b><br>
          Verified payments received: <b>${money(paid)}</b><br>
          Pending requests (not counted as paid): <b>${pending.length}</b><br>
          <span class="total">Outstanding balance: ${money(balance)}</span>
        </div>
        <h2>Payment history</h2>
        <table>
          <thead>
            <tr><th>Reference</th><th>Method</th><th>Status</th><th>Amount</th></tr>
          </thead>
          <tbody>
            ${
              rows ||
              "<tr><td colspan='4'>No payment requests yet</td></tr>"
            }
          </tbody>
        </table>
        <p><small>Only payments marked PAID by staff count as received. Pending requests are not receipts.</small></p>
        <button onclick="window.print()">Print / Save as PDF</button>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
  }

  const summaryCards = [
    {
      label: "Total Bookings",
      value: bookingSummary.total,
      detail: "All your reservations",
      icon: "✈️",
      gradient: "from-sky-500 to-blue-600",
      soft: "bg-sky-50",
    },
    {
      label: "Upcoming Trips",
      value: bookingSummary.upcoming,
      detail: "Journeys ahead",
      icon: "🧳",
      gradient: "from-violet-500 to-purple-600",
      soft: "bg-violet-50",
    },
    {
      label: "Verified Payments",
      value: money(bookingSummary.paid),
      detail: "Confirmed by staff",
      icon: "💳",
      gradient: "from-emerald-500 to-teal-600",
      soft: "bg-emerald-50",
    },
    {
      label: "Outstanding",
      value: money(bookingSummary.outstanding),
      detail: "Remaining balance",
      icon: "🧾",
      gradient: "from-orange-500 to-rose-500",
      soft: "bg-orange-50",
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-slate-50 to-white">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-7 sm:px-6 lg:px-8">
        {/* Page hero */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-800 via-teal-700 to-cyan-700 px-6 py-8 text-white shadow-xl sm:px-9 sm:py-10">
          <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-24 right-36 h-48 w-48 rounded-full bg-cyan-300/10" />

          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-teal-50">
                <span>🌍</span>
                Your travel dashboard
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                My Bookings
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-teal-50 sm:text-base">
                Keep track of your journeys, manage payments, and revisit your
                travel memories—all in one place.
              </p>
            </div>

            <Link
              to="/packages"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-teal-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-teal-50"
            >
              <span>Explore packages</span>
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>

        {/* Summary cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => (
            <article
              key={item.label}
              className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className={`h-1.5 bg-gradient-to-r ${item.gradient}`} />
              <div className="flex items-start justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-3 break-words text-2xl font-extrabold tracking-tight text-slate-900">
                    {item.value}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">{item.detail}</p>
                </div>
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${item.soft}`}
                >
                  {item.icon}
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* Alerts */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 shadow-sm"
          >
            <span className="text-lg">⚠️</span>
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 shadow-sm"
          >
            <span className="text-lg">✓</span>
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        {/* Booking filters */}
        {!loading && !error && bookings.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Your journeys
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select a category to organize your bookings.
                </p>
              </div>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-700">
                {filteredBookings.length} shown
              </span>
            </div>

            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label="Filter bookings"
            >
              {bookingFilters.map((filter) => {
                const count = bookings.filter((booking) =>
                  bookingMatchesFilter(booking, filter.id)
                ).length;
                const selected = activeFilter === filter.id;

                return (
                  <button
                    key={filter.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveFilter(filter.id)}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                      selected
                        ? "border-teal-700 bg-teal-700 text-white shadow-md shadow-teal-700/20"
                        : "border-slate-200 bg-white text-slate-600 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-800"
                    }`}
                  >
                    {filter.label}
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                        selected
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Booking list */}
        {loading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-teal-100 border-t-teal-700" />
            <p className="mt-4 font-semibold text-slate-700">
              Loading your bookings...
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Getting your travel details ready.
            </p>
          </section>
        ) : bookings.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-teal-200 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-teal-50 text-4xl">
              🧳
            </div>
            <h2 className="mt-5 text-2xl font-bold text-slate-900">
              Your next adventure starts here
            </h2>
            <p className="mx-auto mt-2 max-w-md text-slate-500">
              You don’t have any bookings yet. Explore our tour packages and
              plan your next trip.
            </p>
            <Link
              to="/packages"
              className="mt-6 inline-flex rounded-xl bg-teal-700 px-5 py-3 font-bold text-white shadow-md transition hover:bg-teal-800"
            >
              Explore tours
            </Link>
          </section>
        ) : filteredBookings.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="text-4xl">🗺️</div>
            <h2 className="mt-3 font-bold text-slate-800">
              No{" "}
              {bookingFilters
                .find((filter) => filter.id === activeFilter)
                ?.label.toLowerCase()}{" "}
              found
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Bookings in this category will appear here.
            </p>
            <button
              type="button"
              onClick={() => setActiveFilter("ALL")}
              className="mt-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-800 transition hover:bg-teal-100"
            >
              View all bookings
            </button>
          </section>
        ) : (
          <div className="space-y-6">
            {filteredBookings.map((booking) => {
              const form = forms[booking.booking_id] || {};
              const paymentRecords =
                paymentsByBooking[booking.booking_id] || [];

              const paidAmount = paymentRecords
                .filter((payment) => payment.payment_status === "PAID")
                .reduce(
                  (sum, payment) => sum + Number(payment.amount || 0),
                  0
                );

              const pendingRecords = paymentRecords.filter(
                (payment) => payment.payment_status === "PENDING"
              );

              const bookingStatus = getStatus(booking);
              const isCancelled = ["CANCELLED", "CANCELED"].includes(
                bookingStatus
              );

              const outstanding = isCancelled
                ? 0
                : Math.max(
                    0,
                    Number(booking.total_amount || 0) - paidAmount
                  );

              const paymentSummary = isCancelled
                ? "CANCELLED"
                : outstanding <= 0
                ? "PAID"
                : paidAmount > 0
                ? "PARTIALLY PAID"
                : pendingRecords.length
                ? "PAYMENT PENDING"
                : "UNPAID";

              const canCancel = ![
                "CANCELLED",
                "CANCELED",
                "COMPLETED",
                "FINISHED",
              ].includes(bookingStatus);

              const canShowReview = ["COMPLETED", "FINISHED"].includes(
                bookingStatus
              );

              const reviewForBooking = reviews.find(
                (review) =>
                  String(review.booking_id) === String(booking.booking_id)
              );

              const isEditingThisReview =
                reviewForBooking &&
                String(editingReviewId) ===
                  String(reviewForBooking.review_id);

              const packageName =
                booking.package_name ||
                booking.package?.package_name ||
                `Package #${booking.package_id}`;

              const rating = Math.max(
                0,
                Math.min(5, Number(reviewForBooking?.rating) || 0)
              );

              return (
                <article
                  key={booking.booking_id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md transition duration-200 hover:shadow-xl"
                >
                  {/* Booking card header */}
                  <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-teal-900 to-teal-800 px-5 py-5 text-white sm:px-7">
                    <div className="pointer-events-none absolute -right-6 -top-10 h-36 w-36 rounded-full bg-white/5" />

                    <div className="relative flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-teal-100">
                            Booking #{booking.booking_id}
                          </span>
                          <span className="text-xs text-teal-100/80">
                            Reference: {booking.booking_reference || "—"}
                          </span>
                        </div>
                        <h2 className="text-xl font-extrabold leading-snug sm:text-2xl">
                          {packageName}
                        </h2>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold ${statusStyles(
                          bookingStatus
                        )}`}
                      >
                        {booking.status_name ||
                          booking.status?.status_name ||
                          booking.status ||
                          "Unknown"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-5 p-5 sm:p-7">
                    {/* Trip information */}
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-sky-800">
                          <span>📅</span>
                          Travel date
                        </div>
                        <p className="mt-2 text-lg font-bold text-slate-900">
                          {dateText(
                            booking.travel_date || booking.departure_datetime
                          )}
                        </p>
                        <p className="mt-2 text-xs font-semibold leading-5 text-teal-700">
                          {scheduleLabel(booking)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-violet-800">
                          <span>👥</span>
                          Travelers
                        </div>
                        <p className="mt-2 text-2xl font-extrabold text-slate-900">
                          {booking.number_of_travelers ?? "—"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Registered travelers
                        </p>
                      </div>

                      <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                          <span>💰</span>
                          Booking total
                        </div>
                        <p className="mt-2 break-words text-2xl font-extrabold text-slate-900">
                          {money(booking.total_amount)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Total package cost
                        </p>
                      </div>
                    </div>

                    {/* Payment summary */}
                    <section>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-bold text-slate-900">
                          Payment overview
                        </h3>
                        <span
                          className={`rounded-full bg-slate-100 px-3 py-1 text-xs font-bold ${paymentStatusStyles(
                            paymentSummary
                          )}`}
                        >
                          {paymentSummary}
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                          <p className="text-sm font-medium text-emerald-800">
                            Verified paid
                          </p>
                          <p className="mt-1 text-xl font-extrabold text-emerald-700">
                            {money(paidAmount)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-4">
                          <p className="text-sm font-medium text-rose-800">
                            Outstanding balance
                          </p>
                          <p className="mt-1 text-xl font-extrabold text-rose-700">
                            {money(outstanding)}
                          </p>
                        </div>
                      </div>
                    </section>

                    {/* Payment history */}
                    {paymentRecords.length > 0 && (
                      <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                            💳
                          </span>
                          <h3 className="font-bold text-slate-900">
                            Payment requests & history
                          </h3>
                        </div>

                        <div className="space-y-2">
                          {paymentRecords.map((payment) => (
                            <div
                              key={payment.payment_id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                            >
                              <div className="min-w-0">
                                <p className="break-all font-semibold text-slate-800">
                                  {payment.payment_method || "Payment"} ·{" "}
                                  {payment.transaction_reference || "No reference"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs font-bold ${paymentStatusStyles(
                                    payment.payment_status
                                  )}`}
                                >
                                  {payment.payment_status}
                                </span>
                                <span className="font-bold text-slate-900">
                                  {money(payment.amount)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Review section */}
                    {canShowReview && reviewForBooking && (
                      <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span>⭐</span>
                              <h3 className="font-bold text-slate-900">
                                Your review
                              </h3>
                            </div>
                            <p className="mt-2 text-lg text-amber-500">
                              {"★".repeat(rating)}
                              {"☆".repeat(5 - rating)}
                              <span className="ml-2 text-sm font-semibold text-slate-600">
                                ({reviewForBooking.rating}/5)
                              </span>
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {reviewForBooking.comment ||
                                "No written comment."}
                            </p>
                            {reviewForBooking.review_status && (
                              <p className="mt-2 text-xs text-slate-500">
                                Review status: {reviewForBooking.review_status}
                              </p>
                            )}
                          </div>

                          {!isEditingThisReview && (
                            <button
                              type="button"
                              onClick={() =>
                                beginReviewEdit(reviewForBooking)
                              }
                              className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-amber-100"
                            >
                              Edit review
                            </button>
                          )}
                        </div>

                        {isEditingThisReview && (
                          <div className="mt-4 space-y-3 border-t border-amber-200 pt-4">
                            <label className="block text-sm font-semibold text-slate-700">
                              Rating
                              <select
                                value={reviewDraft.rating}
                                onChange={(event) =>
                                  setReviewDraft((current) => ({
                                    ...current,
                                    rating: event.target.value,
                                  }))
                                }
                                className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
                              >
                                <option value="5">5 — Excellent</option>
                                <option value="4">4 — Very good</option>
                                <option value="3">3 — Good</option>
                                <option value="2">2 — Fair</option>
                                <option value="1">1 — Poor</option>
                              </select>
                            </label>

                            <label className="block text-sm font-semibold text-slate-700">
                              Comment
                              <textarea
                                rows={3}
                                maxLength={2000}
                                value={reviewDraft.comment}
                                onChange={(event) =>
                                  setReviewDraft((current) => ({
                                    ...current,
                                    comment: event.target.value,
                                  }))
                                }
                                placeholder="Share your experience..."
                                className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
                              />
                            </label>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={reviewBusy}
                                onClick={() =>
                                  saveReviewEdit(reviewForBooking)
                                }
                                className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-50"
                              >
                                {reviewBusy ? "Saving..." : "Save changes"}
                              </button>
                              <button
                                type="button"
                                disabled={reviewBusy}
                                onClick={() => setEditingReviewId(null)}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </section>
                    )}

                    {canShowReview && !reviewForBooking && (
                      <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                        No review is linked to this booking yet. If you have
                        already reviewed this package, refresh the page to
                        reload your review.
                      </p>
                    )}

                    {/* Payment request form */}
                    <section className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/80 to-white p-4 sm:p-5">
                      {outstanding > 0 &&
                      ![
                        "CANCELLED",
                        "CANCELED",
                        "COMPLETED",
                        "FINISHED",
                      ].includes(bookingStatus) ? (
                        <>
                          <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-xl">
                              💸
                            </span>
                            <div>
                              <h3 className="font-bold text-slate-900">
                                Submit a payment request
                              </h3>
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                Full payment is required. Requests remain
                                pending until staff verifies them. Enter your
                                actual transfer or receipt reference.
                              </p>
                            </div>
                          </div>

                          {pendingRecords.length > 0 && (
                            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                              A payment request is awaiting verification.
                              Please wait for staff to verify or reject it
                              before submitting another.
                            </p>
                          )}

                          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <select
                              disabled={pendingRecords.length > 0}
                              value={form.payment_method_id || ""}
                              onChange={(event) =>
                                setForm(booking.booking_id, {
                                  payment_method_id: event.target.value,
                                })
                              }
                              className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-100"
                            >
                              <option value="">Payment method</option>
                              {methods.map((method) => (
                                <option
                                  key={method.payment_method_id}
                                  value={method.payment_method_id}
                                >
                                  {method.method_name}
                                </option>
                              ))}
                            </select>

                            <input
                              disabled={pendingRecords.length > 0}
                              type="number"
                              min="0.01"
                              max={outstanding}
                              step="0.01"
                              value={form.amount || ""}
                              onChange={(event) =>
                                setForm(booking.booking_id, {
                                  amount: event.target.value,
                                })
                              }
                              placeholder={`Amount (max ${money(
                                outstanding
                              )})`}
                              className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-100"
                            />

                            <input
                              disabled={pendingRecords.length > 0}
                              value={form.transaction_reference || ""}
                              onChange={(event) =>
                                setForm(booking.booking_id, {
                                  transaction_reference: event.target.value,
                                })
                              }
                              placeholder="Transaction / receipt ID"
                              className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-100"
                            />

                            <button
                              type="button"
                              disabled={
                                busyId === booking.booking_id ||
                                pendingRecords.length > 0
                              }
                              onClick={() => submitPayment(booking)}
                              className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {pendingRecords.length > 0
                                ? "Request pending"
                                : busyId === booking.booking_id
                                ? "Submitting..."
                                : "Submit request"}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-xl">
                            ✓
                          </span>
                          <p className="text-sm font-semibold text-emerald-800">
                            {outstanding <= 0
                              ? "Payment complete. No outstanding balance remains."
                              : "Payment requests are unavailable for this booking status."}
                          </p>
                        </div>
                      )}
                    </section>

                    {/* Booking actions */}
                    <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                      <button
                        type="button"
                        onClick={() => openInvoice(booking)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                      >
                        <span>🧾</span>
                        View / print invoice
                      </button>

                      {canCancel && (
                        <button
                          type="button"
                          disabled={busyId === booking.booking_id}
                          onClick={() => handleCancelBooking(booking)}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span>✕</span>
                          {busyId === booking.booking_id
                            ? "Processing..."
                            : "Cancel booking"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoice modal */}
      {invoiceView && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <section className="mx-auto my-8 max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 bg-gradient-to-r from-teal-800 to-cyan-700 px-6 py-5 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-100">
                  Travel agency invoice
                </p>
                <h2 className="mt-1 text-2xl font-extrabold">
                  Invoice {invoiceView.invoice.invoice_number}
                </h2>
                <p className="mt-1 text-sm text-teal-100">
                  Booking {invoiceView.booking.booking_reference}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInvoiceView(null)}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/20"
              >
                Close
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">
                    Invoice total
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-slate-900">
                    {money(invoiceView.invoice.total_amount)}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-sm font-medium text-emerald-700">
                    Verified paid
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-emerald-800">
                    {money(invoiceView.paid)}
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-700">
                    Pending requests
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-amber-800">
                    {invoiceView.pending.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                  <p className="text-sm font-medium text-rose-700">
                    Outstanding balance
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-rose-800">
                    {money(invoiceView.balance)}
                  </p>
                </div>
              </div>

              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                Pending payments are excluded from the verified paid total.
              </p>

              <button
                type="button"
                onClick={printInvoice}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 font-bold text-white shadow-md transition hover:bg-teal-800"
              >
                <span>🖨️</span>
                Print / Save as PDF
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default MyBookings;
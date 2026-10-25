import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getPaymentOverview,
  updatePaymentStatus,
  getPaymentMethods,
  recordOfflinePayment,
} from "../services/api";

const money = (value) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const dateText = (value) => {
  if (!value) return "â€”";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB");
};

function StatusBadge({ status }) {
  const styles = {
    PAID: "bg-emerald-100 text-emerald-700",
    PARTIALLY_PAID: "bg-amber-100 text-amber-700",
    PENDING: "bg-blue-100 text-blue-700",
    UNPAID: "bg-red-100 text-red-700",
    CANCELLED: "bg-slate-200 text-slate-700",
REFUNDED: "bg-purple-100 text-purple-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {(status || "UNKNOWN").replaceAll("_", " ")}
    </span>
  );
}

export default function PaymentManagement() {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [offlineMethods, setOfflineMethods] = useState([]);
  const [offlineForm, setOfflineForm] = useState({ booking_id: "", payment_method_id: "", amount: "", transaction_reference: "", notes: "" });
  const [recording, setRecording] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getPaymentOverview();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load payment overview.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    getPaymentMethods()
      .then((methods) => setOfflineMethods(Array.isArray(methods) ? methods.filter((m) => m.available_for_request && !m.is_online) : []))
      .catch((err) => setActionError(err.message || "Could not load payment methods."));
  }, [loadOverview]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesSearch = [
        booking.booking_reference,
        booking.customer_name,
        booking.package_name,
        booking.invoice_number,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));

      const matchesFilter =
        filter === "ALL" || booking.payment_summary === filter;

      return matchesSearch && matchesFilter;
    });
  }, [bookings, search, filter]);

  const totals = useMemo(
    () =>
      filteredBookings.reduce(
        (sum, booking) => ({
          bookings: sum.bookings + 1,
          received: sum.received + Number(booking.paid_amount || 0),
          outstanding: sum.outstanding + Number(booking.balance || 0),
          unpaid:
            sum.unpaid +
            (Number(booking.balance || 0) > 0 ? 1 : 0),
        }),
        { bookings: 0, received: 0, outstanding: 0, unpaid: 0 }
      ),
    [filteredBookings]
  );

  async function handlePaymentAction(payment, statusName) {
    const actionText =
      statusName === "PAID"
        ? "confirm that the payment has actually been received"
        : statusName === "FAILED"
          ? "mark this payment request as failed"
          : "mark this payment as refunded";

    if (!window.confirm(`Please ${actionText}. Continue?`)) return;

    setProcessingId(payment.payment_id);
    setActionError("");

    try {
      await updatePaymentStatus(payment.payment_id, statusName);
      await loadOverview();
    } catch (err) {
      setActionError(err.message || "Could not update payment status.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleRecordOfflinePayment(event) {
    event.preventDefault();
    setActionError("");
    if (!offlineForm.booking_id || !offlineForm.payment_method_id || !offlineForm.amount) {
      setActionError("Booking ID, payment method, and amount are required.");
      return;
    }
    setRecording(true);
    try {
      await recordOfflinePayment({
        booking_id: Number(offlineForm.booking_id),
        payment_method_id: Number(offlineForm.payment_method_id),
        amount: offlineForm.amount,
        transaction_reference: offlineForm.transaction_reference.trim(),
        notes: offlineForm.notes.trim(),
      });
      setOfflineForm({ booking_id: "", payment_method_id: "", amount: "", transaction_reference: "", notes: "" });
      await loadOverview();
    } catch (err) {
      setActionError(err.message || "Could not record offline payment.");
    } finally { setRecording(false); }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
              Finance and operations
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Payment Management
            </h1>
            <p className="mt-2 text-slate-600">
              Track booking balances and verify customer payment requests.
            </p>
          </div>

          <button
            onClick={loadOverview}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {actionError && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {actionError}
          </div>
        )}

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Bookings shown</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totals.bookings}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Payments received</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {money(totals.received)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Outstanding balance</p>
            <p className="mt-2 text-2xl font-bold text-red-700">
              {money(totals.outstanding)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Bookings with balance</p>
            <p className="mt-2 text-2xl font-bold text-amber-700">
              {totals.unpaid}
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Record an Offline Payment</h2>
          <p className="mt-1 text-sm text-slate-600">Use this only after receiving cash or confirming a bank transfer. Recorded payments are immediately marked PAID.</p>
          <form onSubmit={handleRecordOfflinePayment} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <select required value={offlineForm.booking_id} onChange={(e) => setOfflineForm((f) => ({ ...f, booking_id: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2"><option value="">Select booking (ID / reference / customer)</option>{bookings.map((b) => <option key={b.booking_id} value={b.booking_id}>#{b.booking_id} · {b.booking_reference} · {b.customer_name}</option>)}</select>
            <select required value={offlineForm.payment_method_id} onChange={(e) => setOfflineForm((f) => ({ ...f, payment_method_id: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2"><option value="">Payment method</option>{offlineMethods.map((m) => <option key={m.payment_method_id} value={m.payment_method_id}>{m.method_name}</option>)}</select>
            <input type="number" min="0.01" step="0.01" required value={offlineForm.amount} onChange={(e) => setOfflineForm((f) => ({ ...f, amount: e.target.value }))} placeholder="Amount (BDT)" className="rounded-lg border border-slate-300 px-3 py-2" />
            <input value={offlineForm.transaction_reference} onChange={(e) => setOfflineForm((f) => ({ ...f, transaction_reference: e.target.value }))} placeholder="Reference (optional)" className="rounded-lg border border-slate-300 px-3 py-2" />
            <input value={offlineForm.notes} onChange={(e) => setOfflineForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)" className="rounded-lg border border-slate-300 px-3 py-2" />
            <button type="submit" disabled={recording} className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{recording ? "Recording..." : "Record payment"}</button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search booking, customer, package, or invoice..."
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-teal-600"
            >
              <option value="ALL">All payment statuses</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PENDING">Payment pending</option>
              <option value="PARTIALLY_PAID">Partially paid</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled bookings</option>
            </select>
          </div>

          {loading ? (
            <p className="py-12 text-center text-slate-500">
              Loading payment records...
            </p>
          ) : filteredBookings.length === 0 ? (
            <p className="py-12 text-center text-slate-500">
              No bookings match your search.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Booking / Customer</th>
                    <th className="px-4 py-3">Tour package</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Balance</th>
                    <th className="px-4 py-3">Payment status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((booking) => (
                    <tr key={booking.booking_id} className="align-top hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {booking.booking_reference}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">Booking ID: {booking.booking_id}</p>
                        <p className="mt-1 text-slate-600">
                          {booking.customer_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Travel: {dateText(booking.travel_date)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Invoice: {booking.invoice_number || "Not generated"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {booking.package_name || "â€”"}
                        <p className="mt-1 text-xs text-slate-500">
                          Booking: {booking.booking_status || "â€”"}
                        </p>
                      </td>

                      <td className="px-4 py-4 font-medium text-slate-800">
                        {money(booking.total_amount)}
                      </td>

                      <td className="px-4 py-4 font-medium text-emerald-700">
                        {money(booking.paid_amount)}
                      </td>

                      <td className="px-4 py-4 font-semibold text-red-700">
                        {money(booking.balance)}
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={booking.payment_summary} />

                        {booking.pending_payments?.length > 0 && (
                          <div className="mt-3 min-w-64 space-y-3">
                            {booking.pending_payments.map((payment) => (
                              <div
                                key={payment.payment_id}
                                className="rounded-lg border border-slate-200 p-3"
                              >
                                <p className="font-semibold text-slate-800">
                                  {payment.transaction_reference}
                                </p>
                                <p className="mt-1 text-slate-600">
                                  {money(payment.amount)} Â·{" "}
                                  {payment.payment_method || "Payment method"}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Request status: {payment.payment_status}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    disabled={processingId === payment.payment_id}
                                    onClick={() =>
                                      handlePaymentAction(payment, "PAID")
                                    }
                                    className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    Confirm paid
                                  </button>
                                  <button
                                    disabled={processingId === payment.payment_id}
                                    onClick={() =>
                                      handlePaymentAction(payment, "FAILED")
                                    }
                                    className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                                  >
                                    Mark failed
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500">
            Only payments marked PAID count as received. Verify the actual
            transaction before confirming payment.
          </p>
        </section>
      </div>
    </main>
  );
}

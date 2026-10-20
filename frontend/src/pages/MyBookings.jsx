import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMyBookings,
  getPaymentMethods,
  createPaymentRequest,
  getInvoiceByBooking,
  getBookingPayments,
  cancelBooking,
} from "../services/api";

const money = (v) => new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", minimumFractionDigits: 2 }).format(Number(v || 0));
const dateText = (v) => v ? new Date(v).toLocaleDateString("en-GB") : "Not available";

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [paymentsByBooking, setPaymentsByBooking] = useState({});
  const [methods, setMethods] = useState([]);
  const [forms, setForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [invoiceView, setInvoiceView] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [bookingData, methodData] = await Promise.all([getMyBookings(), getPaymentMethods()]);
      const ownBookings = Array.isArray(bookingData) ? bookingData : [];
      setBookings(ownBookings);
      setMethods(Array.isArray(methodData) ? methodData.filter(m => m.available_for_request) : []);
      const paymentEntries = await Promise.all(ownBookings.map(async (booking) => {
        try {
          const records = await getBookingPayments(booking.booking_id);
          return [booking.booking_id, Array.isArray(records) ? records : []];
        } catch {
          return [booking.booking_id, []];
        }
      }));
      setPaymentsByBooking(Object.fromEntries(paymentEntries));
    } catch (e) { setError(e.message || "Could not load bookings."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const setForm = (id, patch) => setForms(old => ({ ...old, [id]: { payment_method_id: "", amount: "", transaction_reference: "", ...(old[id] || {}), ...patch } }));

  async function submitPayment(booking) {
    const form = forms[booking.booking_id] || {};
    setError(""); setMessage("");
    if (!form.payment_method_id || !form.amount || !form.transaction_reference?.trim()) {
      setError("Choose a payment method and enter the amount and actual transaction/reference ID."); return;
    }
    setBusyId(booking.booking_id);
    try {
      const result = await createPaymentRequest({
        booking_id: booking.booking_id,
        payment_method_id: Number(form.payment_method_id),
        amount: form.amount,
        transaction_reference: form.transaction_reference.trim(),
      });
      setMessage(result.message || "Payment request submitted. It remains pending until staff verifies it.");
      setForm(booking.booking_id, { amount: "", transaction_reference: "" });
      await load();
    } catch (e) { setError(e.message || "Could not submit payment request."); }
    finally { setBusyId(null); }
  }

  async function handleCancelBooking(booking) {
    const currentStatus = String(booking.status_name || booking.status?.status_name || booking.status || "").toUpperCase();
    if (["CANCELLED", "CANCELED", "COMPLETED", "FINISHED"].includes(currentStatus)) return;
    const accepted = window.confirm(
      `Cancel booking ${booking.booking_reference}? This will not issue a refund automatically. Refund handling may be added separately later. Continue?`
    );
    if (!accepted) return;
    setError(""); setMessage(""); setBusyId(booking.booking_id);
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

  async function openInvoice(booking) {
    setError(""); setMessage("");
    try {
      const [invoice, payments] = await Promise.all([
        getInvoiceByBooking(booking.booking_id), getBookingPayments(booking.booking_id),
      ]);
      const paid = payments.filter(p => p.payment_status === "PAID").reduce((s, p) => s + Number(p.amount || 0), 0);
      const pending = payments.filter(p => p.payment_status === "PENDING");
      setInvoiceView({ booking, invoice, payments, paid, pending, balance: Math.max(0, Number(invoice.total_amount || 0) - paid) });
    } catch (e) { setError(e.message || "Invoice is not available yet. Submit a payment request to generate it."); }
  }

  function printInvoice() {
    if (!invoiceView) return;
    const { booking, invoice, payments, paid, pending, balance } = invoiceView;
    const esc = (s) => String(s ?? "—").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const rows = (payments || []).map(p => `<tr><td>${esc(p.transaction_reference)}</td><td>${esc(p.payment_method)}</td><td>${esc(p.payment_status)}</td><td>${money(p.amount)}</td></tr>`).join("");
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { setError("Your browser blocked the print window. Allow pop-ups and try again."); return; }
    w.document.write(`<!doctype html><html><head><title>${esc(invoice.invoice_number)}</title><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;margin:36px;color:#172033}h1{margin-bottom:4px}small{color:#64748b}.row{display:flex;justify-content:space-between;margin:24px 0}.box{background:#f1f5f9;padding:14px;margin:8px 0}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}.total{font-size:20px;font-weight:bold}@media print{button{display:none}}</style></head><body><h1>Travel Agency Invoice</h1><small>Invoice ${esc(invoice.invoice_number)}</small><div class="row"><div><b>Booking reference</b><br>${esc(booking.booking_reference)}<br><b>Package</b><br>${esc(booking.package_name || booking.package?.package_name)}</div><div><b>Invoice date</b><br>${esc(dateText(invoice.invoice_date))}<br><b>Travel date</b><br>${esc(dateText(booking.travel_date))}</div></div><div class="box">Invoice total: <b>${money(invoice.total_amount)}</b><br>Verified payments received: <b>${money(paid)}</b><br>Pending requests (not counted as paid): <b>${pending.length}</b><br><span class="total">Outstanding balance: ${money(balance)}</span></div><h2>Payment history</h2><table><thead><tr><th>Reference</th><th>Method</th><th>Status</th><th>Amount</th></tr></thead><tbody>${rows || "<tr><td colspan='4'>No payment requests yet</td></tr>"}</tbody></table><p><small>Only payments marked PAID by staff count as received. Pending requests are not receipts.</small></p><button onclick="window.print()">Print / Save as PDF</button></body></html>`);
    w.document.close(); w.focus();
  }

  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold text-slate-900">My Bookings</h1><p className="mt-2 text-slate-600">Manage your bookings, submit payment requests, and print invoices.</p></div><Link to="/packages" className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white">Browse packages</Link></div>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
    {message && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">{message}</div>}
    {loading ? <p>Loading bookings...</p> : bookings.length === 0 ? <div className="rounded-xl border p-8 text-center">No bookings yet. <Link to="/packages" className="text-teal-700 underline">Explore tours</Link></div> : <div className="space-y-5">{bookings.map(b => {
      const form = forms[b.booking_id] || {};
      const paymentRecords = paymentsByBooking[b.booking_id] || [];
      const paidAmount = paymentRecords.filter(p => p.payment_status === "PAID").reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const pendingRecords = paymentRecords.filter(p => p.payment_status === "PENDING");
      const outstanding = Math.max(0, Number(b.total_amount || 0) - paidAmount);
      const paymentSummary = outstanding <= 0 ? "PAID" : paidAmount > 0 ? "PARTIALLY PAID" : pendingRecords.length ? "PAYMENT PENDING" : "UNPAID";
      const bookingStatus = String(b.status_name || b.status?.status_name || b.status || "Unknown").toUpperCase();
      const canCancel = !["CANCELLED", "CANCELED", "COMPLETED", "FINISHED"].includes(bookingStatus);
      return <article key={b.booking_id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{b.package_name || b.package?.package_name || `Package #${b.package_id}`}</h2><p className="mt-1 text-sm text-slate-600">Reference: {b.booking_reference}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{b.status_name || b.status?.status_name || b.status || "Unknown"}</span></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-slate-50 p-3"><p className="text-sm text-slate-500">Travel date</p><p className="font-medium">{dateText(b.travel_date || b.departure_datetime)}</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-sm text-slate-500">Travelers</p><p className="font-medium">{b.number_of_travelers ?? "—"}</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-sm text-slate-500">Booking total</p><p className="font-bold text-teal-800">{money(b.total_amount)}</p></div></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3"><div className="rounded-lg border border-slate-200 p-3"><p className="text-sm text-slate-500">Payment status</p><p className="font-semibold">{paymentSummary}</p></div><div className="rounded-lg border border-slate-200 p-3"><p className="text-sm text-slate-500">Verified paid</p><p className="font-semibold text-emerald-700">{money(paidAmount)}</p></div><div className="rounded-lg border border-slate-200 p-3"><p className="text-sm text-slate-500">Outstanding balance</p><p className="font-semibold text-red-700">{money(outstanding)}</p></div></div>
        {paymentRecords.length > 0 && <div className="mt-3 rounded-lg bg-slate-50 p-3"><p className="text-sm font-semibold">Payment requests / history</p><div className="mt-2 space-y-2">{paymentRecords.map(p => <div key={p.payment_id} className="flex flex-wrap justify-between gap-2 text-sm"><span>{p.payment_method || "Payment"} · {p.transaction_reference}</span><span className={p.payment_status === "PAID" ? "font-semibold text-emerald-700" : p.payment_status === "PENDING" ? "font-semibold text-amber-700" : "text-slate-600"}>{p.payment_status} — {money(p.amount)}</span></div>)}</div></div>}
        <div className="mt-5 border-t pt-5">
          {outstanding > 0 && !["CANCELLED", "CANCELED", "COMPLETED", "FINISHED"].includes(bookingStatus) ? <>
            <h3 className="font-semibold">Submit a payment request</h3><p className="mt-1 text-sm text-slate-600">First payment must be at least 50% of the invoice total. A request does not count as paid until staff verifies it. Submit your real transfer/receipt reference.</p>
            {pendingRecords.length > 0 && <p className="mt-2 text-sm font-medium text-amber-700">A payment request is awaiting verification. Please wait for staff to verify or reject it before submitting another.</p>}
            <div className="mt-3 grid gap-3 md:grid-cols-4"><select disabled={pendingRecords.length > 0} value={form.payment_method_id || ""} onChange={e => setForm(b.booking_id, { payment_method_id: e.target.value })} className="rounded-lg border px-3 py-2 disabled:bg-slate-100"><option value="">Payment method</option>{methods.map(m => <option key={m.payment_method_id} value={m.payment_method_id}>{m.method_name}</option>)}</select><input disabled={pendingRecords.length > 0} type="number" min="0.01" max={outstanding} step="0.01" value={form.amount || ""} onChange={e => setForm(b.booking_id, { amount: e.target.value })} placeholder={`Amount (max ${money(outstanding)})`} className="rounded-lg border px-3 py-2 disabled:bg-slate-100"/><input disabled={pendingRecords.length > 0} value={form.transaction_reference || ""} onChange={e => setForm(b.booking_id, { transaction_reference: e.target.value })} placeholder="Actual transaction / receipt ID" className="rounded-lg border px-3 py-2 disabled:bg-slate-100"/><button disabled={busyId === b.booking_id || pendingRecords.length > 0} onClick={() => submitPayment(b)} className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{pendingRecords.length > 0 ? "Request pending" : busyId === b.booking_id ? "Submitting..." : "Submit request"}</button></div>
          </> : <p className="text-sm font-semibold text-emerald-700">{outstanding <= 0 ? "Payment complete. No outstanding balance remains." : "Payment requests are unavailable for this booking status."}</p>}
          <div className="mt-4 flex flex-wrap gap-3"><button onClick={() => openInvoice(b)} className="rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50">View / print invoice</button>{canCancel && <button disabled={busyId === b.booking_id} onClick={() => handleCancelBooking(b)} className="rounded-lg border border-red-200 px-4 py-2 font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">{busyId === b.booking_id ? "Processing..." : "Cancel booking"}</button>}</div>
        </div>
      </article>;
    })}</div>}
    {invoiceView && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4"><section className="mx-auto mt-8 max-w-3xl rounded-xl bg-white p-6 shadow-xl"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-bold">Invoice {invoiceView.invoice.invoice_number}</h2><p className="text-sm text-slate-500">Booking {invoiceView.booking.booking_reference}</p></div><button onClick={() => setInvoiceView(null)} className="rounded border px-3 py-2">Close</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded bg-slate-50 p-4">Invoice total <p className="text-xl font-bold">{money(invoiceView.invoice.total_amount)}</p></div><div className="rounded bg-emerald-50 p-4">Verified paid <p className="text-xl font-bold">{money(invoiceView.paid)}</p></div><div className="rounded bg-amber-50 p-4">Pending requests <p className="text-xl font-bold">{invoiceView.pending.length}</p></div><div className="rounded bg-red-50 p-4">Balance <p className="text-xl font-bold">{money(invoiceView.balance)}</p></div></div><p className="mt-4 text-sm text-slate-500">Pending payments are excluded from the verified paid total.</p><button onClick={printInvoice} className="mt-5 rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white">Print / Save as PDF</button></section></div>}
  </main>;
}
export default MyBookings;

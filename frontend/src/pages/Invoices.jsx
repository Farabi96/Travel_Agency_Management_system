
import { useEffect, useState } from "react";
import {
  createInvoice,
  getInvoice,
  getInvoices,
} from "../services/api";

function formatMoney(value) {
  const amount = Number(value);

  return Number.isFinite(amount)
    ? `৳${amount.toLocaleString("en-BD", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : "—";
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-GB");
}

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  async function loadInvoices() {
    setLoading(true);
    setError("");

    try {
      const response = await getInvoices();

      if (!Array.isArray(response)) {
        throw new Error("The server returned an unexpected invoice list.");
      }

      setInvoices(response);
    } catch (err) {
      setError(err?.message || "Could not load invoices.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvoices();
  }, []);

  async function handleCreateInvoice(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSelectedInvoice(null);

    const parsedBookingId = Number(bookingId);

    if (
      !Number.isSafeInteger(parsedBookingId) ||
      parsedBookingId <= 0
    ) {
      setError("Enter a valid positive booking ID.");
      return;
    }

    setCreating(true);

    try {
      const response = await createInvoice({
        booking_id: parsedBookingId,
      });

      setMessage(
        `Invoice ${response.invoice_number} created successfully.`
      );
      setBookingId("");
      await loadInvoices();
    } catch (err) {
      setError(err?.message || "Could not create the invoice.");
    } finally {
      setCreating(false);
    }
  }

  async function handleViewInvoice(invoiceId) {
    setError("");
    setMessage("");
    setSelectedInvoice(null);
    setDetailsLoading(true);

    try {
      const invoice = await getInvoice(invoiceId);
      setSelectedInvoice(invoice);
    } catch (err) {
      setError(err?.message || "Could not load invoice details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">
          Invoice Management
        </h1>
        <p className="mt-2 text-slate-600">
          View invoices and create invoices for existing bookings.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Create an Invoice
        </h2>

        <form
          onSubmit={handleCreateInvoice}
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="number"
            min="1"
            step="1"
            required
            value={bookingId}
            onChange={(event) => setBookingId(event.target.value)}
            placeholder="Enter booking ID"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-teal-600 sm:max-w-xs"
          />

          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-teal-700 px-5 py-2 font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create Invoice"}
          </button>
        </form>

        <p className="mt-3 text-sm text-slate-500">
          The booking must exist and must not already have an invoice.
          Invoice totals are calculated by the server.
        </p>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800"
        >
          {message}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-slate-900">
            All Invoices
          </h2>

          <button
            type="button"
            onClick={loadInvoices}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="p-5 text-slate-600">Loading invoices...</p>
        ) : invoices.length === 0 ? (
          <p className="p-5 text-slate-600">No invoices found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="whitespace-nowrap p-4">Invoice Number</th>
                  <th className="whitespace-nowrap p-4">Booking ID</th>
                  <th className="whitespace-nowrap p-4">Invoice Date</th>
                  <th className="whitespace-nowrap p-4">Total</th>
                  <th className="whitespace-nowrap p-4">Status</th>
                  <th className="whitespace-nowrap p-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.invoice_id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap p-4 font-medium text-slate-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="p-4">{invoice.booking_id}</td>
                    <td className="whitespace-nowrap p-4">
                      {formatDate(invoice.invoice_date)}
                    </td>
                    <td className="whitespace-nowrap p-4">
                      {formatMoney(invoice.total_amount)}
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">
                        {invoice.invoice_status}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() =>
                          handleViewInvoice(invoice.invoice_id)
                        }
                        className="whitespace-nowrap font-medium text-teal-700 hover:underline"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detailsLoading && (
        <p className="text-slate-600">Loading invoice details...</p>
      )}

      {selectedInvoice && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {selectedInvoice.invoice_number}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Booking ID: {selectedInvoice.booking_id}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedInvoice(null)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              Close Details
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Subtotal</p>
              <p className="mt-1 font-semibold">
                {formatMoney(selectedInvoice.subtotal)}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Discount</p>
              <p className="mt-1 font-semibold">
                {formatMoney(selectedInvoice.discount_amount)}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Tax</p>
              <p className="mt-1 font-semibold">
                {formatMoney(selectedInvoice.tax_amount)}
              </p>
            </div>

            <div className="rounded-lg bg-teal-50 p-4">
              <p className="text-sm text-teal-800">Total Amount</p>
              <p className="mt-1 font-bold text-teal-900">
                {formatMoney(selectedInvoice.total_amount)}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <p>
              Invoice date: {formatDate(selectedInvoice.invoice_date)}
            </p>
            <p>
              Due date: {formatDate(selectedInvoice.due_date)}
            </p>
            <p>Status: {selectedInvoice.invoice_status}</p>
            <p>Generated by user ID: {selectedInvoice.generated_by ?? "—"}</p>
          </div>

          <h3 className="mt-6 font-semibold text-slate-900">
            Invoice Items
          </h3>

          {!selectedInvoice.items?.length ? (
            <p className="mt-2 text-sm text-slate-500">
              No line items were recorded for this invoice.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3">Description</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Unit Price</th>
                    <th className="p-3">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item) => (
                    <tr
                      key={item.invoice_item_id}
                      className="border-t border-slate-100"
                    >
                      <td className="p-3">{item.description}</td>
                      <td className="p-3">{item.quantity}</td>
                      <td className="p-3">{formatMoney(item.unit_price)}</td>
                      <td className="p-3">{formatMoney(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default Invoices;

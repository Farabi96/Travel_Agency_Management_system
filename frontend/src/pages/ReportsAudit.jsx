import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, CalendarRange, Download, FileText, ShieldCheck } from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:5000/api";

export default function ReportsAudit() {
  const token = sessionStorage.getItem("access_token");
  let user = null;

  try {
    user = JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user");
  }

  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2026-12-31");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role_name !== "HIGHER_ADMIN") return <Navigate to="/dashboard" replace />;

  async function downloadReport(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!startDate || !endDate) {
      setError("Select both a start date and an end date.");
      return;
    }
    if (startDate > endDate) {
      setError("Start date cannot be after end date.");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });
      const response = await fetch(
        `${API_BASE_URL}/admin/reports/financial.pdf?${params.toString()}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        let message = "The report could not be generated.";
        try {
          const data = await response.json();
          message = data.error || message;
        } catch {
          // Keep the generic message if the server did not return JSON.
        }
        if (response.status === 401) {
          message = "Your session may have expired. Please sign in again.";
        } else if (response.status === 403) {
          message = "Only a Higher Administrator can generate this report.";
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      if (blob.type !== "application/pdf") {
        throw new Error("The server response was not a PDF file.");
      }

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `financial_audit_${startDate}_to_${endDate}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(`PDF report downloaded for ${startDate} to ${endDate}.`);
    } catch (downloadError) {
      setError(downloadError.message || "The report could not be generated.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-teal-700"
        >
          <ArrowLeft size={16} /> Back to dashboard
        </Link>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-slate-900 px-6 py-7 text-white sm:px-8">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-white/10 p-3">
                <FileText size={26} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">
                  Administration
                </p>
                <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                  Reports &amp; Audit
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Generate a historical financial report with paid transactions,
                  completed refunds, net revenue, and transaction-level details.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr]">
            <form onSubmit={downloadReport} className="space-y-5">
              <div>
                <label htmlFor="start-date" className="mb-2 block text-sm font-semibold text-slate-700">
                  Start date
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div>
                <label htmlFor="end-date" className="mb-2 block text-sm font-semibold text-slate-700">
                  End date
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => setEndDate(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {error}
                </div>
              )}
              {success && (
                <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3.5 font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Generating PDF…
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Generate &amp; download PDF
                  </>
                )}
              </button>
            </form>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-5">
                <div className="flex items-center gap-3">
                  <CalendarRange className="text-teal-800" size={22} />
                  <h2 className="font-bold text-slate-900">Selected reporting period</h2>
                </div>
                <p className="mt-4 text-lg font-extrabold text-teal-900">
                  {startDate || "Start date"} → {endDate || "End date"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Both dates are inclusive. This supports the requested historical
                  audit period from 1 January 2024 through 31 December 2026.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={21} className="text-slate-600" />
                  <h2 className="font-bold text-slate-900">What the PDF includes</h2>
                </div>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
                  <li>• Paid revenue from PAID payments by payment date</li>
                  <li>• Completed refunds by processed date</li>
                  <li>• Net revenue and booking count</li>
                  <li>• Payment and refund transaction details, statuses, references, bookings, and customer names</li>
                </ul>
                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Pending and failed records appear in transaction details where available,
                  but they do not reduce net revenue.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

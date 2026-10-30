import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Activity, ArrowLeft, RefreshCw, Search } from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:5000/api";
const todayISO = () => new Date().toISOString().slice(0, 10);

function prettyJson(value) {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

export default function ActivityLogs() {
  const token = sessionStorage.getItem("access_token");
  let user = null;
  try { user = JSON.parse(sessionStorage.getItem("user") || "null"); }
  catch {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user");
  }
  const [staffId, setStaffId] = useState("");
  const [action, setAction] = useState("");
  const [tableName, setTableName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ logs: [], pagination: { page: 1, per_page: 25, total: 0, total_pages: 0 } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async (requestedPage = page) => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(requestedPage), per_page: "25" });
      if (staffId.trim()) params.set("staff_id", staffId.trim());
      if (action.trim()) params.set("action", action.trim());
      if (tableName.trim()) params.set("table_name", tableName.trim());
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      const response = await fetch(`${API_BASE_URL}/admin/activity-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Could not load activity logs (${response.status}).`);
      setResult(data);
      setPage(requestedPage);
    } catch (err) {
      setError(err.message || "Could not load activity logs.");
    } finally { setLoading(false); }
  }, [token, page, staffId, action, tableName, startDate, endDate]);

  useEffect(() => { loadLogs(1); }, []); // Load initial page only; filters are submitted explicitly.

  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role_name !== "HIGHER_ADMIN") return <Navigate to="/dashboard" replace />;

  function submitFilters(event) {
    event.preventDefault();
    if (startDate && endDate && startDate > endDate) {
      setError("Start date cannot be after end date.");
      return;
    }
    loadLogs(1);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link to="/admin/utilities" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-teal-700"><ArrowLeft size={16} /> Back to Utilities</Link>
        <header className="mb-6 rounded-3xl bg-slate-900 px-6 py-7 text-white sm:px-8">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/10 p-3"><Activity size={26} /></div>
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">Utilities</p><h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Activity Logs</h1><p className="mt-2 text-sm leading-6 text-slate-300">Review recorded actions by user, module, action type, and date.</p></div>
          </div>
        </header>

        <form onSubmit={submitFilters} className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="text-sm font-semibold text-slate-700">Staff user ID<input value={staffId} onChange={e => setStaffId(e.target.value)} inputMode="numeric" placeholder="e.g. 12" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-600" /></label>
          <label className="text-sm font-semibold text-slate-700">Action<input value={action} onChange={e => setAction(e.target.value)} placeholder="e.g. REFUND_STATUS_CHANGED" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-600" /></label>
          <label className="text-sm font-semibold text-slate-700">Module / table<input value={tableName} onChange={e => setTableName(e.target.value)} placeholder="e.g. refunds" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-600" /></label>
          <label className="text-sm font-semibold text-slate-700">From date<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} max={endDate || undefined} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-600" /></label>
          <label className="text-sm font-semibold text-slate-700">To date<input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || undefined} max={todayISO()} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-600" /></label>
          <div className="flex items-end"><button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60"><Search size={16} /> Filter</button></div>
        </form>

        {error && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h2 className="font-bold text-slate-900">Recorded activity</h2><p className="mt-1 text-sm text-slate-500">{result.pagination?.total ?? 0} records found</p></div><button onClick={() => loadLogs(page)} type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh</button></div>
          {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading activity logs…</div> : result.logs.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No activity records match these filters. New actions will appear after the relevant backend routes are instrumented.</div> : (
            <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date & time</th><th className="px-4 py-3">Staff / user</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">Record ID</th><th className="px-4 py-3">Details</th><th className="px-4 py-3">IP address</th></tr></thead><tbody className="divide-y divide-slate-100">{result.logs.map(log => <tr key={log.log_id} className="align-top hover:bg-slate-50/70"><td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.created_at ? new Date(log.created_at).toLocaleString() : "—"}</td><td className="px-4 py-3"><div className="font-semibold text-slate-900">{log.username || "Unknown user"}</div><div className="text-xs text-slate-500">ID: {log.user_id ?? "—"}{log.role_name ? ` · ${log.role_name}` : ""}</div></td><td className="px-4 py-3"><span className="rounded-lg bg-teal-50 px-2 py-1 text-xs font-bold text-teal-800">{log.action}</span></td><td className="px-4 py-3 text-slate-700">{log.table_name}</td><td className="px-4 py-3 text-slate-700">{log.record_id ?? "—"}</td><td className="min-w-64 max-w-md px-4 py-3"><details><summary className="cursor-pointer font-semibold text-teal-800">View changes</summary><div className="mt-2 space-y-2"><div><p className="text-xs font-bold uppercase text-slate-500">Before</p><pre className="mt-1 overflow-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-700">{prettyJson(log.old_values)}</pre></div><div><p className="text-xs font-bold uppercase text-slate-500">After</p><pre className="mt-1 overflow-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-700">{prettyJson(log.new_values)}</pre></div></div></details></td><td className="px-4 py-3 text-slate-500">{log.ip_address || "—"}</td></tr>)}</tbody></table></div>
          )}
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4"><span className="text-xs text-slate-500">Page {result.pagination?.page || 1} of {result.pagination?.total_pages || 1}</span><div className="flex gap-2"><button type="button" disabled={loading || page <= 1} onClick={() => loadLogs(page - 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-40">Previous</button><button type="button" disabled={loading || page >= (result.pagination?.total_pages || 1)} onClick={() => loadLogs(page + 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-40">Next</button></div></div>
        </section>
        <p className="mt-4 text-xs leading-5 text-slate-500">Activity Logs show only actions that the backend actually records. They cannot reconstruct historical actions that were never logged.</p>
      </div>
    </main>
  );
}

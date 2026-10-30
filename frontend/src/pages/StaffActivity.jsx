import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Activity, Search, RefreshCw, Users, UserCheck, UserX, Eye } from "lucide-react";

const API = "http://127.0.0.1:5000/api";
const dateText = (value) => value ? new Date(value).toLocaleString() : "No recorded activity";

export default function StaffActivity() {
  const token = sessionStorage.getItem("access_token");
  let user = null;
  try { user = JSON.parse(sessionStorage.getItem("user") || "null"); } catch { user = null; }
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ staff: [], pagination: { page: 1, per_page: 10, total: 0, total_pages: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (nextPage = page) => {
    if (!token) return;
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(nextPage), per_page: "10" });
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      const res = await fetch(`${API}/admin/staff-activity?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Could not load staff (${res.status}).`);
      setData(body); setPage(nextPage);
    } catch (e) { setError(e.message || "Could not load staff list."); }
    finally { setLoading(false); }
  }, [token, page, search, status]);

  useEffect(() => { load(1); }, []);
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role_name !== "HIGHER_ADMIN") return <Navigate to="/dashboard" replace />;

  const staff = data.staff || [];
  const total = data.pagination?.total || 0;
  const active = staff.filter(s => String(s.account_status).toUpperCase() === "ACTIVE").length;
  const suspended = staff.filter(s => String(s.account_status).toUpperCase() !== "ACTIVE").length;

  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8"><div className="mx-auto max-w-7xl">
    <header className="mb-6 rounded-3xl bg-slate-900 px-6 py-7 text-white sm:px-8"><div className="flex items-center gap-4"><div className="rounded-2xl bg-white/10 p-3"><Activity size={26}/></div><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">Administration</p><h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Staff Activity</h1><p className="mt-2 text-sm text-slate-300">Choose a staff member to review their recorded work history.</p></div></div></header>
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      <Stat icon={<Users size={20}/>} label="Total staff" value={total}/><Stat icon={<UserCheck size={20}/>} label="Active on this page" value={active}/><Stat icon={<UserX size={20}/>} label="Non-active on this page" value={suspended}/>
    </div>
    <form onSubmit={e => { e.preventDefault(); load(1); }} className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_220px_auto_auto]">
      <label className="text-sm font-medium text-slate-700">Search staff<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name or email" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600"/></label>
      <label className="text-sm font-medium text-slate-700">Account status<select value={status} onChange={e=>setStatus(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="INACTIVE">Inactive</option></select></label>
      <button className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 font-semibold text-white hover:bg-teal-800"><Search size={16}/> Search</button>
      <button type="button" onClick={()=>{setSearch("");setStatus("");setTimeout(()=>load(1),0)}} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-slate-700"><RefreshCw size={16}/> Reset</button>
    </form>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-bold text-slate-900">Staff members</h2><p className="text-sm text-slate-500">{total} staff account(s)</p></div><button onClick={()=>load(page)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"><RefreshCw size={15}/> Refresh</button></div>
      {error && <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading ? <p className="p-10 text-center text-slate-500">Loading staff…</p> : staff.length === 0 ? <p className="p-10 text-center text-slate-500">No staff members found.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3">Staff member</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Recorded actions</th><th className="px-5 py-3">Last recorded activity</th><th className="px-5 py-3 text-right">Details</th></tr></thead><tbody className="divide-y divide-slate-100">{staff.map(s=><tr key={s.user_id} className="hover:bg-slate-50"><td className="px-5 py-4"><div className="font-semibold text-slate-900">{s.username}</div><div className="text-xs text-slate-500">ID: {s.user_id} · {s.email}</div></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${String(s.account_status).toUpperCase()==="ACTIVE"?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-600"}`}>{s.account_status || "Unknown"}</span></td><td className="px-5 py-4 font-semibold">{s.activity_count || 0}</td><td className="px-5 py-4 text-slate-600">{dateText(s.last_activity_at)}</td><td className="px-5 py-4 text-right"><Link to={`/admin/staff-activity/${s.user_id}`} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2 font-semibold text-white hover:bg-teal-800"><Eye size={15}/> View details</Link></td></tr>)}</tbody></table></div>}
      <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm text-slate-500"><span>Page {data.pagination?.page || 1} of {Math.max(data.pagination?.total_pages || 0,1)}</span><div className="flex gap-2"><button disabled={page<=1||loading} onClick={()=>load(page-1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button><button disabled={page >= (data.pagination?.total_pages||1)||loading} onClick={()=>load(page+1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button></div></div>
    </section><p className="mt-4 text-xs text-slate-500">Only actions recorded by the backend appear here. Actions that were not logged cannot be reconstructed retroactively.</p>
  </div></main>;
}
function Stat({icon,label,value}) { return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="rounded-xl bg-teal-50 p-3 text-teal-700">{icon}</div><div><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-bold text-slate-900">{value}</p></div></div>; }

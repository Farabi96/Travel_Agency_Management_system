import { Link, Navigate } from "react-router-dom";
import { Activity, ArrowUpRight, FileText, Users, ReceiptText, ShieldCheck } from "lucide-react";

const utilityCards = [
  {
    title: "Reports & Audit",
    description: "Generate a date-range financial PDF with paid payments, completed refunds, net revenue, and transaction details.",
    icon: FileText,
    to: "/admin/reports",
    action: "Open report generator",
  },
  {
    title: "Activity Logs",
    description: "Review recorded administrative actions, who performed them, when they happened, and which record was affected.",
    icon: Activity,
    to: "/admin/activity-logs",
    action: "View activity history",
  },
  {
    title: "Users & Staff",
    description: "Manage staff and administrative accounts in the existing user-management section. This is a shortcut, not a duplicate feature.",
    icon: Users,
    to: "/admin/users",
    action: "Manage users and staff",
  },
  {
    title: "Invoices & Documents",
    description: "Open existing invoice records and customer documents.",
    icon: ReceiptText,
    to: "/invoices",
    action: "Open invoices",
  },
];

export default function Utilities() {
  const token = sessionStorage.getItem("access_token");
  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user");
  }

  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role_name !== "HIGHER_ADMIN") return <Navigate to="/dashboard" replace />;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-teal-700">
          ← Back to dashboard
        </Link>
        <header className="mb-8 rounded-3xl bg-slate-900 px-6 py-8 text-white sm:px-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3"><ShieldCheck size={28} /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">Administration</p>
              <h1 className="mt-2 text-3xl font-extrabold">Utilities</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Useful administrative tools in one place. Staff management remains in the existing Users & Staff page.</p>
            </div>
          </div>
        </header>

        <section className="grid gap-5 sm:grid-cols-2">
          {utilityCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.to} to={card.to} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <span className="rounded-xl bg-teal-50 p-3 text-teal-800"><Icon size={23} /></span>
                  <ArrowUpRight size={19} className="text-slate-400 transition group-hover:text-teal-700" />
                </div>
                <h2 className="mt-5 text-lg font-bold text-slate-900">{card.title}</h2>
                <p className="mt-2 min-h-[72px] text-sm leading-6 text-slate-600">{card.description}</p>
                <span className="mt-4 inline-flex text-sm font-bold text-teal-800">{card.action} →</span>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}

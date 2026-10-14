 
import { useCallback, useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Users,
  UserRound,
  ShieldCheck,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const API = "http://127.0.0.1:5000/api";
const PAGE_SIZE = 20;

const TABS = [
  { id: "overview", label: "Overview", icon: Users },
  { id: "customers", label: "Customers", icon: UserRound },
  { id: "staff", label: "Staff", icon: BriefcaseBusiness },
  { id: "admins", label: "Higher Admins", icon: ShieldCheck },
];

function StatusBadge({ status }) {
  const active = status === "ACTIVE";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        active
          ? "bg-green-50 text-green-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {status || "UNKNOWN"}
    </span>
  );
}

function EmptyState({ children }) {
  return (
    <p className="py-12 text-center text-slate-500">{children}</p>
  );
}

function UsersTable({ users }) {
  if (!users.length) {
    return <EmptyState>No matching accounts found.</EmptyState>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[750px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <th className="px-4 py-3 font-semibold">User ID</th>
            <th className="px-4 py-3 font-semibold">Username</th>
            <th className="px-4 py-3 font-semibold">Email</th>
            <th className="px-4 py-3 font-semibold">Role</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Registered</th>
          </tr>
        </thead>
        <tbody>
          {users.map((account) => (
            <tr
              key={account.user_id}
              className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
            >
              <td className="px-4 py-4 text-slate-600">
                {account.user_id}
              </td>
              <td className="px-4 py-4 font-semibold text-slate-900">
                {account.username}
              </td>
              <td className="px-4 py-4 text-slate-600">
                {account.email}
              </td>
              <td className="px-4 py-4">
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                  {account.role_name}
                </span>
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={account.account_status} />
              </td>
              <td className="px-4 py-4 text-slate-600">
                {account.created_at
                  ? new Date(account.created_at).toLocaleDateString()
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
 

function StaffTable({ staff, onStatusChange, updatingUserId }) {
  if (!staff.length) {
    return (
      <p className="py-12 text-center text-slate-500">
        No staff records found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <th className="px-4 py-3">Staff ID</th>
            <th className="px-4 py-3">Employee Code</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Designation</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>

        <tbody>
          {staff.map((employee) => {
            const terminated =
              employee.employment_status === "TERMINATED";

            return (
              <tr
                key={employee.staff_id}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="px-4 py-4">{employee.staff_id}</td>
                <td className="px-4 py-4">
                  {employee.employee_code}
                </td>
                <td className="px-4 py-4 font-semibold">
                  {[employee.first_name, employee.last_name]
                    .filter(Boolean)
                    .join(" ")}
                </td>
                <td className="px-4 py-4">
                  {employee.department}
                </td>
                <td className="px-4 py-4">
                  {employee.designation}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      terminated
                        ? "bg-red-50 text-red-700"
                        : "bg-green-50 text-green-700"
                    }`}
                  >
                    {employee.employment_status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => onStatusChange(employee)}
                    disabled={updatingUserId === employee.user_id}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 ${
                      terminated
                        ? "bg-green-700 hover:bg-green-800"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {updatingUserId === employee.user_id
                      ? "Updating..."
                      : terminated
                        ? "Reactivate"
                        : "Terminate & Block"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}



export default function UsersManagement() {
  const token = sessionStorage.getItem("access_token");
  const savedUser = sessionStorage.getItem("user");
  const [updatingUserId, setUpdatingUserId] = useState(null);

 const [user] = useState(() => {
  try {
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    return null;
  }
});



async function updateStaffStatus(employee) {
  const isTerminated =
    employee.employment_status === "TERMINATED";

  const newStatus = isTerminated ? "ACTIVE" : "SUSPENDED";

  const action = isTerminated ? "reactivate" : "terminate and block";

  const confirmed = window.confirm(
    `Are you sure you want to ${action} ${employee.first_name}'s account?`
  );

  if (!confirmed) return;

  setUpdatingUserId(employee.user_id);
  setError("");

  try {
    const response = await fetch(
      `${API}/admin/users/${employee.user_id}/status`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_status: newStatus,
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || data.msg || "Unable to update staff status."
      );
    }

    setStaff((currentStaff) =>
      currentStaff.map((item) =>
        item.user_id === employee.user_id
          ? {
              ...item,
              employment_status:
                newStatus === "SUSPENDED"
                  ? "TERMINATED"
                  : "ACTIVE",
            }
          : item
      )
    );
  } catch (err) {
    setError(err.message || "Unable to update staff status.");
  } finally {
    setUpdatingUserId(null);
  }
}





  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [staff, setStaff] = useState([]);
  const [staffLoaded, setStaffLoaded] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

 

  const loadUsers = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const role =
        activeTab === "customers"
          ? "CUSTOMER"
          : activeTab === "admins"
            ? "HIGHER_ADMIN"
            : "";

      const params = new URLSearchParams({
        page: String(page),
        per_page: String(PAGE_SIZE),
        search: search.trim(),
      });

      if (role) params.set("role", role);

      const response = await fetch(
        `${API}/admin/users?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Your session is invalid or expired. Log out and log in again."
          );
        }

        if (response.status === 403) {
          throw new Error(
            "Your account is not authorized to manage users."
          );
        }

        throw new Error(
          data.msg || data.error || "Unable to load user accounts."
        );
      }

      // Supports the paginated API response and the older array response.
      const rows = Array.isArray(data) ? data : data.users;

      if (!Array.isArray(rows)) {
        throw new Error("The user API returned an unexpected response.");
      }

      setUsers(rows);
      setTotalUsers(
        Array.isArray(data) ? rows.length : data.pagination?.total ?? rows.length
      );
      setTotalPages(
        Array.isArray(data)
          ? 1
          : Math.max(1, data.pagination?.total_pages ?? 1)
      );
    } catch (err) {
      setUsers([]);
      setTotalUsers(0);
      setTotalPages(1);
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [token, activeTab, page, search]);

  const loadStaff = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/staff/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Your session is invalid or expired. Log out and log in again."
          );
        }
        if (response.status === 403) {
          throw new Error("You are not authorized to view staff records.");
        }
        throw new Error(data.msg || data.error || "Unable to load staff.");
      }

      const rows = Array.isArray(data) ? data : data.staff;

      if (!Array.isArray(rows)) {
        throw new Error("The staff API returned an unexpected response.");
      }

      setStaff(rows);
      setStaffLoaded(true);
    } catch (err) {
      setError(err.message || "Unable to load staff records.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user?.role_name !== "HIGHER_ADMIN") return;

    if (activeTab === "staff") {
      loadStaff();
    } else if (
      activeTab === "customers" ||
      activeTab === "admins"
    ) {
      loadUsers();
    }
  }, [user, activeTab, loadUsers, loadStaff]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search]);

  function selectTab(tab) {
    setSearch("");
    setPage(1);
    setError("");
    setActiveTab(tab);
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role_name !== "HIGHER_ADMIN") {
    return (
      <main className="p-8 text-center text-red-700">
        You are not authorized to access user management.
      </main>
    );
  }

  const filteredStaff = staff.filter((employee) => {
    const query = search.toLowerCase();

    return [
      employee.staff_id,
      employee.employee_code,
      employee.first_name,
      employee.last_name,
      employee.department,
      employee.designation,
      employee.employment_status,
    ].some((value) =>
      String(value ?? "").toLowerCase().includes(query)
    );
  });

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-teal-700"
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </Link>

        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-teal-100 p-3 text-teal-700">
                <Users size={25} />
              </span>
              <h1 className="text-3xl font-bold text-slate-900">
                Users & Staff Management
              </h1>
            </div>
            <p className="mt-3 text-slate-600">
              Manage customer accounts, staff profiles, and higher administrators.
            </p>
          </div>

          {activeTab !== "overview" && (
            <button
              onClick={() =>
                activeTab === "staff" ? loadStaff() : loadUsers()
              }
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw size={17} />
              Refresh
            </button>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => selectTab(id)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                activeTab === id
                  ? "bg-teal-700 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-teal-50 hover:text-teal-800"
              }`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {activeTab === "overview" && (
          <section className="mt-6">
            <h2 className="text-xl font-bold text-slate-900">
              Management Overview
            </h2>
            <p className="mt-1 text-slate-600">
              Choose a section for quick access to its records.
            </p>

            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <button
                onClick={() => selectTab("customers")}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-md"
              >
                <UserRound className="text-teal-700" size={28} />
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  Customers
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Search and browse registered customer accounts.
                </p>
                <p className="mt-4 text-sm font-semibold text-teal-700">
                  Open customer table →
                </p>
              </button>

              <button
                onClick={() => selectTab("staff")}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-md"
              >
                <BriefcaseBusiness className="text-teal-700" size={28} />
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  Staff
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  View employee codes, departments, and designations.
                </p>
                <p className="mt-4 text-sm font-semibold text-teal-700">
                  Open staff table →
                </p>
              </button>

              <button
                onClick={() => selectTab("admins")}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-md"
              >
                <ShieldCheck className="text-teal-700" size={28} />
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  Higher Admins
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Quickly access higher administrator accounts.
                </p>
                <p className="mt-4 text-sm font-semibold text-teal-700">
                  Open admin table →
                </p>
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900">Quick access</h3>
              <p className="mt-2 text-sm text-slate-600">
                Staff and higher administrator records are separated from the
                customer directory so you can access them without searching
                through customer accounts.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => selectTab("staff")}
                  className="rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800"
                >
                  View Staff
                </button>
                <button
                  onClick={() => selectTab("admins")}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  View Higher Admins
                </button>
              </div>
            </div>
          </section>
        )}

        {(activeTab === "customers" || activeTab === "admins") && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {activeTab === "customers"
                    ? "Customer Accounts"
                    : "Higher Administrator Accounts"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {totalUsers} account(s) found · Page {page} of {totalPages}
                </p>
              </div>

              <div className="relative w-full sm:max-w-sm">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search username or email..."
                  className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>

            {loading ? (
              <EmptyState>Loading accounts...</EmptyState>
            ) : !error ? (
              <div className="mt-6">
                <UsersTable users={users} />

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <p className="text-sm text-slate-500">
                    Showing up to {PAGE_SIZE} accounts per page
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page <= 1 || loading}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setPage((current) => Math.min(totalPages, current + 1))
                      }
                      disabled={page >= totalPages || loading}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        )}

        {activeTab === "staff" && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Staff Directory
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredStaff.length} staff record(s)
                  {staffLoaded ? "" : " · Not loaded yet"}
                </p>
              </div>

              <div className="relative w-full sm:max-w-sm">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search staff or department..."
                  className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>

            {loading ? (
              <EmptyState>Loading staff records...</EmptyState>
            ) : !error ? (
              <div className="mt-6">
            <StaffTable
  staff={filteredStaff}
  onStatusChange={updateStaffStatus}
  updatingUserId={updatingUserId}
/>
              </div>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}

 
import { Compass, Menu, UserRound, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const token = sessionStorage.getItem("access_token");
  let user = null;

  try {
    user = JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("access_token");
  }

  // Show authenticated navigation only when both values exist.
  const isLoggedIn = Boolean(token && user);

  function handleLogout() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user");
    setMenuOpen(false);
    navigate("/");
  }

  const roleLabel = {
    HIGHER_ADMIN: "Admin",
    STAFF: "Staff",
    CUSTOMER: "Customer",
  };

  const canManageInvoices =
    isLoggedIn &&
    ["HIGHER_ADMIN", "STAFF"].includes(user.role_name);
 const canManagePayments =
  isLoggedIn &&
  ["HIGHER_ADMIN", "STAFF"].includes(user.role_name);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2">
          <span className="rounded-xl bg-teal-600 p-2 text-white">
            <Compass size={23} />
          </span>

          <span className="text-xl font-bold tracking-tight text-slate-900">
            Travel<span className="text-teal-600">Mate</span>
          </span>
        </Link>

        {/* Desktop public navigation */}
        <div className="hidden items-center gap-8 md:flex">
          <Link to="/" className="font-medium text-teal-700">
            Home
          </Link>

          <Link
            to="/destinations"
            className="text-slate-600 hover:text-teal-700"
          >
            Destinations
          </Link>

          <Link
            to="/packages"
            className="text-slate-600 hover:text-teal-700"
          >
            Packages
          </Link>

          <a
            href="/#about"
            className="text-slate-600 hover:text-teal-700"
          >
            About
          </a>
        </div>

        {/* Desktop account navigation */}
        <div className="hidden items-center gap-3 md:flex">
          {isLoggedIn ? (
            <>
              {user.role_name === "CUSTOMER" && (
                <Link
                  to="/customer/profile"
                  className="text-sm font-medium text-slate-700 hover:text-teal-700"
                >
                  My Profile
                </Link>
              )}
{user.role_name === "CUSTOMER" && (
  <Link
    to="/customer/bookings"
    className="text-sm font-medium text-slate-700 hover:text-teal-700"
  >
    My Bookings
  </Link>
)}


              {canManageInvoices && (
                <Link
                  to="/invoices"
                  className="text-sm font-medium text-slate-700 hover:text-teal-700"
                >
                  Invoices
                </Link>
              )}

              {canManagePayments && (
  <Link
    to="/payments"
    className="text-sm font-medium text-slate-700 hover:text-teal-700"
  >
    Payments
  </Link>
)}

              <Link
                to="/dashboard"
                className="text-right text-sm text-slate-700 hover:text-teal-700"
              >
                <span className="block font-semibold">
                  {user.username}
                </span>

                <span className="block text-xs text-slate-500">
                  {roleLabel[user.role_name] || user.role_name}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <LogOut size={17} />
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-full bg-teal-600 px-5 py-2.5 font-semibold text-white transition hover:bg-teal-700"
            >
              <UserRound size={17} />
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="rounded-lg p-2 text-slate-700 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((previous) => !previous)}
        >
          <Menu size={25} />
        </button>
      </nav>

      {/* Mobile navigation */}
      {menuOpen && (
        <div className="space-y-3 border-t border-slate-200 bg-white px-5 py-4 md:hidden">
          <Link
            className="block text-slate-700"
            to="/"
            onClick={() => setMenuOpen(false)}
          >
            Home
          </Link>

          <Link
            className="block text-slate-700"
            to="/destinations"
            onClick={() => setMenuOpen(false)}
          >
            Destinations
          </Link>

          <Link
            className="block text-slate-700"
            to="/packages"
            onClick={() => setMenuOpen(false)}
          >
            Packages
          </Link>

          {isLoggedIn ? (
            <>
              {user.role_name === "CUSTOMER" && (
                <Link
                  className="block font-medium text-teal-700"
                  to="/customer/profile"
                  onClick={() => setMenuOpen(false)}
                >
                  My Profile
                </Link>
              )}
              {user.role_name === "CUSTOMER" && (
  <Link
    className="block font-medium text-teal-700"
    to="/customer/bookings"
    onClick={() => setMenuOpen(false)}
  >
    My Bookings
  </Link>
)}

              
              {canManageInvoices && (
                <Link
                  className="block font-medium text-teal-700"
                  to="/invoices"
                  onClick={() => setMenuOpen(false)}
                >
                  Invoices
                </Link>
              )}

              {canManagePayments && (
  <Link
    to="/payments"
    className="text-sm font-medium text-slate-700 hover:text-teal-700"
  >
    Payments
  </Link>
)}

              <Link
                className="block text-slate-700"
                to="/dashboard"
                onClick={() => setMenuOpen(false)}
              >
                {user.username} (
                {roleLabel[user.role_name] || user.role_name})
              </Link>

              <button
                onClick={handleLogout}
                className="font-semibold text-red-600"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              className="block font-semibold text-teal-700"
              to="/login"
              onClick={() => setMenuOpen(false)}
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

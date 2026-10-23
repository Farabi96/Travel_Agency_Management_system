
import {
  Compass,
  Menu,
  UserRound,
  LogOut,
  Bell,
  CheckCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  getNotifications,
  markNotificationRead,
} from "../services/api";

export default function Navbar() {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [markingReadId, setMarkingReadId] = useState(null);

  const token = sessionStorage.getItem("access_token");
  let user = null;

  try {
    user = JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("access_token");
  }

  const isLoggedIn = Boolean(token && user);
  const isCustomer = isLoggedIn && user.role_name === "CUSTOMER";

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      if (!isCustomer || !token) {
        setNotifications([]);
        return;
      }

      setNotificationsLoading(true);
      setNotificationsError("");

      try {
        const data = await getNotifications();

        if (!cancelled) {
          setNotifications(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!cancelled) {
          setNotificationsError(
            error.message || "Failed to load notifications."
          );
        }
      } finally {
        if (!cancelled) {
          setNotificationsLoading(false);
        }
      }
    }

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [isCustomer, token]);

  function handleLogout() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user");

    setMenuOpen(false);
    setNotificationsOpen(false);
    setNotifications([]);

    navigate("/");
  }
    async function handleMarkRead(notification) {
    if (notification.is_read || markingReadId !== null) {
      return;
    }

    const notificationId = notification.notification_id;

    setMarkingReadId(notificationId);
    setNotificationsError("");

    try {
      await markNotificationRead(notificationId);

      setNotifications((current) =>
        current.map((item) =>
          item.notification_id === notificationId
            ? { ...item, is_read: true }
            : item
        )
      );
    } catch (error) {
      setNotificationsError(
        error.message || "Could not mark notification as read."
      );
    } finally {
      setMarkingReadId(null);
    }
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

  function renderNotificationPanel() {
    return (
      <div className="absolute right-0 top-full z-[60] mt-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:w-96">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h3 className="font-semibold text-slate-900">
              Notifications
            </h3>
            <p className="text-xs text-slate-500">
              {unreadCount} unread
            </p>
          </div>

          <button
            type="button"
            onClick={() => setNotificationsOpen(false)}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        {notificationsError && (
          <p
            role="alert"
            className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {notificationsError}
          </p>
        )}

        {notificationsLoading ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            Loading notifications...
          </p>
        ) : notifications.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            No notifications yet.
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.notification_id}
                className={`border-b border-slate-100 px-4 py-3 last:border-b-0 ${
                  notification.is_read ? "bg-white" : "bg-teal-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">
                      {notification.title || "Notification"}
                    </p>

                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">
                      {notification.content || "No additional details."}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {notification.priority && (
                        <span className="rounded-full bg-slate-100 px-2 py-1">
                          {notification.priority}
                        </span>
                      )}

                      {notification.created_at && (
                        <span>
                          {new Date(
                            notification.created_at
                          ).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {!notification.is_read && (
                    <button
                      type="button"
                      title="Mark as read"
                      aria-label={`Mark ${notification.title || "notification"} as read`}
                      disabled={
                        markingReadId !== null
                      }
                      onClick={() => handleMarkRead(notification)}
                      className="shrink-0 rounded-lg p-2 text-teal-700 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCheck size={18} />
                    </button>
                  )}
                </div>

                {markingReadId === notification.notification_id && (
                  <p className="mt-1 text-xs text-slate-500">
                    Marking as read...
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderNotificationButton() {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() =>
            setNotificationsOpen((previous) => !previous)
          }
          aria-label={`Notifications, ${unreadCount} unread`}
          aria-expanded={notificationsOpen}
          className="relative flex items-center gap-2 rounded-full border border-slate-200 p-2.5 text-slate-700 transition hover:bg-slate-100"
        >
          <Bell size={20} />

          <span className="text-sm md:hidden">
            Notifications
          </span>

          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {notificationsOpen && renderNotificationPanel()}
      </div>
    );
  }

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
              {isCustomer && (
                <>
                  <Link
                    to="/customer/profile"
                    className="text-sm font-medium text-slate-700 hover:text-teal-700"
                  >
                    My Profile
                  </Link>

                  <Link
                    to="/customer/bookings"
                    className="text-sm font-medium text-slate-700 hover:text-teal-700"
                  >
                    My Bookings
                  </Link>

                  {renderNotificationButton()}
                </>
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

              {canManagePayments && (
                <Link
                  to="/booking-tracking"
                  className="text-sm font-medium text-slate-700 hover:text-teal-700"
                >
                  Booking Tracking
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
                type="button"
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
          type="button"
          className="rounded-lg p-2 text-slate-700 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => {
            setMenuOpen((previous) => !previous);
            setNotificationsOpen(false);
          }}
        >
          <Menu size={25} />
        </button>
      </nav>

      {/* Mobile navigation */}
      {menuOpen && (
        <div className="space-y-4 border-t border-slate-200 bg-white px-5 py-4 md:hidden">
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
              {isCustomer && (
                <>
                  <Link
                    className="block font-medium text-teal-700"
                    to="/customer/profile"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Profile
                  </Link>

                  <Link
                    className="block font-medium text-teal-700"
                    to="/customer/bookings"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Bookings
                  </Link>

                  {renderNotificationButton()}
                </>
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
                  className="block font-medium text-teal-700"
                  to="/payments"
                  onClick={() => setMenuOpen(false)}
                >
                  Payments
                </Link>
              )}

              {canManagePayments && (
                <Link
                  className="block font-medium text-teal-700"
                  to="/booking-tracking"
                  onClick={() => setMenuOpen(false)}
                >
                  Booking Tracking
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
                type="button"
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

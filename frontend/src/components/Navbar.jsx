import {
  Compass,
  Menu,
  UserRound,
  LogOut,
  Bell,
  CheckCheck,
  ChevronDown,
  LayoutDashboard,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  getNotifications,
  markNotificationRead,
  getStaffNotifications,
  markStaffNotificationRead,
} from "../services/api";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [markingReadId, setMarkingReadId] = useState(null);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

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
  const isHigherAdmin = isLoggedIn && user.role_name === "HIGHER_ADMIN";
  const isStaff = isLoggedIn && user.role_name === "STAFF";
  const canReceiveNotifications =
    isLoggedIn &&
    ["CUSTOMER", "STAFF", "HIGHER_ADMIN"].includes(user.role_name);
  const unreadCount = notifications.filter((item) => !item.is_read).length;
  const roleLabel = {
    HIGHER_ADMIN: "Higher Administrator",
    STAFF: "Staff",
    CUSTOMER: "Customer",
  };

  useEffect(() => {
    let cancelled = false;
    async function loadNotifications() {
      if (!canReceiveNotifications || !token) {
        setNotifications([]);
        setNotificationsLoading(false);
        return;
      }
      setNotificationsLoading(true);
      setNotificationsError("");
      try {
        // Customers use their own notification feed. Staff and Higher Admin
        // use the existing staff/admin notification feed.
        const data = isCustomer
          ? await getNotifications()
          : await getStaffNotifications();

        if (!cancelled) setNotifications(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!cancelled) setNotificationsError(error.message || "Failed to load notifications.");
      } finally {
        if (!cancelled) setNotificationsLoading(false);
      }
    }
    loadNotifications();
    return () => { cancelled = true; };
  }, [canReceiveNotifications, isCustomer, token]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user");
    setMenuOpen(false);
    setProfileOpen(false);
    setNotificationsOpen(false);
    setNotifications([]);
    navigate("/");
  }

  async function handleMarkRead(notification) {
    if (notification.is_read || markingReadId !== null) return;
    const notificationId = notification.notification_id;
    setMarkingReadId(notificationId);
    setNotificationsError("");
    try {
      if (isCustomer) {
        await markNotificationRead(notificationId);
      } else {
        await markStaffNotificationRead(notificationId);
      }

      setNotifications((current) =>
        current.map((item) =>
          item.notification_id === notificationId
            ? { ...item, is_read: true, read_at: new Date().toISOString() }
            : item
        )
      );
    } catch (error) {
      setNotificationsError(error.message || "Could not mark notification as read.");
    } finally {
      setMarkingReadId(null);
    }
  }

  async function handleNotificationToggle() {
    const willOpen = !notificationsOpen;
    setNotificationsOpen(willOpen);
    // Preserve the existing customer behavior: opening the panel marks their
    // unread items as read. Staff/Admin items are marked individually.
    if (!willOpen || !isCustomer || notificationsLoading) return;
    const unread = notifications.filter((item) => !item.is_read);
    for (const notification of unread) {
      try {
        await markNotificationRead(notification.notification_id);
        setNotifications((current) =>
          current.map((item) =>
            item.notification_id === notification.notification_id
              ? { ...item, is_read: true, read_at: new Date().toISOString() }
              : item
          )
        );
      } catch (error) {
        setNotificationsError(error.message || "Could not mark notifications as read.");
      }
    }
  }

  function NotificationControl() {
    return (
      <div className="relative" ref={notificationRef}>
        <button
          type="button"
          onClick={handleNotificationToggle}
          aria-label={`Notifications, ${unreadCount} unread`}
          aria-expanded={notificationsOpen}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
        {notificationsOpen && (
          <div className="absolute right-0 top-full z-[100] mt-3 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xl sm:w-96">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                <p className="mt-0.5 text-xs text-slate-500">{unreadCount} unread</p>
              </div>
              <button type="button" onClick={() => setNotificationsOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close notifications">
                <X size={17} />
              </button>
            </div>
            {notificationsError && <p role="alert" className="bg-rose-50 px-4 py-2 text-xs text-rose-700">{notificationsError}</p>}
            {notificationsLoading ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">Loading notifications…</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</p>
            ) : (
              <div className="max-h-[min(28rem,65vh)] overflow-y-auto">
                {notifications.map((item) => (
                  <div key={item.notification_id} className={`border-b border-slate-100 px-4 py-3 last:border-0 ${item.is_read ? "bg-white" : "bg-teal-50/70"}`}>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{item.title || "Notification"}</p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-600">{item.content || "No additional details."}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                          {item.priority && <span className="rounded-full bg-slate-100 px-2 py-0.5">{item.priority}</span>}
                          {item.created_at && <span>{new Date(item.created_at).toLocaleString()}</span>}
                        </div>
                      </div>
                      {!item.is_read && (
                        <button type="button" title="Mark as read" aria-label="Mark notification as read" disabled={markingReadId !== null} onClick={() => handleMarkRead(item)} className="rounded-lg p-2 text-teal-700 hover:bg-teal-100 disabled:opacity-50">
                          <CheckCheck size={17} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
      <nav className="mx-auto flex min-h-[68px] max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="TravelMate home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-900/15">
            <Compass size={22} />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
            Travel<span className="text-teal-600">Mate</span>
          </span>
        </Link>

        <div className="hidden items-center gap-5 lg:flex">
          <Link to="/" className={`text-sm font-semibold transition ${location.pathname === "/" ? "text-teal-700" : "text-slate-600 hover:text-teal-700"}`}>Home</Link>
          <Link to="/destinations" className={`text-sm font-medium transition ${location.pathname === "/destinations" ? "text-teal-700" : "text-slate-600 hover:text-teal-700"}`}>Destinations</Link>
          <Link to="/packages" className={`text-sm font-medium transition ${location.pathname === "/packages" ? "text-teal-700" : "text-slate-600 hover:text-teal-700"}`}>Packages</Link>
          <a href="/#about" className="text-sm font-medium text-slate-600 transition hover:text-teal-700">About</a>
        </div>

        <div className="hidden shrink-0 items-center gap-2.5 md:flex">
          {isLoggedIn ? (
            <>
              {isCustomer && (
                <>
                  <Link to="/customer/profile" className="px-2 text-sm font-medium text-slate-600 hover:text-teal-700">My Profile</Link>
                  <Link to="/customer/bookings" className="px-2 text-sm font-medium text-slate-600 hover:text-teal-700">My Bookings</Link>
                </>
              )}
              {canReceiveNotifications && <NotificationControl />}
              {/* Operational admin links live in the Admin Dashboard sidebar, not this public navbar. */}
              {isStaff && (
                <>
                  <Link to="/invoices" className="px-2 text-sm font-medium text-slate-600 hover:text-teal-700">Invoices</Link>
                  <Link to="/payments" className="px-2 text-sm font-medium text-slate-600 hover:text-teal-700">Payments</Link>
                  <Link to="/booking-tracking" className="px-2 text-sm font-medium text-slate-600 hover:text-teal-700">Booking Tracking</Link>
                </>
              )}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  aria-expanded={profileOpen}
                  className="flex max-w-[210px] items-center gap-2 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    {(user.username || "U").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block max-w-[125px] truncate text-sm font-bold text-slate-800">
                      {isHigherAdmin ? "Admin Dashboard" : user.username}
                    </span>
                    <span className="block text-xs text-slate-500">{roleLabel[user.role_name] || user.role_name}</span>
                  </span>
                  <ChevronDown size={15} className="shrink-0 text-slate-400" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full z-[90] mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="bg-slate-50 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-base font-bold text-white">
                          {(user.username || "U").slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{user.username || "User"}</p>
                          <p className="truncate text-xs text-slate-500">{user.email || "Email not available"}</p>
                        </div>
                      </div>
                      <span className="mt-3 inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">{roleLabel[user.role_name] || user.role_name}</span>
                    </div>
                    <div className="p-2">
                      {isHigherAdmin && <Link to="/dashboard" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><LayoutDashboard size={17} /> Open Admin Dashboard</Link>}
                      {isCustomer && <Link to="/customer/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><UserRound size={17} /> My profile</Link>}
                      <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"><LogOut size={17} /> Log out</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-700">
              <UserRound size={16} /> Sign in
            </Link>
          )}
        </div>

        <button type="button" className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 md:hidden" aria-label="Toggle menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </nav>

      {menuOpen && (
        <div className="space-y-1 border-t border-slate-100 bg-white px-4 py-4 shadow-lg md:hidden">
          <Link className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" to="/" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" to="/destinations" onClick={() => setMenuOpen(false)}>Destinations</Link>
          <Link className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" to="/packages" onClick={() => setMenuOpen(false)}>Packages</Link>
          {isLoggedIn ? (
            <>
              {isCustomer && <><Link className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50" to="/customer/profile" onClick={() => setMenuOpen(false)}>My Profile</Link><Link className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50" to="/customer/bookings" onClick={() => setMenuOpen(false)}>My Bookings</Link></>}
              {canReceiveNotifications && <div className="flex justify-start px-3 py-2"><NotificationControl /></div>}
              {isStaff && <><Link className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50" to="/invoices" onClick={() => setMenuOpen(false)}>Invoices</Link><Link className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50" to="/payments" onClick={() => setMenuOpen(false)}>Payments</Link><Link className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50" to="/booking-tracking" onClick={() => setMenuOpen(false)}>Booking Tracking</Link></>}
              {isHigherAdmin && <Link className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50" to="/dashboard" onClick={() => setMenuOpen(false)}>Admin Dashboard</Link>}
              <div className="mx-3 my-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-bold text-slate-900">{user.username}</p>
                <p className="mt-0.5 text-xs text-slate-500">{user.email || roleLabel[user.role_name] || user.role_name}</p>
              </div>
              <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"><LogOut size={17} /> Log out</button>
            </>
          ) : (
            <Link className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-teal-700" to="/login" onClick={() => setMenuOpen(false)}>Sign in</Link>
          )}
        </div>
      )}
    </header>
  );
}

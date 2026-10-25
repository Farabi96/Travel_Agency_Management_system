
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  MapPin,
  Users,
  Wallet,
  Eye,
  XCircle,
  RefreshCw,
} from "lucide-react";

import {
  getMyBookings,
  cancelBooking,
} from "../services/api";

import "./CustomerBookings.css";

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(value) {
  return `৳${Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getStatusClass(status) {
  return String(status || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

export default function CustomerBookings() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  async function loadBookings() {
    setLoading(true);
    setError("");

    try {
      const result = await getMyBookings();

      const list = Array.isArray(result)
        ? result
        : result?.bookings ?? result?.data ?? [];

      setBookings(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || "Unable to load your bookings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  const statuses = [
    "ALL",
    ...new Set(bookings.map((booking) =>
      String(booking.status || "UNKNOWN").toUpperCase()
    )),
  ];

  const filteredBookings =
    filter === "ALL"
      ? bookings
      : bookings.filter(
          (booking) =>
            String(booking.status || "UNKNOWN").toUpperCase() === filter
        );

  async function handleCancel(booking) {
    const bookingId = booking.booking_id;

    const confirmed = window.confirm(
      `Are you sure you want to cancel booking ${
        booking.booking_reference || `#${bookingId}`
      }?`
    );

    if (!confirmed) return;

    setCancellingId(bookingId);
    setActionError("");

    try {
      await cancelBooking(bookingId);
      await loadBookings();
    } catch (err) {
      setActionError(
        err.message || "Unable to cancel this booking."
      );
    } finally {
      setCancellingId(null);
    }
  }

  const upcomingCount = bookings.filter((booking) => {
    const date = new Date(
      booking.departure_datetime || booking.travel_date
    );

    const status = String(booking.status || "").toUpperCase();

    return (
      !Number.isNaN(date.getTime()) &&
      date >= new Date() &&
      !["CANCELLED", "COMPLETED", "REJECTED"].includes(status)
    );
  }).length;

  return (
    <main className="customer-bookings">
      <header className="bookings-header">
        <div>
          <p className="bookings-eyebrow">CUSTOMER PORTAL</p>
          <h1>My Bookings</h1>
          <p className="bookings-subtitle">
            Manage your trips and keep track of your travel plans.
          </p>
        </div>

        <Link to="/packages" className="booking-primary-button">
          Explore Packages
        </Link>
      </header>

      <section className="booking-summary">
        <article className="booking-summary-card">
          <span className="summary-icon">
            <CalendarDays size={21} />
          </span>
          <div>
            <p>Total Bookings</p>
            <h2>{bookings.length}</h2>
          </div>
        </article>

        <article className="booking-summary-card">
          <span className="summary-icon">
            <MapPin size={21} />
          </span>
          <div>
            <p>Upcoming Trips</p>
            <h2>{upcomingCount}</h2>
          </div>
        </article>

        <article className="booking-summary-card">
          <span className="summary-icon">
            <Wallet size={21} />
          </span>
          <div>
            <p>Total Booked Amount</p>
            <h2>
              {formatAmount(
                bookings.reduce(
                  (total, booking) =>
                    total + Number(booking.total_amount || 0),
                  0
                )
              )}
            </h2>
          </div>
        </article>
      </section>

      <section className="bookings-panel">
        <div className="bookings-panel-header">
          <div>
            <h2>Booking History</h2>
            <p>View your reservations and their current status.</p>
          </div>

          <button
            type="button"
            className="booking-refresh-button"
            onClick={loadBookings}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="booking-filters">
          {statuses.map((status) => (
            <button
              type="button"
              key={status}
              className={`booking-filter ${
                filter === status ? "active" : ""
              }`}
              onClick={() => setFilter(status)}
            >
              {status.replaceAll("_", " ")}
            </button>
          ))}
        </div>

        {actionError && (
          <p className="booking-error" role="alert">
            {actionError}
          </p>
        )}

        {loading ? (
          <div className="booking-message">
            Loading your bookings...
          </div>
        ) : error ? (
          <div className="booking-message booking-error">
            <p>{error}</p>
            <button onClick={loadBookings} type="button">
              Try Again
            </button>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="booking-empty">
            <CalendarDays size={42} />
            <h3>
              {bookings.length === 0
                ? "No bookings yet"
                : "No bookings in this category"}
            </h3>
            <p>
              {bookings.length === 0
                ? "Your trips will appear here after you make a booking."
                : "Try selecting another status filter."}
            </p>

            {bookings.length === 0 && (
              <Link to="/packages" className="booking-primary-button">
                Browse Packages
              </Link>
            )}
          </div>
        ) : (
          <div className="bookings-table-wrapper">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Travel Date</th>
                  <th>Travelers</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredBookings.map((booking) => {
                  const status = String(
                    booking.status || "UNKNOWN"
                  ).toUpperCase();

                  const canCancel = [
                    "PENDING",
                    "CONFIRMED",
                  ].includes(status);

                  return (
                    <tr key={booking.booking_id}>
                      <td>
                        <strong>
                          {booking.package_name || "Travel Package"}
                        </strong>
                        <span className="booking-reference">
                          {booking.booking_reference ||
                            `Booking #${booking.booking_id}`}
                        </span>
                      </td>

                      <td>
                        {formatDate(
                          booking.departure_datetime ||
                            booking.travel_date
                        )}
                      </td>

                      <td>
                        <span className="booking-travelers">
                          <Users size={15} />
                          {booking.number_of_travelers ?? "—"}
                        </span>
                      </td>

                      <td className="booking-amount">
                        {formatAmount(booking.total_amount)}
                      </td>

                      <td>
                        <span
                          className={`booking-status status-${getStatusClass(
                            status
                          )}`}
                        >
                          {status.replaceAll("_", " ")}
                        </span>
                      </td>

                      <td>
                        <div className="booking-actions">
                          <Link
                            to={`/booking-tracking/${booking.booking_id}`}
                            className="booking-icon-button"
                            title="Track booking"
                            aria-label="Track booking"
                          >
                            <Eye size={17} />
                          </Link>

                          {canCancel && (
                            <button
                              type="button"
                              className="booking-icon-button cancel"
                              title="Cancel booking"
                              aria-label="Cancel booking"
                              disabled={
                                cancellingId === booking.booking_id
                              }
                              onClick={() => handleCancel(booking)}
                            >
                              <XCircle size={17} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

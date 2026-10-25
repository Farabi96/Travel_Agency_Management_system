
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Phone,
  Users,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { getTravelCalendar } from "../services/api";

const pad = (value) => String(value).padStart(2, "0");

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseLocalDate(value) {
  if (!value) return null;

  const [datePart, timePart = "00:00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour = 0, minute = 0, second = 0] = timePart
    .split(":")
    .map((part) => Number(part.split(".")[0]));

  if (![year, month, day].every(Number.isFinite)) return null;

  return new Date(year, month - 1, day, hour, minute, second);
}

function formatDate(value) {
  const date = parseLocalDate(value);
  return date
    ? date.toLocaleDateString("en-BD", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Date unavailable";
}

function formatTime(value) {
  const date = parseLocalDate(value);
  return date
    ? date.toLocaleTimeString("en-BD", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "Time unavailable";
}

function statusStyle(status) {
  const value = String(status || "").toUpperCase();

  if (value === "CONFIRMED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (value === "PENDING") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
}

export default function TravelCalendar() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [range, setRange] = useState("all");

  async function loadTrips() {
    setLoading(true);
    setError("");

    try {
      const result = await getTravelCalendar();
      setTrips(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.message || "Could not load travel calendar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrips();
  }, []);

  const upcomingTrips = useMemo(() => {
    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const end = new Date(today);
    if (range === "7") end.setDate(end.getDate() + 7);
    if (range === "30") end.setDate(end.getDate() + 30);

    return trips.filter((trip) => {
      const departure = parseLocalDate(trip.departure_datetime);
      if (!departure) return false;

      const departureDay = new Date(
        departure.getFullYear(),
        departure.getMonth(),
        departure.getDate()
      );

      if (departureDay < today) return false;
      if (range !== "all" && departureDay > end) return false;
      return true;
    });
  }, [trips, range]);

  const tripsByDate = useMemo(() => {
    const grouped = {};

    upcomingTrips.forEach((trip) => {
      const departure = parseLocalDate(trip.departure_datetime);
      if (!departure) return;

      const key = dateKey(departure);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(trip);
    });

    return grouped;
  }, [upcomingTrips]);

  const selectedTrips = tripsByDate[selectedDate] || [];

  const calendarDays = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const totalDays = new Date(year, monthIndex + 1, 0).getDate();

    return [
      ...Array(startOffset).fill(null),
      ...Array.from({ length: totalDays }, (_, index) => index + 1),
    ];
  }, [month]);

  const monthLabel = month.toLocaleDateString("en-BD", {
    month: "long",
    year: "numeric",
  });

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <CalendarDays className="text-teal-700" size={23} />
            Travel Calendar
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Check upcoming departures, traveler lists and contact details.
          </p>
        </div>

        <button
          type="button"
          onClick={loadTrips}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh trips
        </button>
      </div>

      {error && (
        <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={19} className="shrink-0" />
          <div>
            <p>{error}</p>
            <button
              type="button"
              onClick={loadTrips}
              className="mt-2 font-semibold underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() =>
                setMonth(
                  new Date(month.getFullYear(), month.getMonth() - 1, 1)
                )
              }
              className="rounded-lg p-2 hover:bg-slate-100"
            >
              <ChevronLeft size={20} />
            </button>

            <h3 className="font-bold text-slate-900">{monthLabel}</h3>

            <button
              type="button"
              aria-label="Next month"
              onClick={() =>
                setMonth(
                  new Date(month.getFullYear(), month.getMonth() + 1, 1)
                )
              }
              className="rounded-lg p-2 hover:bg-slate-100"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div
                key={day}
                className="py-2 text-xs font-semibold text-slate-400"
              >
                {day}
              </div>
            ))}

            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={`blank-${index}`} />;
              }

              const date = new Date(
                month.getFullYear(),
                month.getMonth(),
                day
              );
              const key = dateKey(date);
              const hasTrips = Boolean(tripsByDate[key]?.length);
              const selected = key === selectedDate;
              const today = key === dateKey(new Date());

              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSelectedDate(key)}
                  className={`relative flex min-h-11 flex-col items-center justify-center rounded-xl text-sm transition ${
                    selected
                      ? "bg-teal-700 font-bold text-white"
                      : hasTrips
                        ? "bg-teal-50 font-semibold text-teal-800 hover:bg-teal-100"
                        : "text-slate-600 hover:bg-slate-50"
                  } ${today && !selected ? "ring-1 ring-teal-500" : ""}`}
                  aria-label={`${key}${hasTrips ? `, ${tripsByDate[key].length} trips` : ""}`}
                >
                  {day}
                  {hasTrips && (
                    <span
                      className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                        selected ? "bg-white" : "bg-teal-600"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-600" />
              Departure scheduled
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full ring-1 ring-teal-500" />
              Today
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-bold text-slate-900">
                Upcoming Trips
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {upcomingTrips.length} trips in selected range
              </p>
            </div>

            <select
              value={range}
              onChange={(event) => setRange(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              aria-label="Filter upcoming trips"
            >
              <option value="7">Next 7 days</option>
              <option value="30">Next 30 days</option>
              <option value="all">All upcoming</option>
            </select>
          </div>

          <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {loading ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Loading trips...
              </p>
            ) : upcomingTrips.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No upcoming trips found for this range.
              </p>
            ) : (
              upcomingTrips.map((trip) => {
                const key = dateKey(
                  parseLocalDate(trip.departure_datetime)
                );

                return (
                  <button
                    type="button"
                    key={trip.booking_id}
                    onClick={() => {
                      setSelectedDate(key);
                      const departure = parseLocalDate(
                        trip.departure_datetime
                      );
                      setMonth(
                        new Date(
                          departure.getFullYear(),
                          departure.getMonth(),
                          1
                        )
                      );
                    }}
                    className={`w-full rounded-xl border p-4 text-left transition hover:border-teal-300 hover:bg-teal-50/50 ${
                      selectedDate === key
                        ? "border-teal-400 bg-teal-50"
                        : "border-slate-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {trip.package_name || "Package unavailable"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {trip.booking_reference ||
                            `Booking #${trip.booking_id}`}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(trip.booking_status)}`}
                      >
                        {trip.booking_status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={14} />
                        {formatDate(trip.departure_datetime)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users size={14} />
                        {trip.number_of_travelers ?? 0} travelers
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Trips on {formatDate(`${selectedDate}T00:00:00`)}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Select another date on the calendar to view its trips.
            </p>
          </div>
          <span className="w-fit rounded-full bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-800">
            {selectedTrips.length} trips
          </span>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Loading trip details...
          </p>
        ) : selectedTrips.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No upcoming trips scheduled for this date.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {selectedTrips.map((trip) => (
              <article
                key={trip.booking_id}
                className="rounded-xl border border-slate-200 p-4 sm:p-5"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      {trip.package_name || "Package unavailable"}
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      Booking:{" "}
                      {trip.booking_reference ||
                        `#${trip.booking_id}`}
                    </p>
                  </div>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(trip.booking_status)}`}
                  >
                    {trip.booking_status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                    <Clock3 className="mt-0.5 shrink-0 text-teal-700" size={18} />
                    <div>
                      <p className="text-xs text-slate-500">Departure</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {formatTime(trip.departure_datetime)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                    <Clock3 className="mt-0.5 shrink-0 text-teal-700" size={18} />
                    <div>
                      <p className="text-xs text-slate-500">Return</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {trip.return_datetime
                          ? `${formatDate(trip.return_datetime)} · ${formatTime(trip.return_datetime)}`
                          : "Not available"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                    <Phone className="mt-0.5 shrink-0 text-teal-700" size={18} />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">
                        Booking contact
                      </p>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                        {trip.customer_name || "Unknown customer"}
                      </p>
                      {trip.customer_phone ? (
                        <a
                          href={`tel:${trip.customer_phone}`}
                          className="mt-1 inline-block text-sm text-teal-700 hover:underline"
                        >
                          {trip.customer_phone}
                        </a>
                      ) : (
                        <p className="mt-1 text-sm text-slate-500">
                          Phone not available
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                    <Users className="mt-0.5 shrink-0 text-teal-700" size={18} />
                    <div>
                      <p className="text-xs text-slate-500">Travelers</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {trip.number_of_travelers ?? 0} booked
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {trip.travelers?.length ?? 0} traveler names recorded
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <h5 className="font-semibold text-slate-800">
                    Traveler list
                  </h5>

                  {trip.travelers?.length ? (
                    <ol className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {trip.travelers.map((traveler, index) => (
                        <li
                          key={traveler.traveler_id}
                          className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 text-sm text-slate-700"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-800">
                            {index + 1}
                          </span>
                          <span>{traveler.full_name}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      No traveler names have been recorded for this booking.
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs leading-5 text-slate-500">
        Contact numbers are for the booking customer. Traveler names appear
        when traveler records are available. Pending bookings are shown
        separately from confirmed bookings.
      </p>
    </section>
  );
}

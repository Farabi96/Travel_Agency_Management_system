
import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Clock, Users } from "lucide-react";
import {
  getPackages,
  getSchedules,
  getScheduleAvailability,
} from "../services/api";

function formatDateTime(value) {
  if (!value) return "Not available";

  return new Date(value).toLocaleString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedPackage, setExpandedPackage] = useState(null);
  const [schedules, setSchedules] = useState({});
  const [availability, setAvailability] = useState({});
  const [scheduleLoading, setScheduleLoading] = useState({});
  const [scheduleErrors, setScheduleErrors] = useState({});

  useEffect(() => {
    getPackages()
      .then((data) => {
        const items = Array.isArray(data)
          ? data
          : data?.value ?? data?.packages ?? [];

        setPackages(
          items.filter((item) => item.package_status === "ACTIVE")
        );
      })
      .catch((err) => {
        console.error("Failed to load packages:", err);
        setError("Could not load tour packages. Please try again.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function toggleSchedules(packageItem) {
    const packageId = packageItem.package_id;

    if (expandedPackage === packageId) {
      setExpandedPackage(null);
      return;
    }

    setExpandedPackage(packageId);

    if (schedules[packageId]) return;

    setScheduleLoading((prev) => ({ ...prev, [packageId]: true }));
    setScheduleErrors((prev) => ({ ...prev, [packageId]: "" }));

    try {
      const data = await getSchedules(packageId);
      const items = Array.isArray(data)
        ? data
        : data?.schedules ?? data?.value ?? [];

      setSchedules((prev) => ({ ...prev, [packageId]: items }));

      const results = await Promise.all(
        items.map(async (schedule) => {
          try {
            const result = await getScheduleAvailability(
              schedule.schedule_id
            );
            return [schedule.schedule_id, result];
          } catch (err) {
            console.error("Failed to load schedule availability:", err);
            return [
              schedule.schedule_id,
              { availability_error: "Seat availability could not be loaded." },
            ];
          }
        })
      );

      setAvailability((prev) => ({
        ...prev,
        ...Object.fromEntries(results),
      }));
    } catch (err) {
      console.error("Failed to load schedules:", err);
      setScheduleErrors((prev) => ({
        ...prev,
        [packageId]: "Could not load departure dates. Please try again.",
      }));
    } finally {
      setScheduleLoading((prev) => ({ ...prev, [packageId]: false }));
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="font-bold uppercase tracking-widest text-teal-700">
          Explore experiences
        </p>

        <h1 className="mt-3 text-4xl font-bold text-slate-900">
          Tour Packages
        </h1>

        <p className="mt-4 text-slate-600">
          Find your next adventure from our available tour packages.
        </p>

        {loading && (
          <p className="mt-8 text-slate-600">Loading packages...</p>
        )}

        {error && <p className="mt-8 text-red-600">{error}</p>}

        {!loading && !error && packages.length === 0 && (
          <p className="mt-8 rounded-xl bg-white p-6 text-slate-600">
            No active tour packages are available yet.
          </p>
        )}

        {!loading && !error && packages.length > 0 && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((item) => {
              const packageId = item.package_id;
              const isExpanded = expandedPackage === packageId;
              const packageSchedules = schedules[packageId] || [];

              return (
                <article
                  key={packageId}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex h-40 items-center justify-center bg-gradient-to-br from-teal-700 to-cyan-500 text-white">
                    <MapPin size={42} />
                  </div>

                  <div className="p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-teal-700">
                      {item.package_code}
                    </p>

                    <h2 className="mt-2 text-xl font-bold text-slate-900">
                      {item.package_name}
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {item.description ||
                        "Discover a memorable travel experience."}
                    </p>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-xs text-slate-500">
                          Starting from
                        </p>
                        <p className="text-xl font-extrabold text-teal-700">
                          ৳{Number(item.base_price).toLocaleString("en-BD")}
                        </p>
                      </div>

                      <span className="flex items-center gap-1 text-sm text-slate-600">
                        <CalendarDays size={16} />
                        {item.duration_days}D / {item.duration_nights}N
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSchedules(item)}
                      className="mt-5 w-full rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800"
                    >
                      {isExpanded
                        ? "Hide Departure Dates"
                        : "View Departure Dates"}
                    </button>

                    {isExpanded && (
                      <div className="mt-5 border-t border-slate-200 pt-4">
                        <h3 className="text-lg font-bold text-slate-900">
                          Available Schedules
                        </h3>

                        {scheduleLoading[packageId] && (
                          <p className="mt-3 text-sm text-slate-600">
                            Loading departure dates and seat availability...
                          </p>
                        )}

                        {scheduleErrors[packageId] && (
                          <p className="mt-3 text-sm text-red-600">
                            {scheduleErrors[packageId]}
                          </p>
                        )}

                        {!scheduleLoading[packageId] &&
                          !scheduleErrors[packageId] &&
                          packageSchedules.length === 0 && (
                            <p className="mt-3 text-sm text-slate-600">
                              No departure schedules are available for this
                              package yet.
                            </p>
                          )}

                        <div className="mt-3 space-y-4">
                          {packageSchedules.map((schedule) => {
                            const seats = availability[schedule.schedule_id];
                            const canBook =
                              seats?.is_bookable === true &&
                              !seats?.availability_error;

                            return (
                              <div
                                key={schedule.schedule_id}
                                className="rounded-xl border border-slate-200 p-4"
                              >
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                  <CalendarDays
                                    size={17}
                                    className="text-teal-700"
                                  />
                                  <span>Departure</span>
                                </div>

                                <p className="mt-1 text-sm text-slate-600">
                                  {formatDateTime(
                                    schedule.departure_datetime
                                  )}
                                </p>

                                <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                                  <Clock
                                    size={17}
                                    className="text-teal-700"
                                  />
                                  <span>Return</span>
                                </div>

                                <p className="mt-1 text-sm text-slate-600">
                                  {formatDateTime(schedule.return_datetime)}
                                </p>

                                <div className="mt-3 flex items-center gap-2 text-sm">
                                  <Users
                                    size={17}
                                    className="text-teal-700"
                                  />

                                  {seats?.availability_error ? (
                                    <span className="text-amber-700">
                                      {seats.availability_error}
                                    </span>
                                  ) : seats ? (
                                    <span
                                      className={
                                        seats.available_seats > 0
                                          ? "font-semibold text-green-700"
                                          : "font-semibold text-red-600"
                                      }
                                    >
                                      {seats.available_seats} seats available
                                      out of {seats.max_capacity}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">
                                      Checking seats...
                                    </span>
                                  )}
                                </div>

                                <p className="mt-2 text-xs text-slate-500">
                                  Schedule status:{" "}
                                  {schedule.schedule_status}
                                </p>

                                <button
                                  type="button"
                                  disabled={!canBook}
                                  onClick={() =>
                                    window.alert(
                                      "Schedule selected. The booking form will be added in the next step."
                                    )
                                  }
                                  className="mt-4 w-full rounded-lg border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                                >
                                  {canBook
                                    ? "Select This Schedule"
                                    : "Currently Unavailable"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

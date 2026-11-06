import { useEffect, useState } from "react";
import { X, RefreshCw, MapPin, Users, CalendarDays } from "lucide-react";
import { getOngoingTourOverview } from "../services/api";

const formatDateTime = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-BD", {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

export default function OngoingTourOverview({ type, onClose }) {
  const [data, setData] = useState({ ongoing_tours: [], passengers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getOngoingTourOverview()
      .then((result) => {
        if (active) setData(result || { ongoing_tours: [], passengers: [] });
      })
      .catch((err) => {
        if (active) setError(err.message || "Could not load ongoing tour details.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const showTours = type === "tours";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ongoing-overview-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Live tour operations
            </p>
            <h2 id="ongoing-overview-title" className="mt-1 text-xl font-bold text-slate-900">
              {showTours ? "Ongoing tours" : "Passengers on tour"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {showTours
                ? "Confirmed bookings for tours that are currently in progress."
                : "Passenger information for confirmed bookings on tours currently in progress."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close overview"
          >
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
              <RefreshCw className="animate-spin" size={18} />
              Loading tour information...
            </div>
          ) : error ? (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {error}
            </div>
          ) : showTours ? (
            data.ongoing_tours?.length ? (
              <div className="space-y-4">
                {data.ongoing_tours.map((tour) => (
                  <article key={tour.schedule_id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <h3 className="font-bold text-slate-900">{tour.package_name}</h3>
                        <p className="mt-1 text-xs text-slate-500">Schedule #{tour.schedule_id}</p>
                      </div>
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
                        <Users size={13} /> {tour.passenger_count} passengers
                      </span>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p className="flex items-center gap-2"><CalendarDays size={15} /> Departure: {formatDateTime(tour.departure_datetime)}</p>
                      <p className="flex items-center gap-2"><CalendarDays size={15} /> Return: {formatDateTime(tour.return_datetime)}</p>
                    </div>
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Confirmed bookings</p>
                      {tour.bookings?.length ? tour.bookings.map((booking) => (
                        <div key={booking.booking_id} className="flex flex-col justify-between gap-1 border-b border-slate-50 py-2 last:border-0 sm:flex-row">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{booking.booking_reference}</p>
                            <p className="text-xs text-slate-500">{booking.customer_name} · {booking.customer_phone || "No phone"}</p>
                          </div>
                          <p className="text-xs font-medium text-slate-600">{booking.number_of_travelers} traveler(s)</p>
                        </div>
                      )) : <p className="text-sm text-slate-500">No confirmed booking details.</p>}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="py-14 text-center text-sm text-slate-500">There are no tours in progress right now.</p>
            )
          ) : (
            data.passengers?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Passenger</th>
                      <th className="px-3 py-3">Phone</th>
                      <th className="px-3 py-3">Package</th>
                      <th className="px-3 py-3">Booking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.passengers.map((passenger, index) => (
                      <tr key={`${passenger.booking_id}-${passenger.traveler_id ?? index}`}>
                        <td className="px-3 py-3 font-medium text-slate-800">{passenger.full_name}</td>
                        <td className="px-3 py-3 text-slate-600">{passenger.phone_number || "—"}</td>
                        <td className="px-3 py-3 text-slate-600">{passenger.package_name}</td>
                        <td className="px-3 py-3 text-slate-600">{passenger.booking_reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-14 text-center text-sm text-slate-500">No passenger records are available for tours in progress.</p>
            )
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500">
          <span>{showTours ? `${data.ongoing_tour_count ?? 0} ongoing tour(s)` : `${data.passenger_count ?? 0} passenger(s)`}</span>
          <button type="button" onClick={onClose} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700">
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}

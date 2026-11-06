
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { getPackages, getSchedules, getScheduleAvailability, createBooking } from "../services/api";
import PackageReviews from "../components/PackageReviews";

export default function PackageDetails() {
  const { packageId } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [availability, setAvailability] = useState({});
  const [bookingScheduleId, setBookingScheduleId] = useState(null);
  const [bookingTravelers, setBookingTravelers] = useState("1");
  const [bookingSpecialRequest, setBookingSpecialRequest] = useState("");
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingSuccessScheduleId, setBookingSuccessScheduleId] = useState(null);

  // Only customers (and guests, who will be asked to log in) can see booking actions.
  let currentUser = null;
  try {
    currentUser = JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    currentUser = null;
  }
  const canBook = !currentUser || currentUser.role_name === "CUSTOMER";

  useEffect(() => {
    let active = true;

    async function loadDetails() {
      setLoading(true);
      setError("");

      try {
        const data = await getPackages();
        const packages = Array.isArray(data)
          ? data
          : data?.packages ?? data?.value ?? [];

        const selected = packages.find(
          (p) => String(p.package_id) === String(packageId)
        );

        if (!selected || selected.package_status !== "ACTIVE") {
          throw new Error("This tour package is unavailable.");
        }

        const scheduleData = await getSchedules(packageId);
         const scheduleList = (
  Array.isArray(scheduleData)
    ? scheduleData
    : scheduleData?.schedules ?? scheduleData?.value ?? []
).filter((schedule) => {
  if (!schedule.departure_datetime) return false;

  return new Date(schedule.departure_datetime) > new Date();
});
        if (active) {
          setItem(selected);
          setSchedules(scheduleList);

          const availabilityResults = await Promise.all(
            scheduleList.map(async (schedule) => {
              try {
                const result = await getScheduleAvailability(schedule.schedule_id);
                return [schedule.schedule_id, result];
              } catch {
                return [
                  schedule.schedule_id,
                  { availability_error: "Seat availability could not be loaded." },
                ];
              }
            })
          );

          if (active) {
            setAvailability(Object.fromEntries(availabilityResults));
          }
        }
      } catch (err) {
        if (active) setError(err.message || "Could not load package details.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDetails();

    return () => {
      active = false;
    };
  }, [packageId]);

  async function handleBooking(schedule) {
    const token = sessionStorage.getItem("access_token");

    let user = null;
    try {
      user = JSON.parse(sessionStorage.getItem("user") || "null");
    } catch {
      user = null;
    }

    if (!token || !user || user.role_name !== "CUSTOMER") {
      navigate("/login");
      return;
    }

    setBookingScheduleId(schedule.schedule_id);
    setBookingTravelers("1");
    setBookingSpecialRequest("");
    setBookingError("");
    setBookingMessage("");
  }

  async function submitBooking(event, schedule) {
    event.preventDefault();

    const seats = availability[schedule.schedule_id];
    const travelerCount = Number(bookingTravelers);

    if (!Number.isInteger(travelerCount) || travelerCount < 1) {
      setBookingError("Enter a valid number of travelers.");
      return;
    }

    if (
      seats?.available_seats != null &&
      travelerCount > Number(seats.available_seats)
    ) {
      setBookingError(`Only ${seats.available_seats} seats are currently available.`);
      return;
    }

    setBookingSaving(true);
    setBookingError("");
    setBookingMessage("");

    try {
      const result = await createBooking({
        package_id: item.package_id,
        schedule_id: schedule.schedule_id,
        number_of_travelers: travelerCount,
        special_request: bookingSpecialRequest.trim(),
      });

      setBookingMessage(
        `Booking successful! Reference: ${result.booking_reference}. Total: ৳${Number(
          result.total_amount
        ).toLocaleString("en-BD")}. Status: ${result.status_name || "Pending"}.`
      );
      setBookingSuccessScheduleId(schedule.schedule_id);
      setBookingScheduleId(null);
      setBookingTravelers("1");
      setBookingSpecialRequest("");
    } catch (err) {
      setBookingError(err.message || "Could not create booking.");
    } finally {
      setBookingSaving(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-50 p-10">Loading package details...</main>;
  }

  if (error || !item) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-12">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8">
          <p className="text-red-600">{error || "Package not found."}</p>
          <Link to="/" className="mt-4 inline-block font-semibold text-teal-700">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 font-semibold text-teal-700"
        >
          <ArrowLeft size={18} /> Back
        </button>

        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <img
            src={item.image_url || "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80"}
            alt={item.package_name}
            className="h-64 w-full object-cover sm:h-96"
          />

          <div className="p-6 sm:p-9">
            <p className="text-sm font-bold uppercase tracking-widest text-teal-700">
              {item.package_code}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              {item.package_name}
            </h1>

            <p className="mt-5 whitespace-pre-line leading-7 text-slate-600">
              {item.description || "Discover a memorable travel experience."}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <Clock className="mb-2 text-teal-700" />
                <p className="text-sm text-slate-500">Duration</p>
                <p className="font-bold">{item.duration_days} days / {item.duration_nights} nights</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <MapPin className="mb-2 text-teal-700" />
                <p className="text-sm text-slate-500">Tour package</p>
                <p className="font-bold">{item.package_name}</p>
              </div>
              <div className="rounded-xl bg-teal-50 p-4">
                <p className="text-sm text-slate-600">Starting price</p>
                <p className="mt-1 text-2xl font-extrabold text-teal-800">
                  ৳{Number(item.base_price).toLocaleString("en-BD")}
                </p>
              </div>
            </div>

            <section className="mt-9">
              <h2 className="text-2xl font-bold text-slate-900">Available departures</h2>

              {schedules.length === 0 ? (
                <p className="mt-3 rounded-xl bg-slate-50 p-4 text-slate-600">
                  No departure schedules are currently available.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {schedules.map((schedule) => (
                    <>
                    <div
                      key={schedule.schedule_id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          <CalendarDays className="mr-2 inline text-teal-700" size={18} />
                          {schedule.departure_datetime
                            ? new Date(schedule.departure_datetime).toLocaleString()
                            : "Departure date unavailable"}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          Return: {schedule.return_datetime
                            ? new Date(schedule.return_datetime).toLocaleString()
                            : "Not specified"}
                        </p>
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <Users size={17} className="text-teal-700" />
                          {availability[schedule.schedule_id]?.availability_error ? (
                            <span className="text-amber-700">
                              {availability[schedule.schedule_id].availability_error}
                            </span>
                          ) : availability[schedule.schedule_id] ? (
                            <span className="font-semibold text-green-700">
                              {availability[schedule.schedule_id].available_seats} seats available
                              out of {availability[schedule.schedule_id].max_capacity}
                            </span>
                          ) : (
                            <span className="text-slate-500">Checking seat availability...</span>
                          )}
                        </div>
                      </div>
                      {canBook && (
                        <button
                          type="button"
                          onClick={() => handleBooking(schedule)}
                          disabled={
                            availability[schedule.schedule_id]?.is_bookable === false ||
                            bookingSaving
                          }
                          className="rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {sessionStorage.getItem("access_token")
                            ? "Book This Schedule"
                            : "Login to Book"}
                        </button>
                      )}
                    </div>

                    {bookingScheduleId === schedule.schedule_id && (
                      <form
                        onSubmit={(event) => submitBooking(event, schedule)}
                        className="mt-3 space-y-3 rounded-xl bg-slate-50 p-4"
                      >
                        <h3 className="font-semibold text-slate-900">Confirm your booking</h3>
                        <label className="block text-sm font-medium text-slate-700">
                          Number of travelers
                          <input
                            type="number"
                            min="1"
                            max={availability[schedule.schedule_id]?.available_seats || 1}
                            required
                            value={bookingTravelers}
                            onChange={(event) => setBookingTravelers(event.target.value)}
                            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                          />
                        </label>
                        <p className="text-sm text-slate-600">
                          Estimated total: ৳{(
                            Number(item.base_price || 0) *
                            Math.max(1, Number(bookingTravelers) || 1)
                          ).toLocaleString("en-BD")}
                        </p>
                        <label className="block text-sm font-medium text-slate-700">
                          Special request (optional)
                          <textarea
                            rows="2"
                            maxLength={1000}
                            value={bookingSpecialRequest}
                            onChange={(event) => setBookingSpecialRequest(event.target.value)}
                            placeholder="Any special requirements?"
                            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                          />
                        </label>
                        {bookingError && (
                          <p className="text-sm text-red-700">{bookingError}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            disabled={bookingSaving}
                            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            {bookingSaving ? "Creating booking..." : "Confirm Booking"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBookingScheduleId(null);
                              setBookingError("");
                            }}
                            disabled={bookingSaving}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}

                    {bookingMessage &&
                      bookingScheduleId === null &&
                      bookingSuccessScheduleId === schedule.schedule_id && (
                      <p className="mt-3 whitespace-pre-line text-sm font-medium text-green-700">
                        {bookingMessage}
                      </p>
                    )}
                    </>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-9">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">Customer reviews</h2>
              <PackageReviews packageId={item.package_id} />
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}

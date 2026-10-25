
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock, MapPin } from "lucide-react";
import { getPackages, getSchedules } from "../services/api";
import PackageReviews from "../components/PackageReviews";

export default function PackageDetails() {
  const { packageId } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        const scheduleList = Array.isArray(scheduleData)
          ? scheduleData
          : scheduleData?.schedules ?? scheduleData?.value ?? [];

        if (active) {
          setItem(selected);
          setSchedules(scheduleList);
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

  function handleBooking() {
    const token = sessionStorage.getItem("access_token");
    const user = JSON.parse(sessionStorage.getItem("user") || "null");

    if (!token || user?.role_name !== "CUSTOMER") {
      navigate("/login");
      return;
    }

    // Continue to the existing booking workflow.
    navigate("/packages");
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
                      </div>
                      <button
                        onClick={handleBooking}
                        className="rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800"
                      >
                        Continue to booking
                      </button>
                    </div>
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

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  CalendarDays,
  Compass,
  Sparkles,
  Clock3,
  Package,
  LoaderCircle,
  Mountain,
} from "lucide-react";
import { getDestinations, getPackages } from "../services/api";

const fallbackHero =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85";

const fallbackPackageImages = [
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=900&q=85",
];

function getList(data, keys = []) {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
}

function getDestinationIds(pkg) {
  const ids = new Set();

  const addId = (value) => {
    const id =
      value && typeof value === "object"
        ? value.destination_id ?? value.id
        : value;

    if (id !== undefined && id !== null && id !== "") {
      ids.add(String(id));
    }
  };

  if (Array.isArray(pkg.destination_ids)) {
    pkg.destination_ids.forEach(addId);
  }

  if (Array.isArray(pkg.destinations)) {
    pkg.destinations.forEach(addId);
  }

  if (Array.isArray(pkg.package_destinations)) {
    pkg.package_destinations.forEach(addId);
  }

  if (pkg.destination_id != null) {
    addId(pkg.destination_id);
  }

  return ids;
}

export default function DestinationDetails() {
  const { destinationId } = useParams();
  const navigate = useNavigate();

  const [destination, setDestination] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDestination() {
      setLoading(true);
      setError("");

      try {
        const data = await getDestinations();
        const destinations = getList(data, ["destinations", "value"]);

        const selected = destinations.find(
          (item) =>
            String(item.destination_id) === String(destinationId)
        );

        if (!selected) {
          throw new Error("Destination not found.");
        }

        if (active) {
          setDestination(selected);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Could not load destination.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    async function loadPackages() {
      setPackagesLoading(true);

      try {
        const data = await getPackages();
        const items = getList(data, ["packages", "value"]);

        if (active) {
          setPackages(
            items.filter(
              (item) =>
                String(
                  item.package_status || item.status || ""
                ).toUpperCase() === "ACTIVE"
            )
          );
        }
      } catch (err) {
        console.error("Could not load packages:", err);
      } finally {
        if (active) setPackagesLoading(false);
      }
    }

    loadDestination();
    loadPackages();

    return () => {
      active = false;
    };
  }, [destinationId]);

  const destinationPackages = packages.filter((pkg) =>
    getDestinationIds(pkg).has(String(destinationId))
  );

  function handlePackageClick(pkg) {
    const token = sessionStorage.getItem("access_token");
    let user = null;

    try {
      user = JSON.parse(sessionStorage.getItem("user") || "null");
    } catch {
      user = null;
    }

    if (!token || !user) {
      navigate("/login");
      return;
    }

    navigate(`/packages/${pkg.package_id}`);
  }

  if (loading) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-5 shadow-lg">
          <LoaderCircle className="animate-spin text-teal-700" size={24} />
          <span className="font-semibold text-slate-600">
            Loading destination...
          </span>
        </div>
      </main>
    );
  }

  if (error || !destination) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center bg-slate-50 px-5">
        <div className="max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <MapPin size={42} className="mx-auto text-teal-700" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">
            Destination unavailable
          </h1>
          <p className="mt-2 text-slate-600">
            {error || "Destination not found."}
          </p>
          <Link
            to="/destinations"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 font-bold text-white transition hover:bg-teal-800"
          >
            <ArrowLeft size={17} />
            Browse destinations
          </Link>
        </div>
      </main>
    );
  }

  const location = [
    destination.upazila,
    destination.district,
    destination.division,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-screen overflow-hidden bg-slate-50">
      {/* Destination hero */}
      <section className="relative isolate min-h-[470px] overflow-hidden bg-teal-950 sm:min-h-[560px]">
        <img
          src={destination.image_url || fallbackHero}
          alt={destination.name}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />

        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/15" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-teal-950/60 via-transparent to-transparent" />

        <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full border border-white/15" />
        <div className="pointer-events-none absolute -right-5 -top-5 -z-10 h-52 w-52 rounded-full border border-white/10" />

        <div className="relative mx-auto flex min-h-[470px] max-w-7xl flex-col justify-between px-5 py-8 sm:min-h-[560px] sm:py-10 lg:px-8">
          <Link
            to="/destinations"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-black/20 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
          >
            <ArrowLeft size={17} />
            All destinations
          </Link>

          <div className="max-w-4xl pb-5">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-teal-100 backdrop-blur-md">
              <Compass size={16} />
              Discover Bangladesh
            </div>

            <p className="flex items-center gap-2 text-sm font-semibold text-white/85 sm:text-base">
              <MapPin size={18} />
              {location || "Bangladesh"}
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
              {destination.name}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-white/85 sm:text-lg">
              {destination.description ||
                `Discover the beauty, culture, and memorable experiences of ${destination.name}.`}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#destination-packages"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-5 py-3 font-bold text-teal-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-200"
              >
                Explore tour packages
                <ArrowRight size={18} />
              </a>

              <span className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur">
                <Mountain size={17} />
                Explore local experiences
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Destination info ribbon */}
      <section className="relative z-10 mx-auto -mt-5 max-w-7xl px-5 lg:px-8">
        <div className="grid overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/5 sm:grid-cols-3">
          <div className="flex items-center gap-4 border-b border-slate-100 p-5 sm:border-b-0 sm:border-r">
            <div className="rounded-xl bg-teal-50 p-3 text-teal-700">
              <MapPin size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Location
              </p>
              <p className="mt-1 font-bold text-slate-900">
                {destination.district || destination.division || "Bangladesh"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-b border-slate-100 p-5 sm:border-b-0 sm:border-r">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
              <Compass size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Destination
              </p>
              <p className="mt-1 font-bold text-slate-900">
                {destination.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-cyan-50 p-3 text-cyan-700">
              <Package size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Tour packages
              </p>
              <p className="mt-1 font-bold text-slate-900">
                {destinationPackages.length} available
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Description / about section */}
      <section className="relative py-16 sm:py-20">
        <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-teal-100/50 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[1fr_0.7fr] lg:items-center lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
              <Sparkles size={14} />
              About this place
            </p>

            <h2 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
              A destination worth
              <span className="text-teal-700"> experiencing.</span>
            </h2>

            <p className="mt-5 whitespace-pre-line text-base leading-8 text-slate-600">
              {destination.description ||
                `Plan a memorable visit to ${destination.name} and discover its unique atmosphere, scenery, and local experiences.`}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {destination.district && (
                <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                  District: {destination.district}
                </span>
              )}
              {destination.division && (
                <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                  Division: {destination.division}
                </span>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-3 -top-3 h-full w-full rounded-3xl bg-amber-200/60" />
            <div className="relative overflow-hidden rounded-3xl border-4 border-white shadow-2xl">
              <img
                src={destination.image_url || fallbackHero}
                alt={`${destination.name} landscape`}
                className="h-72 w-full object-cover sm:h-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <p className="text-sm font-medium text-white/80">
                  Your next getaway
                </p>
                <h3 className="mt-1 text-2xl font-extrabold">
                  {destination.name}
                </h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related packages */}
      <section
        id="destination-packages"
        className="scroll-mt-24 bg-gradient-to-b from-white via-slate-50 to-teal-50/40 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-teal-800">
                <CalendarDays size={14} />
                Plan your trip
              </p>

              <h2 className="mt-4 text-3xl font-extrabold text-slate-900 sm:text-4xl">
                Tours in {destination.name}
              </h2>

              <p className="mt-3 max-w-2xl leading-7 text-slate-500">
                Choose a package to explore its itinerary, departure dates,
                reviews, and booking options.
              </p>
            </div>

            <Link
              to="/packages"
              className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-4 py-3 text-sm font-bold text-teal-800 shadow-sm transition hover:bg-teal-50"
            >
              All packages
              <ArrowRight size={16} />
            </Link>
          </div>

          {packagesLoading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
              <LoaderCircle className="animate-spin text-teal-700" size={22} />
              Loading tour packages...
            </div>
          ) : destinationPackages.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                <Package size={30} />
              </div>
              <h3 className="mt-4 text-xl font-extrabold text-slate-900">
                No packages available yet
              </h3>
              <p className="mx-auto mt-2 max-w-lg leading-6 text-slate-500">
                There are currently no active tour packages linked to this
                destination. Check back later for new trips.
              </p>
              <Link
                to="/packages"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 font-bold text-white transition hover:bg-teal-800"
              >
                Browse all packages
                <ArrowRight size={17} />
              </Link>
            </div>
          ) : (
            <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
              {destinationPackages.map((pkg, index) => (
                <article
                  key={pkg.package_id}
                  className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-md shadow-slate-900/5 transition duration-300 hover:-translate-y-2 hover:border-teal-200 hover:shadow-2xl hover:shadow-teal-900/10"
                >
                  <button
                    type="button"
                    onClick={() => handlePackageClick(pkg)}
                    className="block w-full text-left focus:outline-none focus:ring-4 focus:ring-inset focus:ring-teal-500/30"
                  >
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={
                          pkg.image_url ||
                          fallbackPackageImages[
                            index % fallbackPackageImages.length
                          ]
                        }
                        alt={pkg.package_name || "Tour package"}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                      <span className="absolute left-4 top-4 rounded-full border border-white/40 bg-white/90 px-3 py-1.5 text-xs font-bold text-teal-900 shadow-sm">
                        <span className="inline-flex items-center gap-1.5">
                          <Sparkles size={13} />
                          Featured tour
                        </span>
                      </span>

                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <p className="text-xs font-semibold uppercase tracking-wider text-white/75">
                          {pkg.package_code || "TravelMate package"}
                        </p>
                        <h3 className="mt-1 text-xl font-extrabold drop-shadow">
                          {pkg.package_name || pkg.name || "Tour Package"}
                        </h3>
                      </div>
                    </div>

                    <div className="p-5">
                      <p className="line-clamp-2 min-h-[3rem] text-sm leading-6 text-slate-600">
                        {pkg.description ||
                          "Discover this destination with a memorable travel experience."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                          <Clock3 size={14} className="text-teal-700" />
                          {pkg.duration_days ?? "—"} days /{" "}
                          {pkg.duration_nights ?? "—"} nights
                        </span>
                      </div>

                      <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
                        <div>
                          <p className="text-xs font-medium text-slate-500">
                            Starting from
                          </p>
                          <p className="mt-1 text-2xl font-extrabold text-teal-700">
                            ৳
                            {Number(
                              pkg.base_price ?? pkg.price ?? 0
                            ).toLocaleString("en-BD")}
                          </p>
                        </div>

                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700 transition group-hover:bg-teal-700 group-hover:text-white">
                          <ArrowRight size={18} />
                        </span>
                      </div>
                    </div>
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Closing banner */}
      <section className="px-5 py-14">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-r from-teal-950 via-teal-800 to-emerald-700 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-4 -top-12 h-44 w-44 rounded-full border border-white/10" />

          <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-200">
                Ready for your next adventure?
              </p>
              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                Make {destination.name} your next memory.
              </h2>
            </div>

            <Link
              to="/packages"
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-amber-300 px-5 py-3 font-bold text-teal-950 transition hover:-translate-y-0.5 hover:bg-amber-200"
            >
              Explore packages
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Search,
  Star,
  Compass,
  ShieldCheck,
  Headphones,
} from "lucide-react";
import {
  getDestinations,
  getPackages,
  getSchedules,
} from "../services/api";
import { useNavigate } from "react-router-dom";

const destinationImages = [
  "photo-1544551763-46a013bb70d5",
  "photo-1464822759023-fed622ff2c3b",
  "photo-1500530855697-b586d89ba3ee",
];

const packageImages = [
  "photo-1464822759023-fed622ff2c3b",
  "photo-1501785888041-af3ef285b470",
  "photo-1510414842594-a61c69b5ae57",
];

function photoUrl(photoId, width = 900) {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&q=80`;
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="mb-9">
      <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-teal-700">
        {eyebrow}
      </p>

      <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
        {title}
      </h2>

      <p className="mt-3 max-w-2xl leading-7 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function normalizeSearch(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "");
}

function unwrapList(data, keys = []) {
  if (Array.isArray(data)) {
    return data;
  }

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  return [];
}

// Read destination relationships when the API provides them.
// Supports common shapes: destination_ids, destinations,
// package_destinations, and destination objects.
function getPackageDestinationIds(item) {
  const ids = new Set();

  const addId = (value) => {
    const id =
      typeof value === "object" && value !== null
        ? value.destination_id ?? value.id
        : value;

    if (id !== undefined && id !== null && id !== "") {
      ids.add(String(id));
    }
  };

  if (Array.isArray(item.destination_ids)) {
    item.destination_ids.forEach(addId);
  }

  if (Array.isArray(item.destinations)) {
    item.destinations.forEach(addId);
  }

  if (Array.isArray(item.package_destinations)) {
    item.package_destinations.forEach(addId);
  }

  if (item.destination_id != null) {
    addId(item.destination_id);
  }

  return ids;
}

function getPackageDestinationNames(item) {
  const names = [];

  const addName = (value) => {
    if (typeof value === "string") {
      names.push(value);
      return;
    }

    if (value && typeof value === "object") {
      if (value.name) names.push(value.name);
      if (value.destination_name) names.push(value.destination_name);
    }
  };

  if (Array.isArray(item.destinations)) {
    item.destinations.forEach(addName);
  }

  if (Array.isArray(item.package_destinations)) {
    item.package_destinations.forEach(addName);
  }

  if (Array.isArray(item.destination_names)) {
    item.destination_names.forEach(addName);
  }

  return names;
}

function isScheduledOnDate(schedule, travelDate) {
  if (!travelDate) {
    return true;
  }

  if (
    String(schedule.schedule_status || "").toUpperCase() !== "SCHEDULED"
  ) {
    return false;
  }

  if (!schedule.departure_datetime) {
    return false;
  }

  // Compare the date portion returned by the API.
  // Works with ISO values such as 2026-11-10T09:00:00.
  return String(schedule.departure_datetime).slice(0, 10) === travelDate;
}

export default function Home() {
  const [destinations, setDestinations] = useState([]);
  const [packages, setPackages] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [travelDate, setTravelDate] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [destinationData, packageData, scheduleData] =
          await Promise.all([
            getDestinations(),
            getPackages(),
            getSchedules().catch((scheduleError) => {
              console.error("Failed to load schedules:", scheduleError);
              return [];
            }),
          ]);

        if (!active) return;

        setDestinations(
          unwrapList(destinationData, ["value", "destinations"])
        );

        setPackages(
          unwrapList(packageData, ["value", "packages"])
        );

        setSchedules(
          unwrapList(scheduleData, ["schedules", "value"])
        );
      } catch (loadError) {
        console.error("Failed to load homepage data:", loadError);

        if (active) {
          setError(
            "Unable to load live data. Check that Flask is running on port 5000."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  // Keep the existing login requirement for opening packages.
  function handlePackageClick(item) {
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

    navigate("/packages", {
      state: {
        destination: search.trim(),
        travelDate,
        packageId: item?.package_id ?? null,
      },
    });
  }

  const query = normalizeSearch(search);

  // Destination cards match the typed destination, district, or division.
  const visibleDestinations = destinations.filter((destination) => {
    if (!query) return true;

    return [
      destination.name,
      destination.district,
      destination.division,
    ].some((value) => normalizeSearch(value).includes(query));
  });

  // Find the IDs and names of destinations matching the search.
  const matchingDestinationIds = new Set(
    visibleDestinations
      .map((destination) => destination.destination_id)
      .filter((id) => id != null)
      .map(String)
  );

  const matchingDestinationNames = visibleDestinations
    .map((destination) => destination.name)
    .filter(Boolean)
    .map(normalizeSearch);

  // Packages must match every filter the customer has entered.
  const visiblePackages = packages.filter((item) => {
    // Keep only active packages.
    if (
      String(item.package_status || "").toUpperCase() !== "ACTIVE"
    ) {
      return false;
    }

    // Filter by destination when a destination was entered.
    if (query) {
      const packageDestinationIds = getPackageDestinationIds(item);
      const packageDestinationNames = getPackageDestinationNames(item)
        .map(normalizeSearch);

      const matchesById = [...packageDestinationIds].some((id) =>
        matchingDestinationIds.has(id)
      );

      const matchesByName = packageDestinationNames.some((name) =>
        matchingDestinationNames.some(
          (destinationName) =>
            destinationName &&
            (name.includes(destinationName) ||
              destinationName.includes(name))
        )
      );

      if (!matchesById && !matchesByName) {
        return false;
      }
    }

    // Filter by departure date when a date was selected.
    if (travelDate) {
      const hasMatchingSchedule = schedules.some((schedule) => {
        return (
          String(schedule.package_id) === String(item.package_id) &&
          isScheduledOnDate(schedule, travelDate)
        );
      });

      if (!hasMatchingSchedule) {
        return false;
      }
    }

    return true;
  });

  function handleSearchSubmit(event) {
    event.preventDefault();

    document
      .getElementById("packages")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearSearch() {
    setSearch("");
    setTravelDate("");
  }

  const hasSearch = Boolean(search.trim() || travelDate);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Hero section */}
      <section className="relative isolate overflow-hidden bg-slate-950">
        <img
          src={photoUrl("photo-1500534623283-312aade485b7", 2000)}
          alt="Beautiful mountain landscape"
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />

        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-slate-950/15" />

        <div className="mx-auto grid min-h-[580px] max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur">
              <Compass size={17} />
              Your next adventure starts here
            </div>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Discover Bangladesh,
              <span className="mt-2 block text-teal-300">
                one journey at a time.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-200 sm:text-lg">
              Find amazing destinations, explore thoughtfully designed tour
              packages, and make your next trip unforgettable.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="#packages"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-3.5 font-bold text-white transition hover:bg-teal-400"
              >
                Explore packages <ArrowRight size={18} />
              </a>

              <a
                href="#destinations"
                className="rounded-xl border border-white/40 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10"
              >
                Discover places
              </a>
            </div>
          </div>

          {/* Search form */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm rounded-3xl border border-white/30 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-xl">
              <p className="text-sm font-medium text-teal-200">
                PLAN YOUR JOURNEY
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Where would you like to go?
              </h2>

              <form className="mt-6 space-y-4" onSubmit={handleSearchSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-200">
                    Destination
                  </span>

                  <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-slate-700">
                    <MapPin size={19} className="shrink-0 text-teal-700" />

                    <input
                      type="text"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search a destination"
                      className="w-full min-w-0 bg-transparent text-sm outline-none"
                    />
                  </div>
                </label>

                <label className="block min-w-0">
                  <span className="mb-2 block text-sm text-slate-200">
                    Travel Date
                  </span>

                  <div className="flex min-w-0 items-center gap-3 rounded-xl bg-white px-4 py-3 text-slate-700">
                    <CalendarDays
                      size={19}
                      className="shrink-0 text-teal-700"
                    />

                    <input
                      type="date"
                      value={travelDate}
                      min={new Date().toLocaleDateString("en-CA")}
                      onChange={(event) => setTravelDate(event.target.value)}
                      className="block w-full min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-3.5 font-bold transition hover:bg-teal-400"
                >
                  <Search size={18} />
                  Search packages
                </button>

                {hasSearch && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="w-full rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Clear search
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:grid-cols-3 lg:px-8">
          {[
            {
              icon: ShieldCheck,
              title: "Trusted planning",
              detail: "Organized travel information",
            },
            {
              icon: Compass,
              title: "Local discoveries",
              detail: "Explore places across Bangladesh",
            },
            {
              icon: Headphones,
              title: "Helpful support",
              detail: "A smoother booking experience",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-4">
              <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
                <item.icon size={25} />
              </div>

              <div>
                <h3 className="font-bold">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Destinations */}
      <section id="destinations" className="scroll-mt-24 py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Explore Bangladesh"
            title="Popular destinations"
            description="Discover places worth visiting, from peaceful green hills to the beautiful coast."
          />

          {error && (
            <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-slate-500">
              Loading destinations from Flask...
            </p>
          ) : visibleDestinations.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-6 text-slate-600">
              No destinations match your search.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visibleDestinations.map((destination, index) => (
                <article
                  key={destination.destination_id ?? destination.name}
                  onClick={() => {
                    if (destination.destination_id != null) {
                      navigate(`/destinations/${destination.destination_id}`);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      (event.key === "Enter" || event.key === " ") &&
                      destination.destination_id != null
                    ) {
                      event.preventDefault();
                      navigate(`/destinations/${destination.destination_id}`);
                    }
                  }}
                  role="link"
                  tabIndex={0}
                  className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={
                        destination.image_url ||
                        photoUrl(
                          destinationImages[index % destinationImages.length]
                        )
                      }
                      alt={destination.name || "Travel destination"}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />

                    <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-teal-800">
                      {destination.status || "Destination"}
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-xl font-bold">
                        {destination.name}
                      </h3>

                      <MapPin
                        size={19}
                        className="shrink-0 text-teal-700"
                      />
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {[destination.district, destination.division]
                        .filter(Boolean)
                        .join(", ")}
                    </p>

                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">
                      {destination.description || "Explore this destination."}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured packages */}
      <section id="packages" className="scroll-mt-24 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Find your experience"
            title="Featured tour packages"
            description="Explore available packages from our travel management system."
          />

          {hasSearch && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">
                  Search filters:
                </span>

                {search.trim() && (
                  <span className="ml-2">
                    Destination: {search.trim()}
                  </span>
                )}

                {travelDate && (
                  <span className="ml-2">
                    Date: {travelDate}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={clearSearch}
                className="text-sm font-semibold text-teal-700 hover:text-teal-900"
              >
                Clear filters
              </button>
            </div>
          )}

          {loading ? (
            <p className="text-slate-500">Loading tour packages...</p>
          ) : packages.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
              No tour packages are available yet.
            </p>
          ) : visiblePackages.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
              No active packages match your selected destination and travel
              date. Try another destination or date.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visiblePackages.map((item, index) => (
                <article
                  key={item.package_id}
                  onClick={() => handlePackageClick(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handlePackageClick(item);
                    }
                  }}
                  role="link"
                  tabIndex={0}
                  className="cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-xl"
                >
                  <div className="relative h-52">
                    <img
                      src={
                        item.image_url ||
                        photoUrl(packageImages[index % packageImages.length])
                      }
                      alt={item.package_name || "Tour package"}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />

                    <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-800">
                      <Star
                        size={15}
                        className="fill-amber-400 text-amber-400"
                      />
                      Tour package
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-teal-700">
                      {item.package_code}
                    </p>

                    <h3 className="mt-2 text-xl font-bold">
                      {item.package_name}
                    </h3>

                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                      {item.description ||
                        "Discover a memorable travel experience."}
                    </p>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-xs text-slate-500">
                          Starting from
                        </p>

                        <p className="text-xl font-extrabold text-teal-700">
                          ৳{Number(item.base_price || 0).toLocaleString("en-BD")}
                        </p>
                      </div>

                      <span className="text-sm text-slate-600">
                        {item.duration_days}D / {item.duration_nights}N
                      </span>
                    </div>

                    {travelDate && (
                      <p className="mt-3 text-xs text-teal-700">
                        Has a scheduled departure on {travelDate}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* About */}
      <section id="about" className="scroll-mt-24 py-20">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-teal-700">
            About TravelMate
          </p>

          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            Making travel planning simpler
          </h2>

          <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-500">
            Our Travel Agency Management System brings destinations, tour
            packages, and booking information together in one place, helping
            travelers plan and manage their journeys more easily.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-8 text-center text-sm text-slate-400">
        <p>
          © {new Date().getFullYear()}. TravelMate. Travel thoughtfully.
        </p>
        <p className="mt-2">Travel Agency Management System</p>
      </footer>
    </main>
  );
}

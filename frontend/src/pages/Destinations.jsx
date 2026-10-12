import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, LoaderCircle } from "lucide-react";
import { getDestinations } from "../services/api";

export default function Destinations() {
  const [destinations, setDestinations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getDestinations()
      .then((data) => {
        setDestinations(Array.isArray(data) ? data : data.destinations || []);
      })
      .catch(() => setError("Could not load destinations. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return destinations.filter((destination) =>
      [destination.destination_name, destination.name, destination.description, destination.country]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [destinations, search]);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="font-semibold uppercase tracking-widest text-teal-700">
          Explore the world
        </p>
        <h1 className="mt-3 text-4xl font-bold text-slate-900 md:text-5xl">
          Discover Destinations
        </h1>
        <p className="mt-4 max-w-2xl text-slate-600">
          Find your next adventure from our available travel destinations.
        </p>

        <div className="mt-8 flex max-w-xl items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Search className="text-slate-400" size={21} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search destinations..."
            aria-label="Search destinations"
            className="w-full bg-transparent outline-none"
          />
        </div>

        {loading && (
          <p className="mt-10 flex items-center gap-2 text-slate-600">
            <LoaderCircle className="animate-spin" size={20} />
            Loading destinations...
          </p>
        )}

        {error && <p className="mt-8 text-red-600">{error}</p>}

        {!loading && !error && (
          <>
            <p className="mt-8 text-sm text-slate-500">
              {filtered.length} destination{filtered.length === 1 ? "" : "s"} found
            </p>

            {filtered.length === 0 ? (
              <p className="mt-6 rounded-xl bg-white p-8 text-slate-600">
                No destinations match your search.
              </p>
            ) : (
              <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((destination) => (
                  <article
                    key={destination.destination_id ?? destination.id ?? destination.name}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <span className="inline-flex rounded-xl bg-teal-50 p-3 text-teal-700">
                      <MapPin size={24} />
                    </span>
                    <h2 className="mt-4 text-xl font-bold text-slate-900">
                      {destination.destination_name ?? destination.name ?? "Destination"}
                    </h2>
                    {destination.country && (
                      <p className="mt-1 text-sm text-slate-500">{destination.country}</p>
                    )}
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {destination.description || "Explore this destination on your next trip."}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
import { useEffect, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { getPackages } from "../services/api";

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getPackages()
      .then((data) => {
        const items = Array.isArray(data) ? data : data?.value ?? data?.packages ?? [];
        setPackages(items.filter((item) => item.package_status === "ACTIVE"));
      })
      .catch((err) => {
        console.error("Failed to load packages:", err);
        setError("Could not load tour packages. Please try again.");
      })
      .finally(() => setLoading(false));
  }, []);

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

        {loading && <p className="mt-8 text-slate-600">Loading packages...</p>}
        {error && <p className="mt-8 text-red-600">{error}</p>}

        {!loading && !error && packages.length === 0 && (
          <p className="mt-8 rounded-xl bg-white p-6 text-slate-600">
            No active tour packages are available yet.
          </p>
        )}

        {!loading && !error && packages.length > 0 && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((item) => (
              <article
                key={item.package_id}
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
                    {item.description || "Discover a memorable travel experience."}
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-xs text-slate-500">Starting from</p>
                      <p className="text-xl font-extrabold text-teal-700">
                        ৳{Number(item.base_price).toLocaleString("en-BD")}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-sm text-slate-600">
                      <CalendarDays size={16} />
                      {item.duration_days}D / {item.duration_nights}N
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
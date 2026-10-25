
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { getDestinations } from "../services/api";

export default function DestinationDetails() {
  const { destinationId } = useParams();
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDestination() {
      try {
        const data = await getDestinations();
        const destinations = Array.isArray(data)
          ? data
          : data?.destinations ?? data?.value ?? [];

        const selected = destinations.find(
          (item) =>
            String(item.destination_id) === String(destinationId)
        );

        if (!selected) {
          throw new Error("Destination not found.");
        }

        if (active) setDestination(selected);
      } catch (err) {
        if (active) setError(err.message || "Could not load destination.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDestination();

    return () => {
      active = false;
    };
  }, [destinationId]);

  if (loading) {
    return <main className="p-10">Loading destination...</main>;
  }

  if (error || !destination) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-12">
        <p className="text-red-600">{error || "Destination not found."}</p>
        <Link to="/" className="mt-4 inline-block text-teal-700">
          Back to Home
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 font-semibold text-teal-700"
        >
          <ArrowLeft size={18} /> Back to Home
        </Link>

        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <img
            src={
              destination.image_url ||
              "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80"
            }
            alt={destination.name}
            className="h-64 w-full object-cover sm:h-96"
          />

          <div className="p-6 sm:p-9">
            <p className="flex items-center gap-2 text-sm font-semibold text-teal-700">
              <MapPin size={18} />
              {[destination.district, destination.division]
                .filter(Boolean)
                .join(", ") || "Bangladesh"}
            </p>

            <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              {destination.name}
            </h1>

            <p className="mt-5 whitespace-pre-line leading-8 text-slate-600">
              {destination.description || "Explore this beautiful destination in Bangladesh."}
            </p>

            <Link
              to="/packages"
              className="mt-8 inline-flex rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white hover:bg-teal-800"
            >
              Explore Tour Packages
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MapPin, Clock, Trash2, ArrowLeft } from "lucide-react";
import { getFavorites, getPackages, deleteFavoriteByPackage } from "../services/api";

export default function Wishlist() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    if (!sessionStorage.getItem("access_token")) {
      navigate("/login", { replace: true });
      return;
    }

    let active = true;
    async function loadWishlist() {
      setLoading(true);
      setError("");
      try {
        const [favoritesData, packagesData] = await Promise.all([
          getFavorites(),
          getPackages(),
        ]);
        const favorites = Array.isArray(favoritesData)
          ? favoritesData
          : favoritesData?.favorites ?? [];
        const packages = Array.isArray(packagesData)
          ? packagesData
          : packagesData?.packages ?? packagesData?.value ?? [];
        const packageMap = new Map(
          packages.map((item) => [Number(item.package_id), item])
        );
        const merged = favorites.map((favorite) => ({
          ...favorite,
          package: packageMap.get(Number(favorite.package_id)) || null,
        }));
        if (active) setItems(merged);
      } catch (err) {
        if (active) setError(err.message || "Could not load your wishlist.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadWishlist();
    return () => {
      active = false;
    };
  }, [navigate]);

  async function removeItem(packageId) {
    setRemovingId(packageId);
    setError("");
    try {
      await deleteFavoriteByPackage(packageId);
      setItems((current) =>
        current.filter((item) => Number(item.package_id) !== Number(packageId))
      );
    } catch (err) {
      setError(err.message || "Could not remove this package.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-r from-rose-700 via-pink-600 to-orange-500 px-6 py-9 text-white shadow-xl sm:px-10">
          <Link
            to="/packages"
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/85 transition hover:text-white"
          >
            <ArrowLeft size={17} /> Back to packages
          </Link>
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <Heart size={29} fill="currentColor" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-100">
                Your saved adventures
              </p>
              <h1 className="mt-1 text-3xl font-black sm:text-4xl">My Wishlist</h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
            Keep the trips you love in one place and come back when you're ready to explore.
          </p>
        </div>

        {error && (
          <p className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </p>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading your wishlist...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-rose-200 bg-white px-6 py-16 text-center shadow-sm">
            <Heart className="mx-auto text-rose-300" size={48} />
            <h2 className="mt-4 text-xl font-bold text-slate-900">Your wishlist is waiting</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Tap the heart on any tour package to save it here for later.
            </p>
            <Link
              to="/packages"
              className="mt-6 inline-flex rounded-xl bg-rose-600 px-5 py-3 font-semibold text-white shadow-md transition hover:bg-rose-700"
            >
              Explore packages
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-600">
                {items.length} saved {items.length === 1 ? "package" : "packages"}
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((favorite) => {
                const item = favorite.package;
                return (
                  <article
                    key={favorite.favorite_id}
                    className="group overflow-hidden rounded-3xl border border-white bg-white shadow-[0_12px_38px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    {item?.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.package_name || favorite.package_name}
                        className="h-52 w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-52 items-center justify-center bg-gradient-to-br from-rose-100 to-orange-100 text-rose-400">
                        <MapPin size={42} />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-rose-600">
                            {item?.package_code || "Saved package"}
                          </p>
                          <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                            {item?.package_name || favorite.package_name}
                          </h2>
                        </div>
                        <span className="rounded-full bg-rose-50 p-2 text-rose-600">
                          <Heart size={18} fill="currentColor" />
                        </span>
                      </div>
                      {item && (
                        <>
                          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                            {item.description || "Discover a memorable travel experience."}
                          </p>
                          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Clock size={15} />
                              {item.duration_days ?? "—"} days
                            </span>
                            {item.base_price != null && (
                              <span className="font-bold text-slate-900">
                                ৳{Number(item.base_price).toLocaleString("en-BD")}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                      <div className="mt-6 flex gap-3">
                        <Link
                          to="/packages"
                          className="inline-flex flex-1 items-center justify-center rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-800"
                        >
                          View package
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(favorite.package_id)}
                          disabled={removingId === favorite.package_id}
                          aria-label="Remove from wishlist"
                          title="Remove from wishlist"
                          className="inline-flex items-center justify-center rounded-xl border border-rose-200 px-4 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  LoaderCircle,
  Plus,
  Pencil,
  Trash2,
  X,
  ArrowRight,
  Compass,
  Sparkles,
  ImagePlus,
  Mountain,
} from "lucide-react";
import {
  getDestinations,
  createDestination,
  updateDestination,
  deleteDestination,
  uploadImage,
} from "../services/api";

const emptyForm = {
  name: "",
  division: "",
  district: "",
  upazila: "",
  description: "",
  latitude: "",
  longitude: "",
  image_url: "",
  status: "ACTIVE",
};

const fallbackImages = [
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1000&q=85",
];

export default function Destinations() {
  const navigate = useNavigate();

  const [destinations, setDestinations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const token = sessionStorage.getItem("access_token");

  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  const role = user?.role_name;
  const userId = Number(user?.user_id);

  const canManage = Boolean(
    token && ["STAFF", "HIGHER_ADMIN"].includes(role)
  );

  async function loadDestinations() {
    setLoading(true);
    setError("");

    try {
      const data = await getDestinations();
      const items = Array.isArray(data)
        ? data
        : data?.destinations ?? data?.value ?? [];

      setDestinations(items);
    } catch (err) {
      setError(err.message || "Could not load destinations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDestinations();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return destinations.filter((destination) =>
      [
        destination.name,
        destination.division,
        destination.district,
        destination.upazila,
        destination.description,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [destinations, search]);

  function canEdit(destination) {
    return (
      role === "HIGHER_ADMIN" ||
      (role === "STAFF" && Number(destination.created_by) === userId)
    );
  }

  function openCreateForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setSelectedImage(null);
    setImagePreview("");
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function openEditForm(destination) {
    setEditingId(destination.destination_id);
    setForm({
      name: destination.name || "",
      division: destination.division || "",
      district: destination.district || "",
      upazila: destination.upazila || "",
      description: destination.description || "",
      latitude: destination.latitude ?? "",
      longitude: destination.longitude ?? "",
      image_url: destination.image_url || "",
      status: destination.status || "ACTIVE",
    });

    setSelectedImage(null);
    setImagePreview(destination.image_url || "");
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0] || null;
    setSelectedImage(file);

    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(form.image_url || "");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const uploadedImage = selectedImage
        ? await uploadImage(selectedImage, "destination")
        : null;

      const payload = {
        ...form,
        image_url: uploadedImage?.image_url || form.image_url || null,
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
      };

      if (editingId !== null) {
        await updateDestination(editingId, payload);
        setMessage("Destination updated successfully.");
      } else {
        await createDestination(payload);
        setMessage("Destination created successfully.");
      }

      setShowForm(false);
      setForm({ ...emptyForm });
      setSelectedImage(null);
      setImagePreview("");
      setEditingId(null);

      await loadDestinations();
    } catch (err) {
      setError(err.message || "Could not save destination.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(destination) {
    const confirmed = window.confirm(
      `Delete "${destination.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await deleteDestination(destination.destination_id);
      setMessage("Destination deleted successfully.");
      await loadDestinations();
    } catch (err) {
      setError(err.message || "Could not delete destination.");
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-50">
      {/* Decorative page background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-40 h-96 w-96 rounded-full bg-teal-100/50 blur-3xl" />
        <div className="absolute -right-32 top-[45%] h-96 w-96 rounded-full bg-cyan-100/40 blur-3xl" />
      </div>

      {/* Hero */}
      <section
        className="relative overflow-hidden bg-cover bg-center bg-no-repeat px-5 py-16 text-white sm:py-20 lg:px-8"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0, 45, 48, 0.65), rgba(0, 85, 78, 0.72)), url('/images/st-martin.jpg')",
        }}
      >
        <div className="pointer-events-none absolute -right-20 -top-32 h-96 w-96 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-8 -top-20 h-72 w-72 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-44 left-[35%] h-[30rem] w-[30rem] rounded-full bg-teal-400/10 blur-2xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-teal-100 backdrop-blur">
                <Compass size={17} />
                Explore the beauty of Bangladesh
              </div>

              <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Find your next
                <span className="block text-amber-300">
                  unforgettable place.
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-teal-50/90 sm:text-lg">
                From misty green hills and quiet tea gardens to golden beaches
                and vibrant cities, discover places that make every journey
                special.
              </p>

              <div className="mt-7 flex flex-wrap gap-3 text-sm font-medium text-white/90">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                  <Mountain size={16} />
                  Hills & nature
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                  <MapPin size={16} />
                  Local experiences
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                  <Sparkles size={16} />
                  New discoveries
                </span>
              </div>
            </div>

            {canManage && (
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-5 py-3.5 font-bold text-teal-950 shadow-lg shadow-black/10 transition hover:-translate-y-1 hover:bg-amber-200"
              >
                <Plus size={19} />
                Add Destination
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="relative mx-auto max-w-7xl px-5 pb-20 lg:px-8">
        {/* Search and count panel */}
        <div className="relative -mt-7 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xl shadow-slate-900/5 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 transition focus-within:border-teal-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-teal-500/10">
              <Search size={20} className="shrink-0 text-teal-700" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by destination, district, division..."
                aria-label="Search destinations"
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-teal-50 px-4 py-3">
              <div className="rounded-lg bg-teal-100 p-2 text-teal-800">
                <MapPin size={19} />
              </div>
              <div>
                <p className="text-xs font-medium text-teal-700">
                  Destinations
                </p>
                <p className="text-lg font-extrabold text-teal-950">
                  {filtered.length}
                  <span className="ml-1 text-sm font-medium text-teal-700">
                    found
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <p className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">
            {message}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {/* Add/Edit form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-teal-900 to-teal-700 px-6 py-5 text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-200">
                  Destination management
                </p>
                <h2 className="mt-1 text-xl font-extrabold">
                  {editingId !== null ? "Edit Destination" : "Add a Destination"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
                className="rounded-xl bg-white/10 p-2.5 transition hover:bg-white/20"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["name", "Destination name", true],
                  ["division", "Division", true],
                  ["district", "District", true],
                  ["upazila", "Upazila", false],
                  ["latitude", "Latitude", false],
                  ["longitude", "Longitude", false],
                ].map(([name, label, required]) => (
                  <label
                    key={name}
                    className="block text-sm font-semibold text-slate-700"
                  >
                    {label}
                    <input
                      name={name}
                      value={form[name]}
                      onChange={handleChange}
                      required={required}
                      type={
                        name === "latitude" || name === "longitude"
                          ? "number"
                          : "text"
                      }
                      step={
                        name === "latitude" || name === "longitude"
                          ? "any"
                          : undefined
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                    />
                  </label>
                ))}

                <label className="block text-sm font-semibold text-slate-700">
                  Status
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>

                <label className="block text-sm font-semibold text-slate-700 sm:col-span-2 lg:col-span-3">
                  Description
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Describe what makes this destination special..."
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 leading-6 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                  />
                </label>
              </div>

              <div className="mt-6 rounded-2xl border border-dashed border-teal-300 bg-teal-50/50 p-5">
                <label className="block text-sm font-bold text-slate-800">
                  <span className="inline-flex items-center gap-2">
                    <ImagePlus size={18} className="text-teal-700" />
                    Destination photo
                  </span>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-teal-700 file:px-4 file:py-2.5 file:font-semibold file:text-white hover:file:bg-teal-800"
                  />
                </label>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  JPG, PNG or WebP. Choose a new photo to replace the current
                  image.
                </p>

                {imagePreview && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-semibold text-slate-600">
                      Photo preview
                    </p>
                    <img
                      src={imagePreview}
                      alt="Destination preview"
                      className="h-48 w-full rounded-xl object-cover shadow-sm sm:w-96"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-6 py-3 font-bold text-white shadow-md transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <LoaderCircle size={17} className="animate-spin" />}
                  {saving
                    ? "Saving..."
                    : editingId !== null
                    ? "Save Changes"
                    : "Create Destination"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Destination cards */}
        <div className="mt-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-700">
                Choose your escape
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Places to fall in love with
              </h2>
            </div>
            <p className="text-sm text-slate-500">
              Select a destination to explore more
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 rounded-2xl bg-white p-8 text-slate-600 shadow-sm">
              <LoaderCircle className="animate-spin text-teal-700" size={22} />
              Loading destinations...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <MapPin size={36} className="mx-auto text-teal-600" />
              <h3 className="mt-3 text-lg font-bold text-slate-900">
                No destinations found
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Try another search term.
              </p>
            </div>
          ) : (
            <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((destination, index) => (
                <article
                  key={destination.destination_id}
                  className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-md shadow-slate-900/5 transition duration-300 hover:-translate-y-2 hover:border-teal-200 hover:shadow-2xl hover:shadow-teal-900/10"
                >
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/destinations/${destination.destination_id}`)
                    }
                    className="block w-full text-left focus:outline-none focus:ring-4 focus:ring-inset focus:ring-teal-500/30"
                  >
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={
                          destination.image_url ||
                          fallbackImages[index % fallbackImages.length]
                        }
                        alt={destination.name || "Destination"}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />

                      <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/50 bg-white/90 px-3 py-1.5 text-xs font-bold text-teal-900 shadow-sm backdrop-blur">
                        <Sparkles size={13} />
                        {destination.status || "ACTIVE"}
                      </span>

                      <div className="absolute bottom-5 left-5 right-5 text-white">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-white/80">
                          <MapPin size={15} />
                          {[destination.district, destination.division]
                            .filter(Boolean)
                            .join(", ") || "Bangladesh"}
                        </p>

                        <h3 className="mt-2 text-2xl font-extrabold drop-shadow">
                          {destination.name || "Destination"}
                        </h3>
                      </div>

                      <span className="absolute bottom-5 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition group-hover:bg-amber-300 group-hover:text-teal-950">
                        <ArrowRight size={19} />
                      </span>
                    </div>

                    <div className="p-5">
                      <p className="line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-600">
                        {destination.description ||
                          "Discover the beauty and experiences waiting at this destination."}
                      </p>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-sm font-bold text-teal-700">
                          Discover destination
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          Explore more
                        </span>
                      </div>
                    </div>
                  </button>

                  {canManage && canEdit(destination) && (
                    <div className="flex gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
                      <button
                        type="button"
                        onClick={() => openEditForm(destination)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
                      >
                        <Pencil size={15} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(destination)}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
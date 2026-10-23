 
import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, LoaderCircle, Plus, Pencil, Trash2, X } from "lucide-react";
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

export default function Destinations() {
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
  const user = JSON.parse(sessionStorage.getItem("user") || "null");
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
      setDestinations(Array.isArray(data) ? data : data.destinations || []);
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
    return role === "HIGHER_ADMIN" ||
      (role === "STAFF" && Number(destination.created_by) === userId);
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
    if (file) setImagePreview(URL.createObjectURL(file));
    else setImagePreview(form.image_url || "");
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
    <main className="min-h-screen bg-slate-50 px-5 py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="font-semibold uppercase tracking-widest text-teal-700">
          Explore Bangladesh
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">
            Discover Destinations
          </h1>

          {canManage && (
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white hover:bg-teal-800"
            >
              <Plus size={19} />
              Add Destination
            </button>
          )}
        </div>

        <p className="mt-4 max-w-2xl text-slate-600">
          Find your next adventure from our available travel destinations.
        </p>

        {message && (
          <p className="mt-5 rounded-lg bg-green-50 p-3 text-green-800">
            {message}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">
            {error}
          </p>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId !== null ? "Edit Destination" : "Add Destination"}
              </h2>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["name", "Destination name", true],
                ["division", "Division", true],
                ["district", "District", true],
                ["upazila", "Upazila", false],
                ["latitude", "Latitude", false],
                ["longitude", "Longitude", false],
              ].map(([name, label, required]) => (
                <label key={name} className="block text-sm font-medium text-slate-700">
                  {label}
                  <input
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    required={required}
                    type={name === "latitude" || name === "longitude" ? "number" : "text"}
                    step={name === "latitude" || name === "longitude" ? "any" : undefined}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-600"
                  />
                </label>
              ))}

              <label className="block text-sm font-medium text-slate-700">
                Status
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-3">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-600"
                />
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-4">
              <label className="block text-sm font-semibold text-slate-700">
                Destination photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:font-semibold file:text-teal-800 hover:file:bg-teal-100"
                />
              </label>
              <p className="mt-2 text-xs text-slate-500">JPG, PNG or WebP · maximum 5 MB. Choose a new file to replace the current photo.</p>
            </div>

            {imagePreview && (
              <div className="mt-4">
                <p className="mb-2 text-sm text-slate-600">Photo preview</p>
                <img
                  src={imagePreview}
                  alt="Destination preview"
                  className="h-40 w-full rounded-xl object-cover sm:w-72"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-teal-700 px-5 py-2.5 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {saving ? "Saving..." : editingId !== null ? "Save Changes" : "Create Destination"}
              </button>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

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
                    key={destination.destination_id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    {destination.image_url ? (
                      <img
                        src={destination.image_url}
                        alt={destination.name}
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center bg-teal-50 text-teal-700">
                        <MapPin size={32} />
                      </div>
                    )}

                    <div className="p-6">
                      <h2 className="text-xl font-bold text-slate-900">
                        {destination.name || "Destination"}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {[destination.upazila, destination.district, destination.division]
                          .filter(Boolean)
                          .join(", ")}
                      </p>

                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {destination.description || "Explore this destination on your next trip."}
                      </p>

                      {canManage && canEdit(destination) && (
                        <div className="mt-5 flex gap-3 border-t border-slate-100 pt-4">
                          <button
                            type="button"
                            onClick={() => openEditForm(destination)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil size={16} />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(destination)}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
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

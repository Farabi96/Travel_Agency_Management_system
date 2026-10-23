 
 
import { useEffect, useState } from "react";
import PackageReviews from "../components/PackageReviews";
import {
  CalendarDays,
  MapPin,
  Clock,
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  CalendarPlus,
} from "lucide-react";
import {
  getPackages,
  getDestinations,
  createPackage,
  updatePackage,
  deletePackage,
  getSchedules,
  getScheduleAvailability,
  createSchedule,
  updateSchedule,
  cancelSchedule,
  createBooking,
} from "../services/api";

function formatDateTime(value) {
  if (!value) return "Not available";

  return new Date(value).toLocaleString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedPackage, setExpandedPackage] = useState(null);
  const [schedules, setSchedules] = useState({});
  const [availability, setAvailability] = useState({});
  const [scheduleLoading, setScheduleLoading] = useState({});
  const [scheduleErrors, setScheduleErrors] = useState({});

  
  const user = JSON.parse(sessionStorage.getItem("user") || "null");
  const role = user?.role_name;
  const userId = Number(user?.user_id);

  const canManage = Boolean(
    sessionStorage.getItem("access_token") &&
      ["STAFF", "HIGHER_ADMIN"].includes(role)
  );

  const [destinations, setDestinations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");

  const emptyForm = {
    package_code: "",
    package_name: "",
    description: "",
    duration_days: "1",
    duration_nights: "0",
    base_price: "",
    max_capacity: "20",
    min_travelers: "1",
    package_status: "DRAFT",
    destination_ids: [],
  };

  const [form, setForm] = useState({ ...emptyForm });

  
  const emptyScheduleForm = {
    departure_datetime: "",
    return_datetime: "",
    max_capacity: "20",
  };

  const [scheduleFormPackageId, setScheduleFormPackageId] = useState(null);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({ ...emptyScheduleForm });
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleFormError, setScheduleFormError] = useState("");
  const [scheduleFormMessage, setScheduleFormMessage] = useState("");

  const [bookingTarget, setBookingTarget] = useState(null);
  const [bookingTravelers, setBookingTravelers] = useState("1");
  const [bookingSpecialRequest, setBookingSpecialRequest] = useState("");
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");

  async function submitBooking(packageItem, schedule) {
    if (role !== "CUSTOMER" || !sessionStorage.getItem("access_token")) {
      window.location.href = "/login";
      return;
    }

    setBookingSaving(true);
    setBookingError("");
    setBookingMessage("");
    try {
      const result = await createBooking({
        package_id: packageItem.package_id,
        schedule_id: schedule.schedule_id,
        number_of_travelers: Number(bookingTravelers),
        special_request: bookingSpecialRequest.trim(),
      });
      setBookingMessage(
        `Booking created! Reference: ${result.booking_reference}. Total: ৳${Number(result.total_amount).toLocaleString("en-BD")}. Status: ${result.status_name || "Pending"}.`
      );
      setBookingTravelers("1");
      setBookingSpecialRequest("");
    } catch (err) {
      setBookingError(err.message || "Could not create booking.");
    } finally {
      setBookingSaving(false);
    }
  }



 
  async function loadPackages() {
    setLoading(true);
    setError("");

    try {
      const data = await getPackages();
      const items = Array.isArray(data)
        ? data
        : data?.value ?? data?.packages ?? [];

      const visibleItems = items.filter((item) => {
        if (role === "HIGHER_ADMIN") return true;

        if (role === "STAFF") {
          return (
            item.package_status === "ACTIVE" ||
            Number(item.created_by) === userId
          );
        }

        return item.package_status === "ACTIVE";
      });

      setPackages(visibleItems);
    } catch (err) {
      console.error("Failed to load packages:", err);
      setError(err.message || "Could not load tour packages.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPackages();

    if (canManage) {
      getDestinations()
        .then((data) => {
          setDestinations(
            Array.isArray(data) ? data : data?.destinations ?? []
          );
        })
        .catch((err) => {
          console.error("Failed to load destinations:", err);
          setFormError("Could not load destinations for the package form.");
        });
    }
  }, []);



  function canEditPackage(item) {
    return (
      role === "HIGHER_ADMIN" ||
      (role === "STAFF" && Number(item.created_by) === userId)
    );
  }

  function openCreateForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError("");
    setFormMessage("");
    setShowForm(true);
  }

  function openEditForm(item) {
    setEditingId(item.package_id);
    setForm({
      package_code: item.package_code || "",
      package_name: item.package_name || "",
      description: item.description || "",
      duration_days: String(item.duration_days ?? 1),
      duration_nights: String(item.duration_nights ?? 0),
      base_price: String(item.base_price ?? ""),
      max_capacity: String(item.max_capacity ?? 20),
      min_travelers: String(item.min_travelers ?? 1),
      package_status: item.package_status || "DRAFT",
      destination_ids: (item.destination_ids || []).map(Number),
    });
    setFormError("");
    setFormMessage("");
    setShowForm(true);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleDestinationToggle(destinationId, checked) {
    setForm((current) => ({
      ...current,
      destination_ids: checked
        ? [...current.destination_ids, destinationId]
        : current.destination_ids.filter((id) => id !== destinationId),
    }));
  }

  async function handlePackageSubmit(event) {
    event.preventDefault();
    setFormError("");
    setFormMessage("");

    if (
      !form.package_code.trim() ||
      !form.package_name.trim() ||
      form.base_price === "" ||
      form.max_capacity === ""
    ) {
      setFormError("Please complete all required fields.");
      return;
    }

    const payload = {
      package_code: form.package_code.trim(),
      package_name: form.package_name.trim(),
      description: form.description.trim() || null,
      duration_days: Number(form.duration_days),
      duration_nights: Number(form.duration_nights),
      base_price: Number(form.base_price),
      max_capacity: Number(form.max_capacity),
      min_travelers: Number(form.min_travelers),
      package_status: form.package_status,
      destination_ids: form.destination_ids,
    };

    if (
      !Number.isInteger(payload.duration_days) ||
      payload.duration_days < 1 ||
      !Number.isInteger(payload.duration_nights) ||
      payload.duration_nights < 0 ||
      !Number.isFinite(payload.base_price) ||
      payload.base_price < 0 ||
      !Number.isInteger(payload.max_capacity) ||
      payload.max_capacity < 1 ||
      !Number.isInteger(payload.min_travelers) ||
      payload.min_travelers < 1 ||
      payload.min_travelers > payload.max_capacity
    ) {
      setFormError("Check the duration, price, capacity, and minimum travelers.");
      return;
    }

    setSaving(true);

    try {
      if (editingId !== null) {
        await updatePackage(editingId, payload);
        setFormMessage("Package updated successfully.");
      } else {
        await createPackage(payload);
        setFormMessage("Package created successfully.");
      }

      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      await loadPackages();
    } catch (err) {
      setFormError(err.message || "Could not save the package.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePackageDelete(item) {
    const confirmed = window.confirm(
      `Delete "${item.package_name}"? Packages linked to bookings may not be deletable.`
    );

    if (!confirmed) return;

    setError("");

    try {
      await deletePackage(item.package_id);

      if (expandedPackage === item.package_id) {
        setExpandedPackage(null);
      }

      setSchedules((current) => {
        const next = { ...current };
        delete next[item.package_id];
        return next;
      });

      setAvailability({});
      await loadPackages();
      setFormMessage("Package deleted successfully.");
    } catch (err) {
      setError(
        err.message ||
          "Could not delete the package. If it has bookings or related records, change its status to INACTIVE or ARCHIVED instead."
      );
    }
  }

  
  function canManageSchedule(item) {
    return canManage && canEditPackage(item);
  }

  function openScheduleForm(packageItem, schedule = null) {
    setScheduleFormPackageId(packageItem.package_id);
    setEditingScheduleId(schedule?.schedule_id ?? null);
    setScheduleForm({
      departure_datetime: schedule?.departure_datetime
        ? schedule.departure_datetime.slice(0, 16)
        : "",
      return_datetime: schedule?.return_datetime
        ? schedule.return_datetime.slice(0, 16)
        : "",
      max_capacity: String(schedule?.max_capacity ?? 20),
    });
    setScheduleFormError("");
    setScheduleFormMessage("");
  }

  async function handleScheduleSubmit(event) {
    event.preventDefault();
    setScheduleFormError("");
    setScheduleFormMessage("");

    const departure = new Date(scheduleForm.departure_datetime);
    const returnTime = new Date(scheduleForm.return_datetime);
    const capacity = Number(scheduleForm.max_capacity);

    if (
      !scheduleForm.departure_datetime ||
      !scheduleForm.return_datetime ||
      Number.isNaN(departure.getTime()) ||
      Number.isNaN(returnTime.getTime()) ||
      returnTime <= departure ||
      !Number.isInteger(capacity) ||
      capacity < 1
    ) {
      setScheduleFormError(
        "Enter valid departure and return times, and a positive seat capacity."
      );
      return;
    }

    const payload = {
      departure_datetime: scheduleForm.departure_datetime,
      return_datetime: scheduleForm.return_datetime,
      max_capacity: capacity,
    };

    if (editingScheduleId === null) {
      payload.package_id = scheduleFormPackageId;
    }

    setScheduleSaving(true);

    try {
      if (editingScheduleId !== null) {
        await updateSchedule(editingScheduleId, payload);
      } else {
        await createSchedule(payload);
      }

      const data = await getSchedules(scheduleFormPackageId);
      const items = Array.isArray(data)
        ? data
        : data?.schedules ?? data?.value ?? [];

      setSchedules((previous) => ({
        ...previous,
        [scheduleFormPackageId]: items,
      }));

      const results = await Promise.all(
        items.map(async (schedule) => {
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

      setAvailability((previous) => ({
        ...previous,
        ...Object.fromEntries(results),
      }));

      setScheduleFormMessage(
        editingScheduleId === null
          ? "Departure schedule created successfully."
          : "Departure schedule updated successfully."
      );

      setScheduleFormPackageId(null);
      setEditingScheduleId(null);
      setScheduleForm({ ...emptyScheduleForm });
    } catch (err) {
      setScheduleFormError(err.message || "Could not save the schedule.");
    } finally {
      setScheduleSaving(false);
    }
  }

  async function handleScheduleCancel(schedule) {
    const confirmed = window.confirm(
      "Cancel this departure schedule? Existing booking records will be preserved."
    );

    if (!confirmed) return;

    try {
      await cancelSchedule(schedule.schedule_id);

      const data = await getSchedules(schedule.package_id);
      const items = Array.isArray(data)
        ? data
        : data?.schedules ?? data?.value ?? [];

      setSchedules((previous) => ({
        ...previous,
        [schedule.package_id]: items,
      }));

      const results = await Promise.all(
        items.map(async (item) => {
          try {
            return [
              item.schedule_id,
              await getScheduleAvailability(item.schedule_id),
            ];
          } catch {
            return [
              item.schedule_id,
              { availability_error: "Seat availability could not be loaded." },
            ];
          }
        })
      );

      setAvailability((previous) => ({
        ...previous,
        ...Object.fromEntries(results),
      }));
    } catch (err) {
      setError(err.message || "Could not cancel the schedule.");
    }
  }




  async function toggleSchedules(packageItem) {
    const packageId = packageItem.package_id;

    if (expandedPackage === packageId) {
      setExpandedPackage(null);
      return;
    }

    setExpandedPackage(packageId);

    if (schedules[packageId]) return;

    setScheduleLoading((prev) => ({ ...prev, [packageId]: true }));
    setScheduleErrors((prev) => ({ ...prev, [packageId]: "" }));

    try {
      const data = await getSchedules(packageId);
      const items = Array.isArray(data)
        ? data
        : data?.schedules ?? data?.value ?? [];

      setSchedules((prev) => ({ ...prev, [packageId]: items }));

      const results = await Promise.all(
        items.map(async (schedule) => {
          try {
            const result = await getScheduleAvailability(
              schedule.schedule_id
            );
            return [schedule.schedule_id, result];
          } catch (err) {
            console.error("Failed to load schedule availability:", err);
            return [
              schedule.schedule_id,
              { availability_error: "Seat availability could not be loaded." },
            ];
          }
        })
      );

      setAvailability((prev) => ({
        ...prev,
        ...Object.fromEntries(results),
      }));
    } catch (err) {
      console.error("Failed to load schedules:", err);
      setScheduleErrors((prev) => ({
        ...prev,
        [packageId]: "Could not load departure dates. Please try again.",
      }));
    } finally {
      setScheduleLoading((prev) => ({ ...prev, [packageId]: false }));
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="font-bold uppercase tracking-widest text-teal-700">
          Explore experiences
        </p>

         
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-bold text-slate-900">
            Tour Packages
          </h1>

          {canManage && (
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white hover:bg-teal-800"
            >
              <Plus size={18} />
              Add Package
            </button>
          )}
        </div>


        <p className="mt-4 text-slate-600">
          Find your next adventure from our available tour packages.
        </p>

        
        {formMessage && (
          <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
            {formMessage}
          </p>
        )}

        {showForm && (
          <form
            onSubmit={handlePackageSubmit}
            className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId !== null ? "Edit Package" : "Create Package"}
              </h2>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close package form"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Package Code *
                <input
                  required
                  name="package_code"
                  value={form.package_code}
                  onChange={handleFormChange}
                  maxLength={30}
                  disabled={editingId !== null}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-3"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Package Name *
                <input
                  required
                  name="package_name"
                  value={form.package_name}
                  onChange={handleFormChange}
                  maxLength={200}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-3"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Duration (days) *
                <input
                  required
                  type="number"
                  min="1"
                  name="duration_days"
                  value={form.duration_days}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-3"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Duration (nights) *
                <input
                  required
                  type="number"
                  min="0"
                  name="duration_nights"
                  value={form.duration_nights}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-3"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Base Price (BDT) *
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  name="base_price"
                  value={form.base_price}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-3"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Maximum Capacity *
                <input
                  required
                  type="number"
                  min="1"
                  name="max_capacity"
                  value={form.max_capacity}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-3"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Minimum Travelers
                <input
                  required
                  type="number"
                  min="1"
                  name="min_travelers"
                  value={form.min_travelers}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-3"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Package Status
                <select
                  name="package_status"
                  value={form.package_status}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-3"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={handleFormChange}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-300 p-3"
              />
            </label>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-800">
                Select Destinations
              </legend>

              {destinations.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No destinations found. Create a destination first.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {destinations.map((destination) => (
                    <label
                      key={destination.destination_id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.destination_ids.includes(
                          Number(destination.destination_id)
                        )}
                        onChange={(event) =>
                          handleDestinationToggle(
                            Number(destination.destination_id),
                            event.target.checked
                          )
                        }
                      />
                      {destination.name}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-teal-700 px-5 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId !== null
                    ? "Save Changes"
                    : "Create Package"}
              </button>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}


        {scheduleFormPackageId !== null && (
          <form
            onSubmit={handleScheduleSubmit}
            className="mt-6 space-y-5 rounded-2xl border border-teal-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingScheduleId !== null
                    ? "Edit Departure Schedule"
                    : "Add Departure Schedule"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Set departure and return dates, plus the number of seats for this trip.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setScheduleFormPackageId(null);
                  setEditingScheduleId(null);
                  setScheduleForm({ ...emptyScheduleForm });
                  setScheduleFormError("");
                  setScheduleFormMessage("");
                }}
                aria-label="Close schedule form"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {scheduleFormError && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {scheduleFormError}
              </p>
            )}
            {scheduleFormMessage && (
              <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
                {scheduleFormMessage}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-medium text-slate-700">
                Departure date and time *
                <input
                  required
                  type="datetime-local"
                  value={scheduleForm.departure_datetime}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      departure_datetime: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 p-3"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Return date and time *
                <input
                  required
                  type="datetime-local"
                  min={scheduleForm.departure_datetime || undefined}
                  value={scheduleForm.return_datetime}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      return_datetime: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 p-3"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Seat capacity *
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={scheduleForm.max_capacity}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      max_capacity: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 p-3"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={scheduleSaving}
                className="rounded-lg bg-teal-700 px-5 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {scheduleSaving
                  ? "Saving..."
                  : editingScheduleId !== null
                    ? "Save Schedule Changes"
                    : "Create Schedule"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setScheduleFormPackageId(null);
                  setEditingScheduleId(null);
                  setScheduleForm({ ...emptyScheduleForm });
                  setScheduleFormError("");
                  setScheduleFormMessage("");
                }}
                className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading && (
          <p className="mt-8 text-slate-600">Loading packages...</p>
        )}

        {error && <p className="mt-8 text-red-600">{error}</p>}

        {!loading && !error && packages.length === 0 && (
          <p className="mt-8 rounded-xl bg-white p-6 text-slate-600">
            No active tour packages are available yet.
          </p>
        )}

        {!loading && !error && packages.length > 0 && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((item) => {
              const packageId = item.package_id;
              const isExpanded = expandedPackage === packageId;
              const packageSchedules = schedules[packageId] || [];
              // Customers see only future, scheduled departures. Staff and Higher Admin
              // retain access to historical/cancelled schedules for management.
              const visiblePackageSchedules = canManage
                ? packageSchedules
                : packageSchedules.filter((schedule) => {
                    const departureTime = new Date(
                      schedule.departure_datetime
                    ).getTime();
                    return (
                      schedule.schedule_status === "SCHEDULED" &&
                      Number.isFinite(departureTime) &&
                      departureTime > Date.now()
                    );
                  });

              return (
                <article
                  key={packageId}
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
                      {item.description ||
                        "Discover a memorable travel experience."}
                    </p>

                    <PackageReviews packageId={packageId} />

                    
                    {canManage && canEditPackage(item) && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(item)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil size={15} />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePackageDelete(item)}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={15} />
                          Delete
                        </button>

                        <span className="self-center text-xs text-slate-500">
                          {item.package_status}
                        </span>
                      </div>
                    )}


                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-xs text-slate-500">
                          Starting from
                        </p>
                        <p className="text-xl font-extrabold text-teal-700">
                          ৳{Number(item.base_price).toLocaleString("en-BD")}
                        </p>
                      </div>

                      <span className="flex items-center gap-1 text-sm text-slate-600">
                        <CalendarDays size={16} />
                        {item.duration_days}D / {item.duration_nights}N
                      </span>
                    </div>



                    
                    {canManageSchedule(item) && (
                      <button
                        type="button"
                        onClick={() => openScheduleForm(item)}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-teal-700 px-4 py-3 font-semibold text-teal-700 hover:bg-teal-50"
                      >
                        <CalendarPlus size={18} />
                        Add Departure Schedule
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleSchedules(item)}
                      className="mt-5 w-full rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800"
                    >
                      {isExpanded
                        ? "Hide Departure Dates"
                        : "View Departure Dates"}
                    </button>

                    {isExpanded && (
                      <div className="mt-5 border-t border-slate-200 pt-4">
                        <h3 className="text-lg font-bold text-slate-900">
                          Available Schedules
                        </h3>
                        
                        {canManageSchedule(item) && (
                          <p className="mt-2 text-sm text-slate-500">
                            You can edit or cancel schedules for this package.
                          </p>
                        )}


                        {scheduleLoading[packageId] && (
                          <p className="mt-3 text-sm text-slate-600">
                            Loading departure dates and seat availability...
                          </p>
                        )}

                        {scheduleErrors[packageId] && (
                          <p className="mt-3 text-sm text-red-600">
                            {scheduleErrors[packageId]}
                          </p>
                        )}

                        {!scheduleLoading[packageId] &&
                          !scheduleErrors[packageId] &&
                          visiblePackageSchedules.length === 0 && (
                            <p className="mt-3 text-sm text-slate-600">
                              {canManage
                                ? "No departure schedules are available for this package yet."
                                : "No upcoming departures are currently available for this package."}
                            </p>
                          )}

                        <div className="mt-3 space-y-4">
                          {visiblePackageSchedules.map((schedule) => {
                            const seats = availability[schedule.schedule_id];
                            const canBook =
                              seats?.is_bookable === true &&
                              !seats?.availability_error;

                            return (
                              <div
                                key={schedule.schedule_id}
                                className="rounded-xl border border-slate-200 p-4"
                              >
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                  <CalendarDays
                                    size={17}
                                    className="text-teal-700"
                                  />
                                  <span>Departure</span>
                                </div>

                                <p className="mt-1 text-sm text-slate-600">
                                  {formatDateTime(
                                    schedule.departure_datetime
                                  )}
                                </p>

                                <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                                  <Clock
                                    size={17}
                                    className="text-teal-700"
                                  />
                                  <span>Return</span>
                                </div>

                                <p className="mt-1 text-sm text-slate-600">
                                  {formatDateTime(schedule.return_datetime)}
                                </p>

                                <div className="mt-3 flex items-center gap-2 text-sm">
                                  <Users
                                    size={17}
                                    className="text-teal-700"
                                  />

                                  {seats?.availability_error ? (
                                    <span className="text-amber-700">
                                      {seats.availability_error}
                                    </span>
                                  ) : seats ? (
                                    <span
                                      className={
                                        seats.available_seats > 0
                                          ? "font-semibold text-green-700"
                                          : "font-semibold text-red-600"
                                      }
                                    >
                                      {seats.available_seats} seats available
                                      out of {seats.max_capacity}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">
                                      Checking seats...
                                    </span>
                                  )}
                                </div>

                                <p className="mt-2 text-xs text-slate-500">
                                  Schedule status:{" "}
                                  {schedule.schedule_status}
                                </p>

                                {canManageSchedule(item) && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openScheduleForm(item, schedule)}
                                      disabled={schedule.schedule_status === "CANCELLED"}
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <Pencil size={14} /> Edit Schedule
                                    </button>
                                    {schedule.schedule_status !== "CANCELLED" && (
                                      <button
                                        type="button"
                                        onClick={() => handleScheduleCancel({
                                          ...schedule,
                                          package_id: schedule.package_id ?? packageId,
                                        })}
                                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                                      >
                                        <X size={14} /> Cancel Schedule
                                      </button>
                                    )}
                                  </div>
                                )}

                                {!canManage && (
                                  <button
                                    type="button"
                                    disabled={!canBook}
                                    onClick={() => {
                                      if (role !== "CUSTOMER" || !sessionStorage.getItem("access_token")) {
                                        window.location.href = "/login";
                                        return;
                                      }
                                      setBookingTarget({ packageItem: item, schedule });
                                      setBookingTravelers("1");
                                      setBookingSpecialRequest("");
                                      setBookingError("");
                                      setBookingMessage("");
                                    }}
                                    className="mt-4 w-full rounded-lg border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                                  >
                                    {canBook
                                      ? (role === "CUSTOMER" ? "Book This Schedule" : "Login to Book")
                                      : "Currently Unavailable"}
                                  </button>
                                )}

                                {bookingTarget?.schedule.schedule_id === schedule.schedule_id && (
                                  <form
                                    className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4"
                                    onSubmit={(event) => {
                                      event.preventDefault();
                                      submitBooking(bookingTarget.packageItem, bookingTarget.schedule);
                                    }}
                                  >
                                    <h4 className="font-semibold text-slate-900">Confirm your booking</h4>
                                    <label className="block text-sm font-medium text-slate-700">
                                      Number of travelers
                                      <input
                                        type="number"
                                        min="1"
                                        max={seats?.available_seats || 1}
                                        required
                                        value={bookingTravelers}
                                        onChange={(event) => setBookingTravelers(event.target.value)}
                                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                                      />
                                    </label>
                                    <p className="text-sm text-slate-600">
                                      Estimated total: ৳{(Number(item.base_price || 0) * Math.max(1, Number(bookingTravelers) || 1)).toLocaleString("en-BD")}
                                    </p>
                                    <label className="block text-sm font-medium text-slate-700">
                                      Special request (optional)
                                      <textarea
                                        rows="2"
                                        value={bookingSpecialRequest}
                                        onChange={(event) => setBookingSpecialRequest(event.target.value)}
                                        maxLength={1000}
                                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                                        placeholder="Any special requirements?"
                                      />
                                    </label>
                                    {bookingError && <p className="text-sm text-red-700">{bookingError}</p>}
                                    {bookingMessage && <p className="text-sm text-green-700">{bookingMessage}</p>}
                                    <div className="flex gap-2">
                                      <button type="submit" disabled={bookingSaving} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                                        {bookingSaving ? "Creating booking..." : "Confirm Booking"}
                                      </button>
                                      <button type="button" onClick={() => setBookingTarget(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                                        Cancel
                                      </button>
                                    </div>
                                  </form>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

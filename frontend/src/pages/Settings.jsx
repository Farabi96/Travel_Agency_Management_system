
import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Settings as SettingsIcon,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
  ShieldCheck,
  Database,
  Clock,
  AlertCircle,
  CheckCircle2,
  Search,
} from "lucide-react";

const API_URL = "http://127.0.0.1:5000/api/settings/";

export default function Settings() {
  const token = sessionStorage.getItem("access_token");

  let user = null;

  try {
    user = JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  const isAdmin = user?.role_name === "HIGHER_ADMIN";

  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form, setForm] = useState({
    setting_key: "",
    setting_value: "",
    description: "",
  });

  const request = useCallback(async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || data.message || `Request failed (${response.status})`
      );
    }

    return data;
  }, [token]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await request(API_URL);
      setSettings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load system settings.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (token && isAdmin) {
      loadSettings();
    }
  }, [token, isAdmin, loadSettings]);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  function openCreateForm() {
    setEditingKey(null);
    setForm({
      setting_key: "",
      setting_value: "",
      description: "",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(setting) {
    setEditingKey(setting.setting_key);
    setForm({
      setting_key: setting.setting_key,
      setting_value: setting.setting_value ?? "",
      description: setting.description ?? "",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditingKey(null);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const key = form.setting_key.trim();

    if (!editingKey && !key) {
      setError("Please enter a setting key.");
      return;
    }

    setSaving(true);

    try {
      if (editingKey !== null) {
        const data = await request(
          `${API_URL}${encodeURIComponent(editingKey)}`,
          {
            method: "PUT",
            body: JSON.stringify({
              setting_value: form.setting_value,
              description: form.description,
            }),
          }
        );

        if (data.setting) {
          setSettings((current) =>
            current.map((item) =>
              item.setting_key === editingKey ? data.setting : item
            )
          );
        } else {
          await loadSettings();
        }

        setSuccess("Setting updated successfully.");
      } else {
        const data = await request(API_URL, {
          method: "POST",
          body: JSON.stringify({
            setting_key: key,
            setting_value: form.setting_value,
            description: form.description,
          }),
        });

        if (data.setting) {
          setSettings((current) =>
            [...current, data.setting].sort(
              (a, b) => a.setting_id - b.setting_id
            )
          );
        } else {
          await loadSettings();
        }

        setSuccess("Setting created successfully.");
      }

      setShowForm(false);
      setEditingKey(null);
    } catch (err) {
      setError(err.message || "Could not save the setting.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      await request(
        `${API_URL}${encodeURIComponent(deleteTarget.setting_key)}`,
        { method: "DELETE" }
      );

      setSettings((current) =>
        current.filter(
          (item) => item.setting_key !== deleteTarget.setting_key
        )
      );

      setSuccess(`"${deleteTarget.setting_key}" was deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message || "Could not delete the setting.");
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  }

  const filteredSettings = settings.filter((setting) => {
    const query = search.trim().toLowerCase();

    return (
      !query ||
      String(setting.setting_key || "").toLowerCase().includes(query) ||
      String(setting.setting_value || "").toLowerCase().includes(query) ||
      String(setting.description || "").toLowerCase().includes(query)
    );
  });

  function formatDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString();
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Page heading */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-teal-700">
              <SettingsIcon size={17} />
              <span>TravelMate / Administration</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              System Settings
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage the configuration records stored in your system settings
              database.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadSettings}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
            >
              <Plus size={18} />
              Add setting
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && !showForm && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Something went wrong</p>
              <p className="mt-1 break-words">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {success && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            <p>{success}</p>
            <button
              type="button"
              className="ml-auto"
              onClick={() => setSuccess("")}
              aria-label="Dismiss success message"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Summary cards */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-teal-50 p-3 text-teal-700">
                <Database size={22} />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Configuration
              </span>
            </div>

            <p className="mt-5 text-sm text-slate-500">Total settings</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">
              {loading ? "—" : settings.length}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Records currently stored in the database
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <ShieldCheck size={22} />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Access
              </span>
            </div>

            <p className="mt-5 text-sm text-slate-500">Current role</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              Higher Administrator
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Settings API access is restricted by the backend.
            </p>
          </div>
        </div>

        {/* Settings table */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Configuration records
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                View, edit, or remove individual settings.
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search settings..."
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-sm text-slate-500">
              <RefreshCw size={19} className="animate-spin" />
              Loading settings...
            </div>
          ) : error && settings.length === 0 ? (
            <div className="p-10 text-center">
              <AlertCircle size={30} className="mx-auto text-red-500" />
              <p className="mt-3 font-semibold text-slate-800">
                Settings could not be loaded
              </p>
              <p className="mt-2 text-sm text-slate-500">{error}</p>
              <button
                type="button"
                onClick={loadSettings}
                className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Try again
              </button>
            </div>
          ) : filteredSettings.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <SettingsIcon size={26} />
              </div>
              <h3 className="mt-4 font-bold text-slate-900">
                {settings.length === 0
                  ? "No settings yet"
                  : "No matching settings"}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {settings.length === 0
                  ? "Add your first setting to begin managing configuration records."
                  : "Try a different search term."}
              </p>

              {settings.length === 0 && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  <Plus size={17} />
                  Add your first setting
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Setting</th>
                      <th className="px-5 py-4 font-semibold">Value</th>
                      <th className="px-5 py-4 font-semibold">Last updated</th>
                      <th className="px-5 py-4 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredSettings.map((setting) => (
                      <tr
                        key={setting.setting_id}
                        className="align-top transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-5">
                          <p className="break-all font-semibold text-slate-900">
                            {setting.setting_key}
                          </p>
                          <p className="mt-1 max-w-xs whitespace-normal text-xs leading-5 text-slate-500">
                            {setting.description || "No description provided"}
                          </p>
                        </td>

                        <td className="max-w-sm px-5 py-5">
                          <p className="whitespace-pre-wrap break-words text-slate-700">
                            {setting.setting_value || (
                              <span className="italic text-slate-400">
                                Empty value
                              </span>
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex items-start gap-2 text-xs leading-5 text-slate-500">
                            <Clock size={15} className="mt-0.5 shrink-0" />
                            <span>{formatDate(setting.updated_at)}</span>
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditForm(setting)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-500 hover:text-teal-700"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteTarget(setting)}
                              className="rounded-lg border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50"
                              aria-label={`Delete ${setting.setting_key}`}
                              title="Delete setting"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
                Showing {filteredSettings.length} of {settings.length} settings
              </div>
            </>
          )}
        </section>

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <ShieldCheck size={19} className="mt-1 shrink-0" />
          <p>
            <strong>Use care when changing configuration records.</strong>{" "}
            Changes are saved to the database immediately. Only settings that
            are explicitly read by your application will affect its behavior.
            Deleting a setting is permanent.
          </p>
        </div>
      </div>

      {/* Create / edit dialog */}
      {showForm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="setting-form-title"
            className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2
                  id="setting-form-title"
                  className="text-xl font-bold text-slate-900"
                >
                  {editingKey !== null ? "Edit setting" : "Add a setting"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the configuration details below.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Setting key
                </span>
                <input
                  type="text"
                  name="setting_key"
                  value={form.setting_key}
                  onChange={handleFormChange}
                  disabled={editingKey !== null || saving}
                  required
                  maxLength={100}
                  placeholder="e.g. site_name"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
                />
                <span className="mt-1.5 block text-xs text-slate-500">
                  Use a unique key to identify this setting. Existing keys
                  cannot be renamed here.
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Setting value
                </span>
                <textarea
                  name="setting_value"
                  value={form.setting_value}
                  onChange={handleFormChange}
                  disabled={saving}
                  rows={4}
                  placeholder="Enter the setting value..."
                  className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  disabled={saving}
                  rows={2}
                  maxLength={255}
                  placeholder="Explain what this setting is for..."
                  className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
                />
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={17} />
                  {saving
                    ? "Saving..."
                    : editingKey !== null
                      ? "Save changes"
                      : "Create setting"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={23} />
            </div>

            <h2
              id="delete-title"
              className="mt-4 text-xl font-bold text-slate-900"
            >
              Delete this setting?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              You are about to permanently delete{" "}
              <strong className="break-all">
                {deleteTarget.setting_key}
              </strong>
              . This cannot be undone.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={saving}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Keep setting
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

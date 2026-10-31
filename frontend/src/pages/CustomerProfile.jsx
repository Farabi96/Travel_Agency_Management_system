 
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createOwnCustomerProfile,
  getOwnCustomerProfile,
  updateOwnCustomerProfile,
} from "../services/api";

import { changePassword } from "../services/api";

export default function CustomerProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    customer_type: "BANGLADESHI",
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "",
    nationality: "Bangladeshi",
    phone: "",
    address_line: "",
    city: "",
    country: "Bangladesh",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
  current_password: "",
  new_password: "",
  confirm_password: "",
});

const [passwordMessage, setPasswordMessage] = useState("");
const [passwordError, setPasswordError] = useState("");
const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const customer = await getOwnCustomerProfile();

        if (cancelled) return;

        if (customer) {
          setProfile(customer);
          setProfileExists(true);
        } else {
          setProfileExists(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message || "Unable to load your profile. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();
 
 

    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

function startEditing() {
  setForm({
    customer_type: profile?.customer_type || "BANGLADESHI",
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
    date_of_birth: profile?.date_of_birth
      ? String(profile.date_of_birth).slice(0, 10)
      : "",
    gender: profile?.gender || "",
    nationality: profile?.nationality || "",
    phone: profile?.phone || "",
    address_line: profile?.address_line || "",
    city: profile?.city || "",
    country: profile?.country || "Bangladesh",
  });

  setError("");
  setIsEditing(true);
}

function cancelEditing() {
  setIsEditing(false);
  setError("");
}
async function handlePasswordChange(event) {
  event.preventDefault();
  setPasswordMessage("");
  setPasswordError("");

  if (passwordForm.new_password !== passwordForm.confirm_password) {
    setPasswordError("New passwords do not match.");
    return;
  }

  if (passwordForm.new_password.length < 8) {
    setPasswordError("New password must contain at least 8 characters.");
    return;
  }

  setPasswordLoading(true);

  try {
    const result = await changePassword({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    });

    setPasswordMessage(
      result.message || "Password changed successfully."
    );

    setPasswordForm({
      current_password: "",
      new_password: "",
      confirm_password: "",
    });
  } catch (err) {
    setPasswordError(err.message || "Could not change your password.");
  } finally {
    setPasswordLoading(false);
  }
}


  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const profileData = {
        ...form,
        last_name: form.last_name || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
      };

      const result = await createOwnCustomerProfile(profileData);
      setProfile(result.customer || profileData);
      setProfileExists(true);
    } catch (err) {
      if (err.message?.toLowerCase().includes("already exists")) {
        try {
          const customer = await getOwnCustomerProfile();

          if (customer) {
            setProfile(customer);
            setProfileExists(true);
            setError("");
            return;
          }
        } catch {
          // Keep the original error if the profile cannot be loaded.
        }
      }

      setError(err.message || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-10 text-center">
        Loading your profile...
      </main>
    );
  }

  if (error && !profileExists) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow">
          <h1 className="text-2xl font-bold text-slate-900">
            Unable to Load Profile
          </h1>
          <p role="alert" className="mt-4 text-red-700">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-6 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

if (profileExists && profile) {
  const initials = `${profile.first_name || ""} ${profile.last_name || ""}`
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "U";

  const details = [
    ["Customer Type", profile.customer_type],
    ["First Name", profile.first_name],
    ["Last Name", profile.last_name],
    [
  "Date of Birth",
  profile.date_of_birth
    ? String(profile.date_of_birth).slice(0, 10)
    : null,
],
    ["Gender", profile.gender],
    ["Nationality", profile.nationality],
    ["Phone Number", profile.phone],
    ["Address", profile.address_line],
    ["City", profile.city],
    ["Country", profile.country],
  ];

  async function handleUpdate(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const result = await updateOwnCustomerProfile({
        ...form,
        last_name: form.last_name || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
      });

      setProfile(result.customer);
      setIsEditing(false);
    } catch (err) {
      setError(err.message || "Could not update your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 px-6 py-8 text-white sm:px-9">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-2xl font-bold tracking-wide shadow-inner">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">Customer account</p>
                <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{`${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "My Profile"}</h1>
                <p className="mt-2 text-sm text-slate-200">Manage your personal information and account security.</p>
              </div>
              <span className="w-fit rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">Profile active</span>
            </div>
          </div>
          <div className="p-6 sm:p-9">

        {error && (
          <p role="alert" className="mb-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {isEditing ? (
          <form onSubmit={handleUpdate} className="space-y-5">
            <div>
              <label htmlFor="customer_type" className="mb-1 block text-sm font-medium">
                Customer Type *
              </label>
              <select
                id="customer_type"
                name="customer_type"
                value={form.customer_type}
                onChange={handleChange}
                required
                className={inputClass}
              >
                <option value="BANGLADESHI">Bangladeshi</option>
                <option value="FOREIGN">Foreign</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="first_name" className="mb-1 block text-sm font-medium">
                  First Name *
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="last_name" className="mb-1 block text-sm font-medium">
                  Last Name
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  maxLength={100}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="date_of_birth" className="mb-1 block text-sm font-medium">
                  Date of Birth
                </label>
                <input
                  id="date_of_birth"
                  type="date"
                  name="date_of_birth"
                  value={form.date_of_birth}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="gender" className="mb-1 block text-sm font-medium">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">Prefer not to say</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="nationality" className="mb-1 block text-sm font-medium">
                Nationality *
              </label>
              <input
                id="nationality"
                name="nationality"
                value={form.nationality}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium">
                Phone Number *
              </label>
              <input
                id="phone"
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                maxLength={30}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="address_line" className="mb-1 block text-sm font-medium">
                Address
              </label>
              <input
                id="address_line"
                name="address_line"
                value={form.address_line}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="city" className="mb-1 block text-sm font-medium">
                  City
                </label>
                <input
                  id="city"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="country" className="mb-1 block text-sm font-medium">
                  Country *
                </label>
                <input
                  id="country"
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? "Saving Changes..." : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Personal information</h2>
                <p className="mt-1 text-sm text-slate-500">Your saved customer details</p>
              </div>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">Customer</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div key={label} className="min-h-[82px] rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-2 break-words font-semibold text-slate-900">
                    {value || "Not provided"}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
              <button
                onClick={startEditing}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700"
              >
                Edit Profile
              </button>

              <button
                onClick={() => navigate("/dashboard")}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100"
              >
                Back to Dashboard
              </button>
            </div>
          </>
        )}
          </div>
        </section>

<section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
  <div className="flex items-start gap-3">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">🔒</div>
    <div>
      <h2 className="text-xl font-bold text-slate-900">
    Change Password
      </h2>
      <p className="mt-1 text-sm text-slate-600">Update your password to keep your account secure.</p>
    </div>
  </div>

  <form onSubmit={handlePasswordChange} className="mt-5 space-y-4">
    <div>
      <label
        htmlFor="current_password"
        className="mb-1 block text-sm font-medium"
      >
        Current Password
      </label>
      <input
        id="current_password"
        type="password"
        autoComplete="current-password"
        value={passwordForm.current_password}
        onChange={(event) =>
          setPasswordForm((previous) => ({
            ...previous,
            current_password: event.target.value,
          }))
        }
        required
        className={inputClass}
      />
    </div>

    <div>
      <label
        htmlFor="new_password"
        className="mb-1 block text-sm font-medium"
      >
        New Password
      </label>
      <input
        id="new_password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        value={passwordForm.new_password}
        onChange={(event) =>
          setPasswordForm((previous) => ({
            ...previous,
            new_password: event.target.value,
          }))
        }
        required
        className={inputClass}
      />
    </div>

    <div>
      <label
        htmlFor="confirm_password"
        className="mb-1 block text-sm font-medium"
      >
        Confirm New Password
      </label>
      <input
        id="confirm_password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        value={passwordForm.confirm_password}
        onChange={(event) =>
          setPasswordForm((previous) => ({
            ...previous,
            confirm_password: event.target.value,
          }))
        }
        required
        className={inputClass}
      />
    </div>

    {passwordError && (
      <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
        {passwordError}
      </p>
    )}

    {passwordMessage && (
      <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
        {passwordMessage}
      </p>
    )}

    <button
      type="submit"
      disabled={passwordLoading}
      className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
    >
      {passwordLoading ? "Changing Password..." : "Change Password"}
    </button>
  </form>
</section>
      </div>
    </main>
  );
}

 

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 to-teal-800 px-6 py-7 text-white sm:px-9">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">Welcome to TravelMate</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Complete Your Profile</h1>
          <p className="mt-2 text-sm text-slate-200">Add your details to continue with your travel plans.</p>
        </div>
        <div className="p-6 sm:p-9">

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="customer_type" className="mb-1 block text-sm font-medium">
              Customer Type *
            </label>
            <select
              id="customer_type"
              name="customer_type"
              value={form.customer_type}
              onChange={handleChange}
              required
              className={inputClass}
            >
              <option value="BANGLADESHI">Bangladeshi</option>
              <option value="FOREIGN">Foreign</option>
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="first_name" className="mb-1 block text-sm font-medium">
                First Name *
              </label>
              <input
                id="first_name"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                required
                maxLength={100}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="last_name" className="mb-1 block text-sm font-medium">
                Last Name
              </label>
              <input
                id="last_name"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                maxLength={100}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="date_of_birth" className="mb-1 block text-sm font-medium">
                Date of Birth
              </label>
              <input
                id="date_of_birth"
                type="date"
                name="date_of_birth"
                value={form.date_of_birth || ""}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="gender" className="mb-1 block text-sm font-medium">
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">Prefer not to say</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="nationality" className="mb-1 block text-sm font-medium">
              Nationality *
            </label>
            <input
              id="nationality"
              name="nationality"
              value={form.nationality}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium">
              Phone Number *
            </label>
            <input
              id="phone"
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
              maxLength={30}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="address_line" className="mb-1 block text-sm font-medium">
              Address
            </label>
            <input
              id="address_line"
              name="address_line"
              value={form.address_line}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="city" className="mb-1 block text-sm font-medium">
                City
              </label>
              <input
                id="city"
                name="city"
                value={form.city}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="country" className="mb-1 block text-sm font-medium">
                Country *
              </label>
              <input
                id="country"
                name="country"
                value={form.country}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving Profile..." : "Save Profile"}
          </button>
        </form>
        </div>
      </div>
    </main>
  );
}

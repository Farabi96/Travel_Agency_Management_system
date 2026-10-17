 
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
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

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
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">
          My Profile
        </h1>

        <p className="mb-6 mt-2 text-sm text-slate-600">
          View and manage your customer information.
        </p>

        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
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
            <div className="space-y-4">
              {details.map(([label, value]) => (
                <div key={label} className="border-b border-slate-100 pb-3">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {value || "Not provided"}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
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

<div className="mt-10 border-t border-slate-200 pt-6">
  <h2 className="text-xl font-bold text-slate-900">
    Change Password
  </h2>

  <p className="mt-2 text-sm text-slate-600">
    Enter your current password and choose a new password.
  </p>

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
</div>


    </main>
  );
}

 

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Complete Your Profile
        </h1>

        <p className="mb-6 mt-2 text-sm text-slate-600">
          Please provide your details before continuing.
        </p>

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
    </main>
  );
}

import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, LockKeyhole, Save, UserRound } from "lucide-react";
import { changePassword, getOwnProfile, updateOwnProfile } from "../services/api";

export default function AdminProfile() {
  const token = sessionStorage.getItem("access_token");
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
  });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const data = await getOwnProfile();
        if (!active) return;
        if (data.role_name !== "HIGHER_ADMIN") {
          setError("This page is only available to Higher Admin.");
          return;
        }
        setProfile(data);
        setEmail(data.email || "");
      } catch (err) {
        if (active) setError(err.message || "Could not load profile.");
      } finally {
        if (active) setLoading(false);
      }
    }

    if (token) loadProfile();
    else setLoading(false);

    return () => {
      active = false;
    };
  }, [token]);

  if (!token) return <Navigate to="/login" replace />;

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSavingProfile(true);

    try {
      const result = await updateOwnProfile({ email });
      const updatedProfile = { ...profile, email: result.email || email };
      setProfile(updatedProfile);

      const storedUser = JSON.parse(sessionStorage.getItem("user") || "null");
      if (storedUser) {
        sessionStorage.setItem(
          "user",
          JSON.stringify({ ...storedUser, email: updatedProfile.email })
        );
      }

      setEmail(updatedProfile.email);
      setSuccess(result.message || "Email updated successfully.");
    } catch (err) {
      setError(err.message || "Could not update email.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (passwordForm.new_password.length < 8) {
      setError("New password must contain at least 8 characters.");
      return;
    }

    setSavingPassword(true);
    try {
      const result = await changePassword(passwordForm);
      setPasswordForm({ current_password: "", new_password: "" });
      setSuccess(result.message || "Password changed successfully.");
    } catch (err) {
      setError(err.message || "Could not change password.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-teal-700">Account settings</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Admin Profile</h1>
            <p className="mt-1 text-sm text-slate-500">View your account information and update your email or password.</p>
          </div>
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            <ArrowLeft size={16} /> Dashboard
          </Link>
        </div>

        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
        {success && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</div>}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading profile...</div>
        ) : !profile ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">Profile information is unavailable.</div>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <span className="rounded-xl bg-teal-50 p-3 text-teal-700"><UserRound size={22} /></span>
                <div>
                  <h2 className="font-bold text-slate-900">Account information</h2>
                  <p className="text-sm text-slate-500">Your administrator account details</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">Username</label>
                  <input value={profile.username || ""} readOnly className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-600" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">Account status</label>
                  <input value={profile.account_status || ""} readOnly className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-600" />
                </div>
              </div>
              <form onSubmit={handleProfileSubmit} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="admin-email" className="mb-1 block text-sm font-medium text-slate-600">Email address</label>
                  <input id="admin-email" type="email" required maxLength={150} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
                </div>
                <button type="submit" disabled={savingProfile || email.trim() === (profile.email || "")} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">
                  <Save size={16} /> {savingProfile ? "Saving..." : "Save email"}
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <span className="rounded-xl bg-amber-50 p-3 text-amber-700"><LockKeyhole size={22} /></span>
                <div>
                  <h2 className="font-bold text-slate-900">Change password</h2>
                  <p className="text-sm text-slate-500">Confirm your current password before setting a new one.</p>
                </div>
              </div>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="admin-current-password" className="mb-1 block text-sm font-medium text-slate-600">Current password</label>
                  <input id="admin-current-password" type="password" autoComplete="current-password" required value={passwordForm.current_password} onChange={(e) => setPasswordForm((p) => ({ ...p, current_password: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
                </div>
                <div>
                  <label htmlFor="admin-new-password" className="mb-1 block text-sm font-medium text-slate-600">New password</label>
                  <input id="admin-new-password" type="password" autoComplete="new-password" minLength={8} required value={passwordForm.new_password} onChange={(e) => setPasswordForm((p) => ({ ...p, new_password: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
                </div>
                <button type="submit" disabled={savingPassword} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
                  <LockKeyhole size={16} /> {savingPassword ? "Updating..." : "Change password"}
                </button>
              </form>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Compass, MapPin } from "lucide-react";
import { registerUser } from "../services/api";

export default function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const result = await registerUser({
        username: username.trim(),
        email: email.trim(),
        password,
      });

      setSuccess(result.message || "Registration successful.");

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10";

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f4f8f8] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/70 lg:grid-cols-2">
        {/* TravelMate welcome panel */}
<section className="relative hidden min-h-full overflow-hidden lg:flex">
  {/* Sajek Valley background image */}
  <img
    src="/images/sajek-valley.jpg"
    alt="Sajek Valley, Bangladesh"
    className="absolute inset-0 h-full w-full object-cover"
  />

  {/* Dark teal overlay for readable text */}
  <div className="absolute inset-0 bg-gradient-to-br from-teal-950/75 via-teal-900/55 to-emerald-800/65" />

  <div className="relative flex w-full flex-col justify-between p-10 xl:p-12">
    <div className="flex items-center gap-3 text-white">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur">
        <Compass size={25} />
      </div>
      <span className="text-2xl font-extrabold tracking-tight">
        Travel<span className="text-teal-200">Mate</span>
      </span>
    </div>

    <div className="max-w-lg py-12 text-white">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-teal-100">
        <MapPin size={16} />
        Your journey begins here
      </div>

      <h2 className="text-4xl font-extrabold leading-tight xl:text-5xl">
        Discover Bangladesh, one journey at a time.
      </h2>

      <p className="mt-5 max-w-md text-base leading-7 text-white/90">
        Create your account to explore destinations, discover tour packages,
        and plan your next memorable trip.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {["Explore", "Experience", "Remember"].map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm"
          >
            {item}
          </span>
        ))}
      </div>
    </div>

    <p className="text-sm text-white/75">
      TravelMate · Make every journey memorable
    </p>
  </div>
</section>
        {/* Registration form */}
        <section className="flex items-center justify-center px-5 py-8 sm:px-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-md">
            <Link to="/" className="mb-6 inline-flex items-center gap-2 lg:hidden">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
                <Compass size={22} />
              </span>
              <span className="text-xl font-extrabold text-slate-900">
                Travel<span className="text-teal-600">Mate</span>
              </span>
            </Link>

            <div className="mb-7">
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-teal-700">
                Join TravelMate
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Create account
              </h1>
              <p className="mt-3 text-slate-500">
                Start planning your next adventure.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Choose a username"
                  maxLength={50}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  maxLength={150}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="identityNumber"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Birth Registration ID / NID / Passport No.
                </label>
                <input
                  id="identityNumber"
                  type="text"
                  autoComplete="off"
                  value={identityNumber}
                  onChange={(event) => setIdentityNumber(event.target.value)}
                  placeholder="Enter your ID or passport number"
                  maxLength={50}
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  This field is not saved during registration yet.
                </p>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-teal-700"
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Enter your password again"
                    minLength={8}
                    required
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((prev) => !prev)
                    }
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-teal-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </p>
              )}

              {success && (
                <p
                  role="status"
                  className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700"
                >
                  {success}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-xl bg-teal-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-teal-600/20 transition hover:-translate-y-0.5 hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-bold text-teal-700 hover:text-teal-900"
              >
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
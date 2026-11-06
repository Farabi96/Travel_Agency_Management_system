import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Compass, MapPin } from "lucide-react";
import {
  loginUser,
  getCurrentUser,
  getOwnCustomerProfile,
} from "../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const isEmail = identifier.includes("@");

      const result = await loginUser({
        [isEmail ? "email" : "username"]: identifier.trim(),
        password,
      });

      sessionStorage.setItem("access_token", result.access_token);

      const currentUser = await getCurrentUser(result.access_token);
      sessionStorage.setItem("user", JSON.stringify(currentUser));

      if (currentUser.role_name === "CUSTOMER") {
        const profile = await getOwnCustomerProfile();

        if (profile === null) {
          navigate("/customer/profile");
        } else {
          navigate("/");
        }
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f4f8f8] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[650px] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/70 lg:grid-cols-2">
        {/* Travel image panel */}
        <section className="relative hidden min-h-full overflow-hidden lg:block">
          <img
            src="/images/sajek-valley.jpg"
            alt="Beautiful lake and mountain travel destination"
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/25 to-teal-950/20" />

          <div className="absolute left-10 top-10 flex items-center gap-3 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500 shadow-lg">
              <Compass size={25} />
            </div>
            <span className="text-2xl font-extrabold tracking-tight">
              Travel<span className="text-teal-300">Mate</span>
            </span>
          </div>

          <div className="absolute bottom-12 left-10 right-10 text-white">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">
              <MapPin size={16} />
              Discover somewhere new
            </div>

            <h2 className="max-w-lg text-4xl font-extrabold leading-tight xl:text-5xl">
              Your next journey starts here.
            </h2>

            <p className="mt-5 max-w-md text-base leading-7 text-white/85">
              Explore beautiful destinations, find your perfect tour, and make
              memories that last a lifetime.
            </p>

            <div className="mt-8 flex items-center gap-2">
              <span className="h-1.5 w-8 rounded-full bg-teal-300" />
              <span className="h-1.5 w-3 rounded-full bg-white/50" />
              <span className="h-1.5 w-3 rounded-full bg-white/50" />
            </div>
          </div>
        </section>

        {/* Login form */}
        <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-md">
            <Link
              to="/"
              className="mb-8 inline-flex items-center gap-2 lg:hidden"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
                <Compass size={22} />
              </span>
              <span className="text-xl font-extrabold text-slate-900">
                Travel<span className="text-teal-600">Mate</span>
              </span>
            </Link>

            <div className="mb-8">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-teal-700">
                Welcome to TravelMate
              </p>

              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Welcome back
              </h1>

              <p className="mt-3 text-slate-500">
                Sign in to continue your travel journey.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="identifier"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Username or email
                </label>

                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="Enter username or email"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                />
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
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-12 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-teal-700"
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-teal-600/20 transition hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-teal-700/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? "Signing you in..." : "Sign In"}
              </button>
            </form>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                New to TravelMate?
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <Link
              to="/register"
              className="block w-full rounded-xl border border-teal-200 bg-teal-50 px-4 py-3.5 text-center font-bold text-teal-800 transition hover:border-teal-300 hover:bg-teal-100"
            >
              Create an account
            </Link>

            <p className="mt-8 text-center text-xs leading-5 text-slate-400">
              By signing in, you’re ready to plan your next adventure with
              TravelMate.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
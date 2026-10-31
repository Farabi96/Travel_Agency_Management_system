
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
 import {
  loginUser,
  getCurrentUser,
  getOwnCustomerProfile,
} from "../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
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
    <main className="flex min-h-[80vh] items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-3xl font-bold text-slate-900">
          Welcome Back
        </h1>

        <p className="mb-8 text-slate-600">
          Sign in to continue your travel journey.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="identifier"
              className="mb-2 block text-sm font-medium text-slate-700"
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
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          New to Travel Agency?{" "}
          <Link
            to="/register"
            className="font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}

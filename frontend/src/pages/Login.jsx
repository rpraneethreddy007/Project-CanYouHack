// Login page. Uses Supabase Auth's JS client DIRECTLY (per
// FILE_WORKING_GUIDE.md - "use their JS client directly here rather than
// routing through your own backend for login/signup"). After a successful
// login, calls our own backend's /auth/me to find the user's role, then
// redirects accordingly: professor/TA -> /professor/dashboard,
// student -> /student/dashboard.
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import { getMe } from "../api/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "That email and password don't match our records."
          : authError.message
      );
      setLoading(false);
      return;
    }

    try {
      const profile = await getMe();
      navigate(
        profile.role === "professor" || profile.role === "ta"
          ? "/professor/dashboard"
          : "/student/dashboard"
      );
    } catch {
      // Logged into Supabase but no profile row yet - signup flow was
      // interrupted. Send them back to finish signup rather than a dead end.
      setError("Your account exists but setup didn't finish. Please sign up again.");
      setLoading(false);
      navigate("/signup");
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-paper">
      {/* Brand panel - hidden below md so the form is never pushed below
          the fold on a phone. Ruled-notebook texture ties visually to
          "coursework" without leaning on a stock illustration. */}
      <BrandPanel />

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="md:hidden mb-8">
            <Wordmark dark={false} />
          </div>

          <h1 className="text-2xl font-bold text-ink mb-1">Welcome back</h1>
          <p className="text-ink-soft mb-8">Sign in to continue to your dashboard.</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor="email" className="field-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-input"
                placeholder="you@college.edu"
              />
            </div>

            <div className="mb-2">
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p role="alert" className="mt-3 text-sm text-brick">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-6">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-sm text-ink-soft text-center mt-8">
            New here?{" "}
            <Link to="/signup" className="font-medium text-cobalt hover:text-cobalt-dark">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Wordmark({ dark }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`grid h-8 w-8 place-items-center rounded-md font-display text-sm font-extrabold ${
          dark ? "bg-white text-ink" : "bg-ink text-white"
        }`}
      >
        DP
      </span>
      <span className={`font-display text-lg font-bold ${dark ? "text-white" : "text-ink"}`}>
        DSA Portal
      </span>
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="hidden md:flex relative flex-col justify-between overflow-hidden bg-ink px-12 py-12 text-white">
      {/* Ruled-paper texture: faint horizontal lines like a notebook page,
          rendered once as a background pattern rather than per-element
          borders - a nod to coursework without an off-the-shelf hero image. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]"
      >
        <defs>
          <pattern id="rule-lines" width="100%" height="32" patternUnits="userSpaceOnUse">
            <line x1="0" y1="31.5" x2="100%" y2="31.5" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#rule-lines)" />
      </svg>

      <Wordmark dark />

      <div className="relative max-w-sm">
        <h2 className="font-display text-3xl font-bold leading-snug">
          Assignments, submissions, and integrity checks, in one place.
        </h2>
        <p className="mt-4 text-white/70">
          Post problems, collect code, and see who needs a closer look —
          without spreadsheets or group chats.
        </p>
      </div>

      <p className="relative text-sm text-white/50">For instructors, TAs, and students.</p>
    </div>
  );
}

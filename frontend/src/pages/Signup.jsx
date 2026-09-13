// Signup page. Two-step flow required by our architecture:
//   1. supabase.auth.signUp() creates the login credentials in Supabase.
//   2. createProfile() (our own backend) writes the name+role row into
//      OUR users table, since Supabase has no concept of "role".
// Per ISSUES.md #14 acceptance criteria: non-college emails are rejected
// client-side, with an inline error, before any network call is made.
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import { createProfile } from "../api/client";

const COLLEGE_EMAIL_DOMAIN = import.meta.env.VITE_COLLEGE_EMAIL_DOMAIN;

const ROLES = [
  { value: "student", label: "Student", blurb: "Submit code for your assignments." },
  { value: "ta", label: "Teaching Assistant", blurb: "Review flagged submissions." },
  { value: "professor", label: "Professor", blurb: "Create assignments and review flags." },
];

function isCollegeEmail(value) {
  return value.toLowerCase().trim().endsWith(`@${COLLEGE_EMAIL_DOMAIN.toLowerCase()}`);
}

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Live, so the moment someone finishes typing a personal-email domain
  // they see the problem, rather than only discovering it after Submit.
  const emailError =
    emailTouched && email && !isCollegeEmail(email)
      ? `Use your college email (@${COLLEGE_EMAIL_DOMAIN}).`
      : "";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Client-side domain check FIRST - no network call for a bad domain.
    if (!isCollegeEmail(email)) {
      setEmailTouched(true);
      return;
    }
    if (!role) {
      setError("Choose your role to continue.");
      return;
    }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    try {
      await createProfile({ name, role });
      navigate("/login");
    } catch (err) {
      setError(
        `Account created, but saving your profile failed: ${err.message}. ` +
          "Try logging in — we'll retry the profile step then."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-paper">
      <BrandPanel />

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="md:hidden mb-8">
            <Wordmark />
          </div>

          <h1 className="text-2xl font-bold text-ink mb-1">Create your account</h1>
          <p className="text-ink-soft mb-8">Set up access with your college email.</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor="name" className="field-label">
                Full name
              </label>
              <input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field-input"
                placeholder="Ada Lovelace"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="email" className="field-label">
                College email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                aria-invalid={Boolean(emailError)}
                className={`field-input ${emailError ? "border-brick focus:border-brick" : ""}`}
                placeholder={`you@${COLLEGE_EMAIL_DOMAIN || "college.edu"}`}
              />
              {emailError ? (
                <p role="alert" className="mt-1.5 text-sm text-brick">
                  {emailError}
                </p>
              ) : (
                <p className="mt-1.5 text-sm text-ink-faint">
                  Must end in @{COLLEGE_EMAIL_DOMAIN}.
                </p>
              )}
            </div>

            <div className="mb-5">
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-input"
                placeholder="At least 6 characters"
              />
            </div>

            <fieldset className="mb-2">
              <legend className="field-label">I am a…</legend>
              <div className="grid grid-cols-1 gap-2">
                {ROLES.map((r) => (
                  <label
                    key={r.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 transition-colors ${
                      role === r.value
                        ? "border-cobalt bg-cobalt-soft"
                        : "border-paper-line bg-white hover:border-ink-faint"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={role === r.value}
                      onChange={(e) => setRole(e.target.value)}
                      className="mt-1 accent-cobalt"
                    />
                    <span>
                      <span className="block text-[15px] font-medium text-ink">{r.label}</span>
                      <span className="block text-sm text-ink-soft">{r.blurb}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {error && (
              <p role="alert" className="mt-3 text-sm text-brick">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-6">
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-sm text-ink-soft text-center mt-8">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-cobalt hover:text-cobalt-dark">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-ink font-display text-sm font-extrabold text-white">
        DP
      </span>
      <span className="font-display text-lg font-bold text-ink">DSA Portal</span>
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="hidden md:flex relative flex-col justify-between overflow-hidden bg-ink px-12 py-12 text-white">
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]"
      >
        <defs>
          <pattern id="rule-lines-signup" width="100%" height="32" patternUnits="userSpaceOnUse">
            <line x1="0" y1="31.5" x2="100%" y2="31.5" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#rule-lines-signup)" />
      </svg>

      <div className="relative flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-white font-display text-sm font-extrabold text-ink">
          DP
        </span>
        <span className="font-display text-lg font-bold text-white">DSA Portal</span>
      </div>

      <div className="relative max-w-sm">
        <h2 className="font-display text-3xl font-bold leading-snug">
          One account, the right dashboard.
        </h2>
        <p className="mt-4 text-white/70">
          Your role decides what you see next — a submission form for
          students, a review queue for staff.
        </p>
      </div>

      <p className="relative text-sm text-white/50">Restricted to college email addresses.</p>
    </div>
  );
}

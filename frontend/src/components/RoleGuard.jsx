// Wraps a route element. Redirects to /login if not authenticated, or
// shows a 403 page if the logged-in role isn't in `allow`. Per ISSUES.md
// #15 acceptance criteria: a student typing /professor/flags directly into
// the URL bar must be redirected, not just hidden from the nav menu - this
// component is what makes that true, since it runs on every render of the
// protected page, independent of how the user navigated there.
import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { getMe } from "../api/client";

export default function RoleGuard({ allow, children }) {
  const [status, setStatus] = useState("loading"); // loading | ok | unauthenticated | forbidden
  const [role, setRole] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((profile) => {
        if (cancelled) return;
        setRole(profile.role);
        setStatus(allow.includes(profile.role) ? "ok" : "forbidden");
      })
      .catch(() => {
        if (!cancelled) setStatus("unauthenticated");
      });
    return () => {
      cancelled = true;
    };
  }, [allow]);

  if (status === "loading") {
    // A quiet placeholder rather than a flash of the wrong page - kept
    // deliberately understated (no spinner-as-decoration) since this is
    // normally on screen for a fraction of a second.
    return <div className="min-h-screen bg-paper" />;
  }
  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }
  if (status === "forbidden") {
    const isStaff = role === "professor" || role === "ta";
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper px-6">
        <div className="max-w-sm text-center">
          <p className="font-display text-5xl font-extrabold text-ink-faint mb-4">403</p>
          <h1 className="text-xl font-semibold text-ink mb-2">This page isn't for your role</h1>
          <p className="text-ink-soft mb-6">
            {isStaff
              ? "This area is for students."
              : "This area is for professors and teaching assistants."}
          </p>
          <Link to={isStaff ? "/professor/dashboard" : "/student/dashboard"} className="btn-primary">
            Go to your dashboard
          </Link>
        </div>
      </div>
    );
  }
  return children;
}

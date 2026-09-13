// Role-aware nav bar. Per FILE_WORKING_GUIDE.md, this must exist before any
// page needing auth-gating - other pages assume it's already rendering
// correctly for each role.
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../api/supabaseClient";
import { getMe } from "../api/client";

export default function Navbar() {
  const [profile, setProfile] = useState(null); // { name, role } | null
  const navigate = useNavigate();

  useEffect(() => {
    getMe()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  const isStaff = profile?.role === "professor" || profile?.role === "ta";
  const dashboardPath = isStaff ? "/professor/dashboard" : "/student/dashboard";

  return (
    <nav className="sticky top-0 z-10 border-b border-paper-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link to={dashboardPath} className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-ink font-display text-xs font-extrabold text-white">
            DP
          </span>
          <span className="font-display text-base font-bold text-ink">DSA Portal</span>
        </Link>

        <div className="flex items-center gap-6">
          {profile && (
            <Link
              to={dashboardPath}
              className="text-sm font-medium text-ink-soft hover:text-ink"
            >
              {isStaff ? "Assignments" : "My assignments"}
            </Link>
          )}

          {profile && (
            <div className="flex items-center gap-3 border-l border-paper-line pl-6">
              <div className="text-right leading-tight">
                <p className="text-sm font-medium text-ink">{profile.name}</p>
                <p className="text-xs capitalize text-ink-faint">
                  {profile.role === "ta" ? "Teaching Assistant" : profile.role}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-paper-line px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

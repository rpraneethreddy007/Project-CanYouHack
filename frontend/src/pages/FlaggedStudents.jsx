// Flagged students dashboard. Per ISSUES.md #18:
// - List flagged students per question sorted by total_score desc
// - ScoreBadge breakdown per row (peer % / ai-ref % / perplexity %)
// - top_matched_peer name per row
// - Row click → diff viewer
// - Reviewed / Dismissed action buttons (PATCH /flags/{id})
//
// Route: /professor/questions/:questionId/flags
// Reached by clicking "View flags" on a question in ProfessorDashboard.
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getFlags, updateFlag, runAnalysis } from "../api/client";
import ScoreBadge from "../components/ScoreBadge";
import Navbar from "../components/Navbar";

const STATUS_LABELS = {
  pending: { label: "Pending", cls: "bg-amber-soft text-amber-dark" },
  reviewed: { label: "Reviewed", cls: "bg-teal-soft text-teal-dark" },
  dismissed: { label: "Dismissed", cls: "bg-paper text-ink-faint" },
};

export default function FlaggedStudents() {
  const { questionId } = useParams();
  const navigate = useNavigate();

  const [flags, setFlags] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState("");

  async function loadFlags() {
    try {
      const data = await getFlags(questionId);
      setFlags(data);
    } catch (err) {
      setLoadError(err.message);
    }
  }

  useEffect(() => {
    loadFlags();
  }, [questionId]);

  async function handleRunAnalysis() {
    setRunning(true);
    setRunMsg("");
    try {
      await runAnalysis(questionId);
      setRunMsg("Analysis started in the background. Refresh in a moment to see updated results.");
    } catch (err) {
      setRunMsg(`Failed to start: ${err.message}`);
    } finally {
      setRunning(false);
    }
  }

  async function handleStatusChange(flagId, status) {
    try {
      const updated = await updateFlag(flagId, { status });
      setFlags((prev) =>
        prev.map((f) => (f.id === flagId ? { ...f, status: updated.status } : f))
      );
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <Link
              to="/professor/dashboard"
              className="text-sm font-medium text-ink-soft hover:text-ink"
            >
              ← Dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-ink">Flagged students</h1>
            <p className="mt-1 text-ink-soft text-sm">
              Sorted by combined detection score. Click a row to see the diff.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleRunAnalysis}
              disabled={running}
              className="btn-secondary"
            >
              {running ? "Starting…" : "Run analysis"}
            </button>
            {flags !== null && (
              <button
                onClick={loadFlags}
                className="text-xs text-ink-soft hover:text-ink font-medium"
              >
                Refresh results
              </button>
            )}
          </div>
        </div>

        {runMsg && (
          <div className="mb-4 rounded-lg bg-teal-soft px-4 py-2.5 text-sm text-teal-dark">
            {runMsg}
          </div>
        )}

        {loadError && (
          <div className="mb-4 surface-card border-brick/30 bg-brick-soft px-4 py-3 text-sm text-brick-dark">
            {loadError}
          </div>
        )}

        {flags === null && !loadError ? (
          <SkeletonTable />
        ) : flags && flags.length === 0 ? (
          <div className="surface-card px-6 py-14 text-center">
            <p className="font-display text-lg font-semibold text-ink">No flags yet</p>
            <p className="mt-1.5 text-ink-soft">
              Run the analysis after the submission deadline to detect suspicious submissions.
            </p>
          </div>
        ) : (
          <div className="surface-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-paper-line bg-paper">
                  <th className="px-5 py-3 text-left font-medium text-ink-soft">Student</th>
                  <th className="px-5 py-3 text-left font-medium text-ink-soft">Score</th>
                  <th className="px-5 py-3 text-left font-medium text-ink-soft hidden md:table-cell">
                    Top peer match
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-ink-soft">Status</th>
                  <th className="px-5 py-3 text-left font-medium text-ink-soft">Actions</th>
                </tr>
              </thead>
              <tbody>
                {flags.map((flag) => (
                  <FlagRow
                    key={flag.id}
                    flag={flag}
                    questionId={questionId}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex gap-4 text-xs text-ink-faint">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brick" /> Peer similarity</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber" /> AI reference</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-cobalt" /> Perplexity</span>
        </div>
      </main>
    </>
  );
}

function FlagRow({ flag, questionId, onStatusChange }) {
  const navigate = useNavigate();
  const statusMeta = STATUS_LABELS[flag.status] || STATUS_LABELS.pending;

  return (
    <tr
      className="border-b border-paper-line last:border-0 hover:bg-paper/60 cursor-pointer transition-colors"
      onClick={() => navigate(`/professor/questions/${questionId}/flags/${flag.id}/diff`)}
    >
      {/* Student ID — real name would require a /users/:id endpoint not yet built */}
      <td className="px-5 py-4">
        <span className="font-mono text-[13px] text-ink">{flag.student_id.slice(0, 8)}…</span>
      </td>

      {/* ScoreBadge */}
      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
        <ScoreBadge
          totalScore={flag.total_score}
          peerWeightPct={flag.peer_weight_pct}
          aiRefWeightPct={flag.ai_ref_weight_pct}
          perplexityWeightPct={flag.perplexity_weight_pct}
        />
      </td>

      {/* Top matched peer */}
      <td className="px-5 py-4 hidden md:table-cell">
        {flag.top_matched_peer_id ? (
          <span className="font-mono text-[13px] text-ink-soft">
            {flag.top_matched_peer_id.slice(0, 8)}…
          </span>
        ) : (
          <span className="text-ink-faint">—</span>
        )}
      </td>

      {/* Status badge */}
      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusMeta.cls}`}>
          {statusMeta.label}
        </span>
      </td>

      {/* Action buttons */}
      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2">
          {flag.status !== "reviewed" && (
            <button
              onClick={() => onStatusChange(flag.id, "reviewed")}
              className="rounded-md border border-teal/30 bg-teal-soft px-2.5 py-1 text-xs font-medium text-teal-dark hover:bg-teal/10 transition-colors"
            >
              Reviewed
            </button>
          )}
          {flag.status !== "dismissed" && (
            <button
              onClick={() => onStatusChange(flag.id, "dismissed")}
              className="rounded-md border border-paper-line bg-white px-2.5 py-1 text-xs font-medium text-ink-soft hover:text-ink transition-colors"
            >
              Dismiss
            </button>
          )}
          {flag.status !== "pending" && (
            <button
              onClick={() => onStatusChange(flag.id, "pending")}
              className="rounded-md border border-paper-line bg-white px-2.5 py-1 text-xs font-medium text-ink-faint hover:text-ink transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function SkeletonTable() {
  return (
    <div className="surface-card overflow-hidden">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-[72px] border-b border-paper-line animate-pulse bg-paper-line/30" />
      ))}
    </div>
  );
}

// Professor/TA dashboard. Per ISSUES.md #16: lists existing assignments
// with deadline + question count.
//
// `GET /assignments` (getAssignments) doesn't include a question count, so
// this fetches each assignment's questions in parallel to get one - fine
// at course-assignment scale (dozens, not thousands, of rows).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAssignments, getQuestions } from "../api/client";

export default function ProfessorDashboard() {
  const [assignments, setAssignments] = useState(null); // null = loading
  const [questionCounts, setQuestionCounts] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getAssignments();
        if (cancelled) return;
        setAssignments(data);

        const counts = await Promise.all(
          data.map((a) =>
            getQuestions(a.id)
              .then((qs) => [a.id, qs.length])
              .catch(() => [a.id, null])
          )
        );
        if (!cancelled) setQuestionCounts(Object.fromEntries(counts));
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink">Assignments</h1>
          <p className="text-ink-soft mt-1">Everything you've posted, in one list.</p>
        </div>
        <Link to="/professor/assignments/new" className="btn-primary shrink-0">
          New assignment
        </Link>
      </div>

      {error && (
        <div className="surface-card border-brick/30 bg-brick-soft px-4 py-3 text-sm text-brick-dark mb-6">
          Couldn't load your assignments: {error}
        </div>
      )}

      {assignments === null && !error ? (
        <AssignmentListSkeleton />
      ) : assignments && assignments.length === 0 ? (
        <EmptyState />
      ) : assignments ? (
        <ul className="space-y-3">
          {assignments.map((a) => (
            <AssignmentRow key={a.id} assignment={a} questionCount={questionCounts[a.id]} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function AssignmentRow({ assignment, questionCount }) {
  const deadline = new Date(assignment.deadline);
  const isPast = deadline < new Date();

  return (
    <li>
      <Link
        to={`/professor/assignments/${assignment.id}`}
        // The left stripe is the primary status signal (published vs
        // draft) - the text label next to it repeats the same
        // information for anyone who can't rely on color alone.
        className={`surface-card flex items-center justify-between gap-4 border-l-4 px-5 py-4 transition-colors hover:border-l-4 ${
          assignment.is_draft
            ? "border-l-amber hover:bg-amber-soft/40"
            : "border-l-cobalt hover:bg-cobalt-soft/40"
        }`}
      >
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{assignment.title}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {questionCount === null || questionCount === undefined
              ? "…"
              : `${questionCount} ${questionCount === 1 ? "question" : "questions"}`}
            <span className="mx-2 text-ink-faint">·</span>
            <span className={isPast ? "text-brick" : ""}>
              {isPast ? "Closed" : "Due"} {deadline.toLocaleString()}
            </span>
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            assignment.is_draft ? "bg-amber-soft text-amber-dark" : "bg-cobalt-soft text-cobalt-dark"
          }`}
        >
          {assignment.is_draft ? "Draft" : "Published"}
        </span>
      </Link>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="surface-card flex flex-col items-center px-6 py-16 text-center">
      <p className="font-display text-lg font-semibold text-ink">No assignments yet</p>
      <p className="mt-1.5 max-w-xs text-ink-soft">
        Create your first assignment to start collecting submissions.
      </p>
      <Link to="/professor/assignments/new" className="btn-primary mt-6">
        New assignment
      </Link>
    </div>
  );
}

function AssignmentListSkeleton() {
  return (
    <ul className="space-y-3">
      {[0, 1, 2].map((i) => (
        <li key={i} className="surface-card h-[68px] animate-pulse bg-paper-line/40" />
      ))}
    </ul>
  );
}

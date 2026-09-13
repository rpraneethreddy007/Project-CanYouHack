// Student dashboard. Per ISSUES.md #17 (student-facing question detail +
// upload flow). This page is the entry point: lists all published
// assignments and lets a student drill into a specific question.
//
// GET /assignments returns only non-draft assignments for student tokens
// (enforced server-side), so no client-side filtering needed here.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAssignments, getQuestions } from "../api/client";
import Navbar from "../components/Navbar";

export default function StudentDashboard() {
  const [assignments, setAssignments] = useState(null);
  const [questionMap, setQuestionMap] = useState({}); // { assignmentId: Question[] }
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getAssignments();
        if (cancelled) return;
        setAssignments(data);

        const entries = await Promise.all(
          data.map((a) =>
            getQuestions(a.id)
              .then((qs) => [a.id, qs])
              .catch(() => [a.id, []])
          )
        );
        if (!cancelled) setQuestionMap(Object.fromEntries(entries));
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ink">Your assignments</h1>
          <p className="mt-1 text-ink-soft">Upload your C/C++ solutions before each deadline.</p>
        </div>

        {error && (
          <div className="surface-card border-brick/30 bg-brick-soft px-4 py-3 text-sm text-brick-dark mb-6">
            Couldn't load assignments: {error}
          </div>
        )}

        {assignments === null && !error ? (
          <SkeletonList />
        ) : assignments && assignments.length === 0 ? (
          <div className="surface-card px-6 py-14 text-center">
            <p className="font-display text-lg font-semibold text-ink">Nothing posted yet</p>
            <p className="mt-1.5 text-ink-soft">Check back once your professor publishes an assignment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments &&
              assignments.map((a) => (
                <AssignmentBlock
                  key={a.id}
                  assignment={a}
                  questions={questionMap[a.id]}
                />
              ))}
          </div>
        )}
      </main>
    </>
  );
}

function AssignmentBlock({ assignment, questions }) {
  const deadline = new Date(assignment.deadline);
  const isPast = deadline < new Date();

  return (
    <div className="surface-card overflow-hidden">
      {/* Assignment header */}
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-paper-line">
        <div className="min-w-0">
          <p className="font-semibold text-ink truncate">{assignment.title}</p>
          <p className={`mt-0.5 text-sm ${isPast ? "text-brick" : "text-ink-soft"}`}>
            {isPast ? "Closed" : "Due"} {deadline.toLocaleString()}
          </p>
        </div>
        {assignment.pdf_url && (
          <a
            href={assignment.pdf_url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-sm font-medium text-cobalt hover:text-cobalt-dark"
          >
            PDF ↗
          </a>
        )}
      </div>

      {/* Questions list */}
      {questions === undefined ? (
        <div className="px-5 py-3 text-sm text-ink-faint animate-pulse">Loading questions…</div>
      ) : questions.length === 0 ? (
        <div className="px-5 py-3 text-sm text-ink-faint">No questions yet.</div>
      ) : (
        <ul>
          {questions.map((q) => (
            <li key={q.id} className="border-b border-paper-line last:border-0">
              <Link
                to={`/student/questions/${q.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-paper transition-colors group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="shrink-0 mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-[11px] font-bold text-white font-display">
                    {q.number}
                  </span>
                  <p className="text-sm text-ink line-clamp-2">{q.description}</p>
                </div>
                <span className="shrink-0 text-ink-faint group-hover:text-ink transition-colors">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-4">
      {[0, 1].map((i) => (
        <div key={i} className="surface-card h-36 animate-pulse bg-paper-line/40" />
      ))}
    </div>
  );
}

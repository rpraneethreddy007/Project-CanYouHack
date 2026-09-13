// Question detail + submission upload. Per ISSUES.md #17:
// - Shows question description + PDF link (from the parent assignment)
// - Upload widget for their code file
// - Shows submission status / timestamp
// - Disables upload after deadline
//
// Acceptance criteria: "attempting upload after the deadline shows a
// disabled state with the deadline time shown, not a silent failure."
//
// Route: /student/questions/:questionId
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getQuestions,
  getAssignments,
  uploadSubmission,
  getMySubmission,
} from "../api/client";
import FileUploader from "../components/FileUploader";
import Navbar from "../components/Navbar";

export default function QuestionDetail() {
  const { questionId } = useParams();

  const [question, setQuestion] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [existing, setExisting] = useState(undefined); // undefined = loading, null = none
  const [loadError, setLoadError] = useState("");

  const [file, setFile] = useState(null);
  const [language, setLanguage] = useState("cpp");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitOk, setSubmitOk] = useState(false);

  // Load question + parent assignment + existing submission in parallel.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // We have the questionId but not assignmentId. Get all assignments
        // and their questions to find which assignment this question belongs to.
        const allAssignments = await getAssignments();
        if (cancelled) return;

        let foundQ = null;
        let foundA = null;
        for (const a of allAssignments) {
          const qs = await getQuestions(a.id);
          const match = qs.find((q) => q.id === questionId);
          if (match) {
            foundQ = match;
            foundA = a;
            break;
          }
        }
        if (cancelled) return;

        if (!foundQ) throw new Error("Question not found.");
        setQuestion(foundQ);
        setAssignment(foundA);

        // Try to load existing submission — 404 is expected (no submission yet).
        try {
          const sub = await getMySubmission(questionId);
          if (!cancelled) {
            setExisting(sub);
            if (sub?.language) setLanguage(sub.language);
          }
        } catch {
          if (!cancelled) setExisting(null);
        }
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [questionId]);

  const deadline = assignment ? new Date(assignment.deadline) : null;
  const isPast = deadline ? deadline < new Date() : false;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return setSubmitError("Choose a file first.");
    setSubmitError("");
    setSubmitOk(false);
    setSubmitting(true);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("language", language);

      const result = await uploadSubmission(questionId, file, language);
      setExisting(result);
      setFile(null);
      setSubmitOk(true);
    } catch (err) {
      setSubmitError(err.message || "Upload failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-2xl px-6 py-10">
          <div className="surface-card border-brick/30 bg-brick-soft px-4 py-3 text-sm text-brick-dark">
            {loadError}
          </div>
        </main>
      </>
    );
  }

  if (!question || existing === undefined) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-2xl px-6 py-10 space-y-4">
          <div className="surface-card h-28 animate-pulse bg-paper-line/40" />
          <div className="surface-card h-48 animate-pulse bg-paper-line/40" />
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link
          to="/student/dashboard"
          className="text-sm font-medium text-ink-soft hover:text-ink"
        >
          ← Back to assignments
        </Link>

        {/* Question card */}
        <div className="surface-card mt-4 p-6">
          <div className="flex items-start gap-3">
            <span className="shrink-0 grid h-8 w-8 place-items-center rounded-full bg-ink text-[13px] font-bold text-white font-display">
              {question.number}
            </span>
            <div className="min-w-0">
              <p className="text-ink leading-relaxed">{question.description}</p>
              {assignment?.pdf_url && (
                <a
                  href={assignment.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-cobalt hover:text-cobalt-dark"
                >
                  View assignment PDF ↗
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Deadline banner */}
        <div
          className={`mt-3 rounded-lg px-4 py-2.5 text-sm font-medium ${
            isPast
              ? "bg-brick-soft text-brick-dark"
              : "bg-teal-soft text-teal-dark"
          }`}
        >
          {isPast
            ? `Submission closed — deadline was ${deadline.toLocaleString()}`
            : `Due ${deadline.toLocaleString()}`}
        </div>

        {/* Upload section */}
        <div className="surface-card mt-4 p-6 space-y-5">
          <h2 className="text-base font-semibold text-ink">
            {existing ? "Update your submission" : "Submit your solution"}
          </h2>

          {existing && (
            <div className="rounded-lg bg-teal-soft px-4 py-3 text-sm">
              <p className="font-medium text-teal-dark">Submission received</p>
              <p className="text-teal mt-0.5">
                Uploaded {new Date(existing.submitted_at).toLocaleString()} ·{" "}
                <span className="font-mono">{existing.language.toUpperCase()}</span>
              </p>
            </div>
          )}

          {isPast ? (
            <FileUploader
              accept=".c,.cpp"
              file={null}
              onChange={() => {}}
              disabled={true}
              hint={`Deadline was ${deadline.toLocaleString()}`}
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="field-label">Language</label>
                <div className="flex gap-2">
                  {["c", "cpp"].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        language === lang
                          ? "border-cobalt bg-cobalt-soft text-cobalt-dark"
                          : "border-paper-line bg-white text-ink hover:border-ink-faint"
                      }`}
                    >
                      {lang === "c" ? "C (.c)" : "C++ (.cpp)"}
                    </button>
                  ))}
                </div>
              </div>

              <FileUploader
                accept={language === "c" ? ".c" : ".cpp,.cc,.cxx"}
                file={file}
                onChange={setFile}
                disabled={isPast}
                hint={`Upload your ${language === "c" ? ".c" : ".cpp"} source file.`}
              />

              {submitError && (
                <p role="alert" className="text-sm text-brick">
                  {submitError}
                </p>
              )}

              {submitOk && (
                <p className="text-sm text-teal-dark font-medium">
                  ✓ Submitted successfully.
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !file}
                className="btn-primary w-full"
              >
                {submitting
                  ? "Uploading…"
                  : existing
                  ? "Replace submission"
                  : "Submit"}
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}

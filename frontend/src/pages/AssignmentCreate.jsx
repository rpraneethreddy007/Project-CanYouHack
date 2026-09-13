// Assignment creation page. Per ISSUES.md #16: title, deadline picker, PDF
// upload, then add N questions each with a description and an
// AI-reference-solution file upload.
//
// Acceptance criteria: the AI-reference upload is visually marked
// "professor only - not shown to students" (see the amber badge on each
// question's uploader below) so nobody mistakes it for the student-facing
// PDF upload and wires it into a student component by mistake.
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createAssignment, createQuestion } from "../api/client";

let nextLocalId = 1;
function makeBlankQuestion() {
  return { localId: nextLocalId++, description: "", aiReferenceFile: null };
}

export default function AssignmentCreate() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isDraft, setIsDraft] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [questions, setQuestions] = useState([makeBlankQuestion()]);

  const [error, setError] = useState("");
  const [step, setStep] = useState(""); // progress label while saving
  const [saving, setSaving] = useState(false);

  function updateQuestion(localId, patch) {
    setQuestions((qs) => qs.map((q) => (q.localId === localId ? { ...q, ...patch } : q)));
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, makeBlankQuestion()]);
  }

  function removeQuestion(localId) {
    setQuestions((qs) => (qs.length === 1 ? qs : qs.filter((q) => q.localId !== localId)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!title.trim()) return setError("Give the assignment a title.");
    if (!deadline) return setError("Set a deadline.");

    const usableQuestions = questions.filter((q) => q.description.trim());
    if (usableQuestions.length === 0) {
      return setError("Add at least one question with a description.");
    }

    setSaving(true);
    try {
      setStep("Creating assignment…");
      const assignment = await createAssignment({
        title: title.trim(),
        deadline: new Date(deadline).toISOString(),
        isDraft,
        pdfFile,
      });

      // Sequential, not Promise.all: keeps question numbers in the order
      // shown on screen and surfaces exactly which question failed, if
      // one does, instead of an ambiguous batch error.
      for (let i = 0; i < usableQuestions.length; i++) {
        setStep(`Saving question ${i + 1} of ${usableQuestions.length}…`);
        await createQuestion(assignment.id, {
          number: i + 1,
          description: usableQuestions[i].description.trim(),
          aiReferenceFile: usableQuestions[i].aiReferenceFile,
        });
      }

      navigate("/professor/dashboard");
    } catch (err) {
      // Deliberately don't reset any form state on failure - a professor
      // who's attached three files shouldn't have to redo all of it
      // because the last question's upload failed.
      setError(err.message || "Something went wrong while saving.");
      setStep("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link to="/professor/dashboard" className="text-sm font-medium text-ink-soft hover:text-ink">
        ← Back to assignments
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-ink">New assignment</h1>
      <p className="mt-1 text-ink-soft">Set the deadline, then add each question below.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <section className="surface-card p-6 space-y-5">
          <div>
            <label htmlFor="title" className="field-label">
              Title
            </label>
            <input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field-input"
              placeholder="Assignment 3 — Graphs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="deadline" className="field-label">
                Deadline
              </label>
              <input
                id="deadline"
                type="datetime-local"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="field-input"
              />
            </div>

            <div>
              <span className="field-label">Visibility</span>
              <div className="flex gap-2">
                <VisibilityOption
                  label="Draft"
                  hint="Hidden from students"
                  active={isDraft}
                  onClick={() => setIsDraft(true)}
                />
                <VisibilityOption
                  label="Published"
                  hint="Visible now"
                  active={!isDraft}
                  onClick={() => setIsDraft(false)}
                />
              </div>
            </div>
          </div>

          <FilePicker
            label="Assignment PDF"
            hint="Shown to students on the assignment page. Optional."
            accept=".pdf"
            file={pdfFile}
            onChange={setPdfFile}
          />
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-ink">Questions</h2>
            <span className="text-sm text-ink-faint">
              {questions.length} {questions.length === 1 ? "question" : "questions"}
            </span>
          </div>

          <div className="space-y-4">
            {questions.map((q, i) => (
              <QuestionCard
                key={q.localId}
                index={i}
                question={q}
                onChange={(patch) => updateQuestion(q.localId, patch)}
                onRemove={questions.length > 1 ? () => removeQuestion(q.localId) : null}
              />
            ))}
          </div>

          <button type="button" onClick={addQuestion} className="btn-secondary mt-4">
            + Add another question
          </button>
        </section>

        {error && (
          <p role="alert" className="text-sm text-brick">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? step || "Saving…" : "Create assignment"}
          </button>
          <Link to="/professor/dashboard" className="text-sm font-medium text-ink-soft hover:text-ink">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function VisibilityOption({ label, hint, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg border px-3 py-2 text-left transition-colors ${
        active ? "border-cobalt bg-cobalt-soft" : "border-paper-line bg-white hover:border-ink-faint"
      }`}
    >
      <span className="block text-sm font-medium text-ink">{label}</span>
      <span className="block text-xs text-ink-soft">{hint}</span>
    </button>
  );
}

function QuestionCard({ index, question, onChange, onRemove }) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Numbered marker is legitimate here - questions genuinely are an
            ordered sequence (Q1, Q2, ...), not decoration. */}
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink font-display text-sm font-bold text-white">
          {index + 1}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm font-medium text-ink-faint hover:text-brick"
          >
            Remove
          </button>
        )}
      </div>

      <label htmlFor={`q-desc-${index}`} className="field-label">
        Description
      </label>
      <textarea
        id={`q-desc-${index}`}
        rows={3}
        value={question.description}
        onChange={(e) => onChange({ description: e.target.value })}
        className="field-input resize-y"
        placeholder="Describe the problem the student needs to solve…"
      />

      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="field-label mb-0">AI reference solution</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-soft px-2 py-0.5 text-xs font-medium text-amber-dark">
            <LockIcon />
            Professor only — not shown to students
          </span>
        </div>
        <FilePicker
          label={null}
          hint="Used to check submissions against an AI-generated solution."
          accept=".c,.cpp,.cc,.cxx"
          file={question.aiReferenceFile}
          onChange={(file) => onChange({ aiReferenceFile: file })}
        />
      </div>
    </div>
  );
}

function FilePicker({ label, hint, accept, file, onChange }) {
  return (
    <div>
      {label && <p className="field-label">{label}</p>}
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-paper-line px-4 py-3 text-sm transition-colors hover:border-ink-faint">
        <span className="min-w-0 truncate">
          {file ? (
            <span className="font-mono text-[13px] text-ink">{file.name}</span>
          ) : (
            <span className="text-ink-faint">Click to choose a file</span>
          )}
        </span>
        <span className="shrink-0 rounded-md border border-paper-line bg-white px-2.5 py-1 text-xs font-medium text-ink-soft">
          {file ? "Change" : "Browse"}
        </span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onChange(e.target.files[0] || null)}
        />
      </label>
      {hint && <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
      <path d="M8 1a3 3 0 0 0-3 3v2H4.5A1.5 1.5 0 0 0 3 7.5v6A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 11.5 6H11V4a3 3 0 0 0-3-3Zm-1.5 5V4a1.5 1.5 0 0 1 3 0v2h-3Z" />
    </svg>
  );
}

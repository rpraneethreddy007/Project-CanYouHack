// Single fetch wrapper - every page imports typed helpers from here, never
// calls fetch() directly (per ISSUES.md #20). Attaches the Supabase auth
// token to every request automatically.
//
// Acceptance criteria: changing the backend base URL is a one-line env var
// change - see VITE_API_BASE_URL below, nothing else in this file or any
// page hardcodes a host.
import { supabase } from "./supabaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function authFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  // FormData requests (file uploads) must NOT get a manual Content-Type -
  // the browser sets multipart/form-data with the correct boundary itself.
  // Setting it here would break every upload endpoint below.
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `request failed with status ${res.status}`);
  }

  // run-analysis (issue #11) responds 202 with no/empty body, and PATCH
  // endpoints may return 204 - don't assume every success response is
  // parseable JSON.
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

// ---------------------------------------------------------------------------
// Auth endpoints - backend confirmed (routers/auth.py)
// ---------------------------------------------------------------------------

export function getMe() {
  return authFetch("/auth/me");
}

export function createProfile({ name, role }) {
  return authFetch("/auth/profile", {
    method: "POST",
    body: JSON.stringify({ name, role }),
  });
}

// ---------------------------------------------------------------------------
// Assignments / Questions - backend confirmed (routers/assignments.py).
// POST endpoints are multipart/form-data (title/deadline/etc as fields,
// files as File) because both also take an optional file.
// ---------------------------------------------------------------------------

export function getAssignments() {
  return authFetch("/assignments");
}

export function createAssignment({ title, deadline, isDraft = false, pdfFile }) {
  const form = new FormData();
  form.append("title", title);
  form.append("deadline", deadline); // ISO string - FastAPI parses to datetime
  form.append("is_draft", String(isDraft));
  if (pdfFile) form.append("pdf", pdfFile);

  return authFetch("/assignments", { method: "POST", body: form });
}

export function getQuestions(assignmentId) {
  return authFetch(`/assignments/${assignmentId}/questions`);
}

export function createQuestion(assignmentId, { number, description, aiReferenceFile }) {
  const form = new FormData();
  form.append("number", String(number));
  form.append("description", description);
  if (aiReferenceFile) form.append("ai_reference_solution", aiReferenceFile);

  return authFetch(`/assignments/${assignmentId}/questions`, {
    method: "POST",
    body: form,
  });
}

// ---------------------------------------------------------------------------
// Submissions - routers/submissions.py (ISSUES.md #7).
// `language` is required by the backend as a form field ("c" or "cpp").
// The previous stub was missing it — fixed here.
// ---------------------------------------------------------------------------

export function uploadSubmission(questionId, file, language) {
  const form = new FormData();
  form.append("file", file);
  form.append("language", language); // required by routers/submissions.py

  return authFetch(`/questions/${questionId}/submissions`, {
    method: "POST",
    body: form,
  });
}

export function getMySubmission(questionId) {
  return authFetch(`/questions/${questionId}/submissions/me`);
}

// ---------------------------------------------------------------------------
// Flags - routers/flags.py (ISSUES.md #11).
// ---------------------------------------------------------------------------

export function runAnalysis(questionId) {
  return authFetch(`/questions/${questionId}/run-analysis`, { method: "POST" });
}

export function getFlags(questionId) {
  return authFetch(`/questions/${questionId}/flags`);
}

export function updateFlag(flagId, { status }) {
  return authFetch(`/flags/${flagId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

"""
File storage wrapper. Per ISSUES.md #5: two dumb I/O functions, no business
logic (file-type validation etc. belongs in the router that calls this, per
FILE_WORKING_GUIDE.md).

Two backends, picked automatically:
  - Supabase Storage, if SUPABASE_URL + SUPABASE_SECRET_KEY are set (see
    backend/.env.example). Uses the raw Storage REST API via urllib
    (stdlib only - no new dependency) rather than a Supabase SDK, since we
    only need two calls (upload object / read object) and the secret key
    is enough to bypass RLS for both.
  - Local disk fallback otherwise, under LOCAL_STORAGE_ROOT. This is what
    lets `download_file(upload_file(...))` be tested (and the assignment
    PDF / submission upload flow to work end to end) before a real
    Supabase project + bucket exist - per HANDOFF.md, DB password/secret
    key are still placeholders as of this session.

Both backends return a URL that download_file() can turn back into the
original bytes - callers (routers, services) never need to know which
backend produced it.

BUCKET VISIBILITY POLICY (fixes the medium bug from the previous review):
  - assignment-pdfs    -> PUBLIC  (students need to read the PDF)
  - ai-references      -> PRIVATE (never shown to students — signed URLs)
  - submissions        -> PRIVATE (students must not see each other's code)

upload_file() returns the correct kind of URL for each bucket.
download_file() detects signed vs public URLs and fetches accordingly.
The signed URL generated here is valid for SIGNED_URL_EXPIRY_SECONDS
(1 hour by default). For the batch analysis job, the job typically
finishes in minutes, so this is fine. Raise the value if you schedule
very long jobs.
"""

import json
import mimetypes
import os
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import quote

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY")

_USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_SECRET_KEY)

# Buckets that serve their objects publicly (no auth needed to download).
# Everything else gets a signed URL, which requires the secret key.
_PUBLIC_BUCKETS = {"assignment-pdfs"}

# How long a signed download URL is valid for (seconds). 1 hour is enough
# for any single batch-analysis job run; extend only if you add a very
# long-running async step that downloads files after this point.
SIGNED_URL_EXPIRY_SECONDS = 3600

LOCAL_STORAGE_ROOT = Path(
    os.environ.get(
        "LOCAL_STORAGE_ROOT", Path(__file__).resolve().parent.parent / "local_storage"
    )
)


def upload_file(bucket: str, path: str, file_bytes: bytes) -> str:
    """
    Uploads `file_bytes` to `bucket/path` and returns a URL that
    `download_file` can later use to read the same bytes back.

    For public buckets (assignment-pdfs) the URL is a plain public object
    URL. For private buckets (submissions, ai-references) it is a signed
    URL valid for SIGNED_URL_EXPIRY_SECONDS.
    """
    if _USE_SUPABASE:
        return _upload_supabase(bucket, path, file_bytes)
    return _upload_local(bucket, path, file_bytes)


def download_file(url: str) -> bytes:
    """
    Reads back whatever `upload_file` produced a URL for, regardless of
    which backend or bucket type produced it.
    """
    if url.startswith("file://"):
        return _download_local(url)
    return _download_http(url)


# ---------------------------------------------------------------------------
# Supabase Storage backend
# ---------------------------------------------------------------------------


def _supabase_headers() -> dict:
    return {
        "Authorization": f"Bearer {SUPABASE_SECRET_KEY}",
        "apikey": SUPABASE_SECRET_KEY,
    }


def _upload_supabase(bucket: str, path: str, file_bytes: bytes) -> str:
    content_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{quote(path)}"

    request = urllib.request.Request(
        upload_url,
        data=file_bytes,
        method="POST",
        headers={
            **_supabase_headers(),
            "Content-Type": content_type,
            # Lets a retry/re-upload to the same path overwrite instead of
            # 409-ing - useful for e.g. re-uploading a corrected AI
            # reference solution to the same question.
            "x-upsert": "true",
        },
    )
    try:
        with urllib.request.urlopen(request) as response:
            response.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(
            f"Supabase Storage upload failed ({e.code}): {e.read().decode(errors='replace')}"
        ) from e

    if bucket in _PUBLIC_BUCKETS:
        return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{quote(path)}"
    else:
        return _create_signed_url(bucket, path)


def _create_signed_url(bucket: str, path: str) -> str:
    """
    Creates a signed download URL for a private-bucket object.
    POST /storage/v1/object/sign/{bucket}/{path}
    Returns a URL like: {SUPABASE_URL}/storage/v1/object/sign/{bucket}/{path}?token=...
    """
    sign_url = f"{SUPABASE_URL}/storage/v1/object/sign/{bucket}/{quote(path)}"
    body = json.dumps({"expiresIn": SIGNED_URL_EXPIRY_SECONDS}).encode()
    request = urllib.request.Request(
        sign_url,
        data=body,
        method="POST",
        headers={
            **_supabase_headers(),
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request) as response:
            data = json.loads(response.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(
            f"Supabase signed URL creation failed ({e.code}): {e.read().decode(errors='replace')}"
        ) from e

    signed_path = data.get("signedURL") or data.get("signedUrl") or data.get("url")
    if not signed_path:
        raise RuntimeError(f"Unexpected Supabase sign response: {data}")

    # Supabase returns a path like /storage/v1/object/sign/... — prepend base URL
    if signed_path.startswith("/"):
        return f"{SUPABASE_URL}{signed_path}"
    return signed_path


def _download_http(url: str) -> bytes:
    # Public-bucket URLs and already-signed URLs both work without extra
    # headers. Only add the secret-key header for unsigned Supabase URLs
    # (shouldn't happen in production, but keeps local testing safe).
    headers = {}
    if _USE_SUPABASE and SUPABASE_URL and url.startswith(SUPABASE_URL):
        if "/object/sign/" not in url and "/object/public/" not in url:
            headers = _supabase_headers()

    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request) as response:
            return response.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"download_file failed ({e.code}) for {url}") from e


# ---------------------------------------------------------------------------
# Local disk fallback
# ---------------------------------------------------------------------------


def _local_path(bucket: str, path: str) -> Path:
    return LOCAL_STORAGE_ROOT / bucket / path


def _upload_local(bucket: str, path: str, file_bytes: bytes) -> str:
    full_path = _local_path(bucket, path)
    full_path.parent.mkdir(parents=True, exist_ok=True)
    full_path.write_bytes(file_bytes)
    return f"file://{full_path.resolve()}"


def _download_local(url: str) -> bytes:
    local_path = Path(url[len("file://"):])
    return local_path.read_bytes()

const DEBUG_ENDPOINT =
  'http://127.0.0.1:7609/ingest/c67050c9-a8f0-4587-bb28-3e585f8f08c7';
const DEBUG_SESSION = '52e1d1';

/** Debug-mode NDJSON logger. Never pass secrets (tokens, PII). */
export function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = 'verify',
) {
  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': DEBUG_SESSION,
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION,
      location,
      message,
      data,
      hypothesisId,
      runId,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

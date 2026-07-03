import { useState, useEffect, useRef } from "react";

interface ReportPreviewState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const DEBOUNCE_MS = 600;
const LOADING_DELAY_MS = 200;

/**
 * Fetches preview data from the backend with debouncing and abort support.
 *
 * @param url - Full URL to fetch, or null when the caller isn't ready yet.
 *              Passing null resets the state to { data: null, loading: false, error: null }.
 *
 * @returns { data, loading, error }
 *   - `loading` is only set to true after 200 ms (avoids a flash for fast responses).
 *   - Previous in-flight requests are aborted when `url` changes or the component unmounts.
 *   - Requests are debounced by 600 ms so rapid filter changes don't spam the server.
 */
export function useReportPreview<T>(
  url: string | null
): ReportPreviewState<T> {
  const [state, setState] = useState<ReportPreviewState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  // Keep a stable ref to the AbortController so we can cancel across renders.
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // When the caller clears the URL, reset everything immediately.
    if (url === null) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    // Cancel any previous in-flight request.
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    // Timers we'll need to clean up.
    let debounceTimer: ReturnType<typeof setTimeout>;
    let loadingTimer: ReturnType<typeof setTimeout>;
    let isCancelled = false;

    // Create a fresh controller for this fetch.
    const controller = new AbortController();
    controllerRef.current = controller;

    // Start the debounce window.
    debounceTimer = setTimeout(async () => {
      if (isCancelled) return;

      // Only show the spinner if the response takes more than LOADING_DELAY_MS.
      loadingTimer = setTimeout(() => {
        if (!isCancelled) {
          setState((prev) => ({ ...prev, loading: true, error: null }));
        }
      }, LOADING_DELAY_MS);

      const token = localStorage.getItem("auth_token");

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        // Clear the loading-indicator timer — the response arrived.
        clearTimeout(loadingTimer);

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("auth_token");
            window.location.href = "/login";
            return;
          }
          let message = `Error ${response.status}: ${response.statusText}`;
          try {
            const body = await response.json();
            if (body?.detail) {
              message = Array.isArray(body.detail)
                ? body.detail
                    .map((e: { loc?: string[]; msg: string }) => {
                      const field = e.loc?.slice(1).join(".") ?? "unknown";
                      return `${field}: ${e.msg}`;
                    })
                    .join(" · ")
                : String(body.detail);
            }
          } catch {
            // body wasn't JSON — use the status message we already built.
          }
          if (!isCancelled) {
            setState({ data: null, loading: false, error: message });
          }
          return;
        }

        const data: T = await response.json();

        if (!isCancelled) {
          setState({ data, loading: false, error: null });
        }
      } catch (err: unknown) {
        clearTimeout(loadingTimer);

        // AbortError is expected when we cancel — not a user-visible error.
        if ((err as Error)?.name === "AbortError") return;

        if (!isCancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "Error desconocido al cargar la vista previa";
          setState({ data: null, loading: false, error: message });
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      isCancelled = true;
      clearTimeout(debounceTimer);
      clearTimeout(loadingTimer);
      controller.abort();
    };
  }, [url]);

  return state;
}

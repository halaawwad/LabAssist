import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiNotConfiguredError,
  MarketApiError,
  SessionUnavailableError,
  type Page,
} from "./client";
export type LoadStatus = "idle" | "loading" | "ready" | "error" | "session" | "unconfigured";
export function describeFailure(error: unknown): { status: LoadStatus; message: string } {
  if (error instanceof SessionUnavailableError)
    return { status: "session", message: error.message };
  if (error instanceof ApiNotConfiguredError)
    return { status: "unconfigured", message: error.message };
  if (error instanceof MarketApiError && error.status === 401)
    return {
      status: "session",
      message: "Your LabAssist session ended. Sign in again to continue.",
    };
  return {
    status: "error",
    message:
      error instanceof Error && error.message
        ? error.message
        : "Something went wrong. Please retry.",
  };
}
const isAbort = (error: unknown) => (error as { name?: string } | null)?.name === "AbortError";
export function useDebouncedValue<T>(value: T, delay = 300) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}
type PagedState<T> = {
  status: LoadStatus;
  items: T[];
  nextCursor: string | null;
  message: string;
  loadingMore: boolean;
  moreError: string;
};
const emptyPage = { items: [], nextCursor: null, message: "", loadingMore: false, moreError: "" };
/**
 * Loads the first page whenever `key` changes and appends pages on demand. Responses from superseded
 * keys are discarded (and their requests aborted), so a slow old search can never overwrite newer results.
 * `load` is null when the resource is not needed yet.
 */
export function usePagedResource<T>(
  key: string,
  load: ((cursor: string | null, signal: AbortSignal) => Promise<Page<T>>) | null,
  dependency?: unknown,
) {
  const [state, setState] = useState<PagedState<T>>({
    status: load ? "loading" : "idle",
    ...emptyPage,
  });
  const loader = useRef(load),
    generation = useRef(0),
    controller = useRef<AbortController | null>(null),
    moreInFlight = useRef(false),
    cursor = useRef<string | null>(null);
  useEffect(() => {
    loader.current = load;
  });
  const start = useCallback(() => {
    const current = ++generation.current;
    controller.current?.abort();
    moreInFlight.current = false;
    cursor.current = null;
    const run = loader.current;
    if (!run) {
      setState({ status: "idle", ...emptyPage });
      return;
    }
    const abort = new AbortController();
    controller.current = abort;
    setState({ status: "loading", ...emptyPage });
    run(null, abort.signal).then(
      (page) => {
        if (current !== generation.current) return;
        cursor.current = page.nextCursor;
        setState({ status: "ready", ...emptyPage, items: page.items, nextCursor: page.nextCursor });
      },
      (error) => {
        if (current !== generation.current || isAbort(error)) return;
        setState({ ...emptyPage, ...describeFailure(error) });
      },
    );
  }, []);
  useEffect(() => {
    start();
    const activeGeneration = generation;
    return () => {
      activeGeneration.current++;
      controller.current?.abort();
    };
  }, [key, start, dependency]);
  const loadMore = useCallback(() => {
    const run = loader.current,
      next = cursor.current;
    if (!run || !next || moreInFlight.current) return;
    moreInFlight.current = true;
    const current = generation.current,
      signal = controller.current?.signal ?? new AbortController().signal;
    setState((s) => ({ ...s, loadingMore: true, moreError: "" }));
    run(next, signal).then(
      (page) => {
        if (current !== generation.current) return;
        moreInFlight.current = false;
        cursor.current = page.nextCursor;
        setState((s) => ({
          ...s,
          items: [...s.items, ...page.items],
          nextCursor: page.nextCursor,
          loadingMore: false,
        }));
      },
      (error) => {
        if (current !== generation.current || isAbort(error)) return;
        moreInFlight.current = false;
        const failure = describeFailure(error);
        setState((s) =>
          failure.status === "error"
            ? { ...s, loadingMore: false, moreError: failure.message }
            : { ...emptyPage, ...failure },
        );
      },
    );
  }, []);
  return { ...state, loadMore, retry: start };
}
type ResourceState<T> = { status: LoadStatus; data: T | null; message: string };
/** Single resource with the same stale-response protection as usePagedResource. */
export function useMarketResource<T>(
  key: string,
  load: ((signal: AbortSignal) => Promise<T>) | null,
  dependency?: unknown,
) {
  const [state, setState] = useState<ResourceState<T>>({
    status: load ? "loading" : "idle",
    data: null,
    message: "",
  });
  const loader = useRef(load),
    generation = useRef(0),
    controller = useRef<AbortController | null>(null);
  useEffect(() => {
    loader.current = load;
  });
  const start = useCallback(() => {
    const current = ++generation.current;
    controller.current?.abort();
    const run = loader.current;
    if (!run) {
      setState({ status: "idle", data: null, message: "" });
      return;
    }
    const abort = new AbortController();
    controller.current = abort;
    setState({ status: "loading", data: null, message: "" });
    run(abort.signal).then(
      (data) => current === generation.current && setState({ status: "ready", data, message: "" }),
      (error) => {
        if (current !== generation.current || isAbort(error)) return;
        setState({ data: null, ...describeFailure(error) });
      },
    );
  }, []);
  useEffect(() => {
    start();
    const activeGeneration = generation;
    return () => {
      activeGeneration.current++;
      controller.current?.abort();
    };
  }, [key, start, dependency]);
  return { ...state, retry: start };
}

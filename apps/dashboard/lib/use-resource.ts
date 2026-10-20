"use client";
import { useEffect, useState } from "react";

export async function requestJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok || data.error)
    throw new Error(data.error || "The request failed. Try again.");
  return data as T;
}

export function useResource<T>(url: string) {
  const [state, setState] = useState<{
    data: T | null;
    error: string;
    loading: boolean;
  }>({ data: null, error: "", loading: true });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    requestJson<T>(url)
      .then((data) => {
        if (active) setState({ data, error: "", loading: false });
      })
      .catch(() => {
        if (active)
          setState({
            data: null,
            error:
              "Could not load this page. Check your connection and try again.",
            loading: false,
          });
      });
    return () => {
      active = false;
    };
  }, [url, revision]);
  const reload = () => {
    setState({ data: null, error: "", loading: true });
    setRevision((value) => value + 1);
  };
  return { ...state, reload };
}

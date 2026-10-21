"use client";
export function LoadState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  if (error)
    return (
      <div role="alert" className="meter-error">
        <p>{error}</p>
        <button type="button" onClick={retry}>
          Try again
        </button>
      </div>
    );
  if (loading)
    return (
      <p role="status" className="meter-loading">
        Loading records…
      </p>
    );
  return null;
}

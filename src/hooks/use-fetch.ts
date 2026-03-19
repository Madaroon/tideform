import { useState, useEffect, useCallback } from "react";

// ─── Generic Fetch Hook ──────────────────────────────────────────────────────

interface UseFetchOptions {
  immediate?: boolean;
}

export function useFetch<T>(url: string, options?: UseFetchOptions) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(options?.immediate !== false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || "Request failed");
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [url]);

  useEffect(() => {
    if (options?.immediate !== false) {
      fetchData();
    }
  }, [fetchData, options?.immediate]);

  return { data, loading, error, refetch: fetchData };
}

// ─── Mutation Hook ───────────────────────────────────────────────────────────

export function useMutation<TInput, TOutput>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST"
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (body?: TInput): Promise<TOutput | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
          const err = await res
            .json()
            .catch(() => ({ error: "Request failed" }));
          throw new Error(err.error || "Request failed");
        }
        const json = await res.json();
        setLoading(false);
        return json as TOutput;
      } catch (e: any) {
        setError(e.message);
        setLoading(false);
        return null;
      }
    },
    [url, method]
  );

  return { mutate, loading, error };
}

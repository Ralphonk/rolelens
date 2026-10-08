export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api" + path, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const result = await response
    .json()
    .catch(() => ({ error: "The server is unavailable. Please try again." }));
  if (!response.ok) {
    const isPublicAuthRequest =
      path === "/auth/me" ||
      path === "/auth/login" ||
      path === "/auth/register" ||
      path.startsWith("/auth/password-reset/");
    const expiredSession = response.status === 401 && !isPublicAuthRequest;
    if (expiredSession && typeof window !== "undefined") {
      window.dispatchEvent(new Event("rolelens:session-expired"));
      throw new Error("");
    }
    throw new Error(result.error || "Something went wrong.");
  }
  return result;
}

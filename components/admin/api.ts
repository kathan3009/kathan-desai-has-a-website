/** Shared response handling for the existing authenticated admin endpoints. */
export async function adminRequest<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", ...init });
  } catch {
    throw new Error("Could not reach the server. Your changes may not have been received. Check your connection and refresh the list before retrying.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new Error("Your session has expired. Sign in again in another tab, then retry. Your form is still here.");
    throw new Error(typeof data?.error === "string" ? data.error : `Request failed (${response.status}). Your changes have not been confirmed. Refresh the list before retrying.`);
  }
  if (data === null) throw new Error("The server returned an unreadable response. Refresh the list to check whether the change was saved before retrying.");
  return data as T;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The request failed. Please try again.";
}

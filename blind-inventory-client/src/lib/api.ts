const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("blind_token")

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  }

  // Don't set Content-Type for FormData (let browser set it with boundary)
  if (options.body instanceof FormData) {
    delete headers["Content-Type"]
  }

  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  }).then((res) => {
    if (res.status === 401) {
      localStorage.removeItem("blind_token")
      localStorage.removeItem("blind_user")
      window.location.href = "/login"
    }
    return res
  })
}

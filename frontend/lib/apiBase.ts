const PROD_API = "https://krishidrishti-ai-jtp6.onrender.com";

/** FastAPI origin. On localhost, always use :8000 so officer auth is not sent to Render. */
export function getApiBase(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:8000";
    }
  }
  const fromEnv = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return PROD_API;
}

export function apiError(detail: unknown, fallback: string, status?: number) {
  if (status === 404) {
    return "Officer auth is not on the live API yet. Start FastAPI locally: cd backend && python -m uvicorn main:app --reload --port 8000";
  }
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  return fallback;
}

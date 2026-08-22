const TOKEN_KEY = "krishidrishti_officer_token";
const OFFICER_KEY = "krishidrishti_officer_profile";
export const OFFICER_AUTH_EVENT = "krishidrishti-officer";

export type OfficerProfile = {
  id?: string;
  email: string;
  name?: string;
  address?: string;
  district?: string;
  district_id?: number;
  state?: string;
  state_id?: number | null;
  created_at?: string;
};

function emitAuth() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OFFICER_AUTH_EVENT));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getOfficer(): OfficerProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(OFFICER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OfficerProfile;
  } catch {
    return null;
  }
}

export function officerLocation(officer?: OfficerProfile | null): string {
  if (!officer) return "";
  return (officer.address || officer.district || "").trim();
}

export function setToken(token: string, officer?: OfficerProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  if (officer) {
    localStorage.setItem(OFFICER_KEY, JSON.stringify(officer));
  }
  emitAuth();
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(OFFICER_KEY);
  emitAuth();
}

export function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

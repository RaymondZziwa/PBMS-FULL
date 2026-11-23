import { useEffect, useState } from "react";
import { apiRequest, baseURL } from "../../libs/apiConfig";

export type Company = {
  id: number;
  name: string;
  email: string;
  tel1: string;
  tel2?: string | null;
  address: string;
  logo?: string | null;
  website?: string | null;
  tinNumber?: string | null;
  description?: string | null;
};

let cache: Company | null = null;
let pending: Promise<Company | null> | null = null;
const listeners = new Set<(c: Company | null) => void>();

const load = (force = false) => {
  if (!force && (cache || pending)) return pending ?? Promise.resolve(cache);
  pending = apiRequest<Company | null>("/api/company/profile", "GET")
    .then((c) => {
      cache = c ?? null;
      listeners.forEach((l) => l(cache));
      return cache;
    })
    .catch(() => cache)
    .finally(() => {
      pending = null;
    });
  return pending;
};

// The company profile screen fires this after saving.
if (typeof window !== "undefined") window.addEventListener("pbms:company-updated", () => void load(true));

/** Absolute URL for the uploaded logo, or null. */
export const companyLogoUrl = (c?: Company | null) => (c?.logo ? (c.logo.startsWith("http") ? c.logo : `${baseURL}${c.logo}`) : null);

/** The company profile (name, contacts, logo), loaded once and shared. */
const useCompany = () => {
  const [company, setCompany] = useState<Company | null>(cache);
  useEffect(() => {
    listeners.add(setCompany);
    void load();
    return () => {
      listeners.delete(setCompany);
    };
  }, []);
  return company;
};

export default useCompany;

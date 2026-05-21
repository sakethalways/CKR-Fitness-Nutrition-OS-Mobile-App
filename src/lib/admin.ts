import { supabase } from "@/lib/supabase";

// Single admin per project for the prototype. Cached after first lookup.
let cachedAdminId: string | null = null;

export const getAdminId = async (): Promise<string | null> => {
  if (cachedAdminId) return cachedAdminId;
  const { data, error } = await supabase
    .from("admins")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    // eslint-disable-next-line no-console
    console.warn("[admin] could not find admin row", error);
    return null;
  }
  cachedAdminId = data.id;
  return cachedAdminId;
};

export const resetAdminCache = () => {
  cachedAdminId = null;
};

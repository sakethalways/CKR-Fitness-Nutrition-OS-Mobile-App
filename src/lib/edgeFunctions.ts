import { supabase } from "@/lib/supabase";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";

const callFunction = async <T>(
  name: string,
  body: any
): Promise<T> => {
  const {
    data: { session }
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not signed in");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ""
    },
    body: JSON.stringify(body)
  });
  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    throw new Error(json?.error ?? `Function ${name} failed (${res.status})`);
  }
  return json as T;
};

export const createTrainerFn = (input: {
  name: string;
  mobile: string;
  age: number;
  gender: "M" | "F" | "Other";
  password: string;
}) => callFunction<{ id: string }>("create_trainer", input);

export const deleteTrainerFn = (id: string) =>
  callFunction<{ ok: true }>("delete_trainer", { id });

export const updateTrainerPasswordFn = (id: string, password: string) =>
  callFunction<{ ok: true }>("update_trainer_password", { id, password });

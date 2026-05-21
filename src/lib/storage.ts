// Expo SDK 54 split expo-file-system into a new (File-based) module + a
// legacy module that still exposes readAsStringAsync. We use legacy because
// it's the simplest reliable path for "read URI as base64 → upload".
import * as FileSystem from "expo-file-system/legacy";
import { decode as decodeBase64 } from "base64-arraybuffer";
import { supabase } from "@/lib/supabase";

/**
 * Upload a local image URI (from expo-image-picker / camera) to the public
 * `avatars` bucket under the user's own folder. Returns the public URL.
 *
 * The bucket's RLS policy enforces that uploads land under
 *   avatars/{auth.uid()}/...
 * — passing a different `userId` will be rejected server-side.
 */
export const uploadAvatar = async (
  userId: string,
  localUri: string
): Promise<string> => {
  // Read the file as base64 → decode to ArrayBuffer (reliable RN path)
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: "base64"
  });
  const arrayBuffer = decodeBase64(base64);

  const ext = guessExt(localUri);
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, arrayBuffer, {
      contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
      upsert: true,
      cacheControl: "3600"
    });
  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  // Bust cache when the URL stays the same but the bytes changed
  return `${data.publicUrl}?t=${Date.now()}`;
};

export const deleteAvatar = async (userId: string): Promise<void> => {
  const paths = ["jpg", "jpeg", "png"].map((e) => `${userId}/avatar.${e}`);
  await supabase.storage.from("avatars").remove(paths);
};

const guessExt = (uri: string): string => {
  const m = uri.toLowerCase().match(/\.(\w{2,5})(\?|$)/);
  const ext = m?.[1] ?? "jpg";
  return ext === "jpeg" ? "jpg" : ext;
};

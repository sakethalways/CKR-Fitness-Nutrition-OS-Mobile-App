import { Linking, Alert } from "react-native";

/**
 * Helpers for the per-dish Instagram recipe reel link.
 *
 * A meal's reel is optional: callers should only render a link button when
 * `hasReel(meal.reelUrl)` is true, so a blank link never shows a dead button.
 */

/** True when the value is a usable http(s) link (we don't hard-require IG). */
export function hasReel(url: string | null | undefined): url is string {
  if (!url) return false;
  const t = url.trim();
  return /^https?:\/\/\S+$/i.test(t);
}

/** True when the link points at instagram.com — used for soft form validation. */
export function isInstagramUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?instagram\.com\/\S+/i.test(url.trim());
}

/**
 * Open the reel. On a device with the Instagram app installed, the
 * instagram.com universal link opens the app; otherwise it falls back to the
 * browser. Never throws at the call site — failures show a friendly alert.
 */
export async function openReel(url: string | null | undefined): Promise<void> {
  if (!hasReel(url)) return;
  const target = url.trim();
  try {
    await Linking.openURL(target);
  } catch {
    Alert.alert(
      "Couldn't open the reel",
      "We couldn't open this link. Please check your internet connection and try again."
    );
  }
}

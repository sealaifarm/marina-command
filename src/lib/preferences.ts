// Small UI preferences saved in cookies so the server can render the right
// layout on the first paint (no flash when the sidebar is collapsed).
export const SIDEBAR_COOKIE = "mc_sidebar_collapsed";
export const MARINA_COOKIE = "mc_marina";

export function savePreference(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

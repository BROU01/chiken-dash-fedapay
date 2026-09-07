/**
 * Base path of the app: "" locally, "/chiken_dash" when hosted on
 * GitHub Pages (https://brou01.github.io/chiken_dash/).
 * Vite injects BASE_URL from the `--base` build flag / `base` config.
 */
export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Prefix an in-app path with the deploy base so links work on any host. */
export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}

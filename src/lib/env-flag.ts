// Build-environment flag.
// In the Cloudflare deploy workspace this file is replaced with `= true` before
// the production build, which switches the server runtime to D1 + Workers APIs.
export const WORKERS_DEPLOY = false;

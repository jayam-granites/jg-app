interface WorkerEnv {
  ASSETS: { fetch: typeof fetch }
  API: { fetch: typeof fetch }
}

/**
 * Cloudflare entry point for the web app.
 *
 * Static files are served by the ASSETS binding. API traffic is forwarded to
 * the jg-app-api Worker through a service binding so the browser only ever
 * talks to one origin (no CORS preflight, same-site auth cookies).
 */
export default {
  fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const { pathname } = new URL(request.url)

    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return env.API.fetch(request)
    }

    return env.ASSETS.fetch(request)
  },
}

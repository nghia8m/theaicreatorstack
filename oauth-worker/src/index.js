/**
 * GitHub OAuth handler for Sveltia CMS / Decap CMS on Cloudflare Workers.
 *
 * Flow (Decap-compatible):
 *   1. CMS opens popup -> GET /auth   -> redirect to GitHub authorize
 *   2. GitHub -> GET /callback?code   -> exchange code for token
 *   3. Worker returns HTML that postMessages the token back to the CMS window.
 *
 * Required secrets: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
 */

const GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN = "https://github.com/login/oauth/access_token";

function renderResult(status, contentJson) {
  // status: "success" | "error"
  return `<!doctype html><html><head><meta charset="utf-8"><title>Authorizing…</title></head>
<body>
<script>
  (function () {
    function receiveMessage(e) {
      // Send the token payload back to the CMS window that opened this popup.
      window.opener.postMessage(
        'authorization:github:${status}:${contentJson}',
        e.origin
      );
      window.removeEventListener('message', receiveMessage, false);
    }
    window.addEventListener('message', receiveMessage, false);
    // Kick off the handshake — the CMS listens for this and replies.
    window.opener.postMessage('authorizing:github', '*');
  })();
</script>
<p>Authorizing… you can close this window if it does not close automatically.</p>
</body></html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    const clientId = env.GITHUB_CLIENT_ID;
    const clientSecret = env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return new Response("OAuth worker is not configured: missing GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET secrets.", {
        status: 500,
      });
    }

    // Step 1: start the OAuth dance
    if (pathname === "/auth") {
      const scope = url.searchParams.get("scope") || "repo,user";
      const state = crypto.randomUUID();
      const redirectUri = `${url.origin}/callback`;
      const authUrl = new URL(GITHUB_AUTHORIZE);
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("scope", scope);
      authUrl.searchParams.set("state", state);
      return Response.redirect(authUrl.toString(), 302);
    }

    // Step 2 + 3: GitHub calls back with a code
    if (pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) {
        return new Response("Missing ?code from GitHub.", { status: 400 });
      }

      const tokenRes = await fetch(GITHUB_TOKEN, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "theaicreatorstack-oauth",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });

      const data = await tokenRes.json();

      if (data.error || !data.access_token) {
        const payload = JSON.stringify({ error: data.error_description || data.error || "no_token" });
        return new Response(renderResult("error", payload.replace(/'/g, "\\'")), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      const payload = JSON.stringify({
        token: data.access_token,
        provider: "github",
      }).replace(/'/g, "\\'");

      return new Response(renderResult("success", payload), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Health check / root
    if (pathname === "/" || pathname === "") {
      return new Response("AI Creator Stack OAuth worker is running. Use /auth to begin.", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

// Minimal stand-in for the Supabase API gateway, used only by scripts/local-stack.sh:
// forwards /rest/v1/* to PostgREST and /auth/v1/* to GoTrue, and answers everything else with 404.
import http from "node:http";

const restPort = Number(process.env.REST_PORT ?? 54330);
const authPort = Number(process.env.AUTH_PORT ?? 54331);
const routes = [
  ["/rest/v1", restPort],
  ["/auth/v1", authPort],
];
const port = Number(process.env.GATEWAY_PORT ?? 54321);

http
  .createServer((req, res) => {
    const route = routes.find(([prefix]) => req.url?.startsWith(prefix + "/"));
    if (!route) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ message: "not emulated by the local stack" }));
      return;
    }
    const headers = { ...req.headers };
    delete headers.host;
    const [prefix, upstreamPort] = route;
    // Supabase sends the anon key as `apikey`; PostgREST only reads Authorization.
    if (!headers.authorization && headers.apikey) headers.authorization = `Bearer ${headers.apikey}`;
    const upstream = http.request(
      { host: "127.0.0.1", port: upstreamPort, method: req.method, path: req.url.slice(prefix.length), headers },
      (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers);
        up.pipe(res);
      },
    );
    upstream.on("error", (err) => {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ message: err.message }));
    });
    req.pipe(upstream);
  })
  .listen(port, "127.0.0.1", () => console.log(`gateway on :${port} -> PostgREST :${restPort}, GoTrue :${authPort}`));

// Minimal stand-in for the Supabase API gateway, used only by scripts/local-stack.sh:
// forwards /rest/v1/* to PostgREST and answers everything else with 404.
import http from "node:http";

const restPort = Number(process.env.REST_PORT ?? 54330);
const port = Number(process.env.GATEWAY_PORT ?? 54321);

http
  .createServer((req, res) => {
    if (!req.url?.startsWith("/rest/v1/")) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ message: "not emulated by the local stack" }));
      return;
    }
    const headers = { ...req.headers };
    delete headers.host;
    // Supabase sends the anon key as `apikey`; PostgREST only reads Authorization.
    if (!headers.authorization && headers.apikey) headers.authorization = `Bearer ${headers.apikey}`;
    const upstream = http.request(
      { host: "127.0.0.1", port: restPort, method: req.method, path: req.url.slice("/rest/v1".length), headers },
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
  .listen(port, "127.0.0.1", () => console.log(`gateway on :${port} -> PostgREST :${restPort}`));

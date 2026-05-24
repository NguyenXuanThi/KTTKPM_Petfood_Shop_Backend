const { createProxyMiddleware } = require("http-proxy-middleware");
const { proxyTimeoutMs } = require("../config/env");

const createServiceProxy = ({
  serviceName,
  target,
  upstreamPrefix,
  gatewayPrefix,
}) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    secure: false,
    xfwd: true,
    proxyTimeout: proxyTimeoutMs,
    timeout: proxyTimeoutMs,
    pathRewrite: (path, req) => {
      // Express strips the mount prefix from req.url before passing to middleware.
      // Use req.originalUrl to get the full path for correct rewriting.
      const fullPath = req.originalUrl
        ? req.originalUrl.split("?")[0]
        : path.split("?")[0];
      const query =
        req.originalUrl && req.originalUrl.includes("?")
          ? "?" + req.originalUrl.split("?")[1]
          : "";
      const suffix = fullPath.startsWith(gatewayPrefix)
        ? fullPath.slice(gatewayPrefix.length)
        : path.split("?")[0];
      return `${upstreamPrefix}${suffix || ""}${query}`;
    },
    on: {
      proxyReq: (proxyReq, req) => {
        if (req.auth) {
          proxyReq.setHeader("x-auth-sub", req.auth.sub || "");
          proxyReq.setHeader("x-auth-role", req.auth.role || "");
          proxyReq.setHeader("x-auth-email", req.auth.email || "");
        }
      },
      error: (err, req, res) => {
        if (res && typeof res.writeHead === "function" && !res.headersSent) {
          const connectionErrors = new Set([
            "ECONNREFUSED",
            "ETIMEDOUT",
            "ECONNRESET",
            "EHOSTUNREACH",
            "ENOTFOUND",
          ]);
          const status = connectionErrors.has(err.code) ? 503 : 502;
          res.writeHead(status, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: false,
              message:
                status === 503
                  ? `${serviceName} is temporarily unavailable`
                  : `${serviceName} proxy error`,
            }),
          );
        }
      },
    },
  });

module.exports = {
  createServiceProxy,
};

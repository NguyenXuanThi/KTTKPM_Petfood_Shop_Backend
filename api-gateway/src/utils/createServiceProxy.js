const { createProxyMiddleware } = require("http-proxy-middleware");
const { corsOrigin, proxyTimeoutMs } = require("../config/env");

const getAllowedOrigin = (origin) => {
  if (!origin) return null;
  if (Array.isArray(corsOrigin)) {
    return corsOrigin.includes(origin) ? origin : null;
  }
  return corsOrigin === origin ? origin : null;
};

const removeUpstreamCorsHeaders = (headers) => {
  Object.keys(headers || {}).forEach((headerName) => {
    if (headerName.toLowerCase().startsWith("access-control-")) {
      delete headers[headerName];
    }
  });
};

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
      proxyRes: (proxyRes, req) => {
        removeUpstreamCorsHeaders(proxyRes.headers);

        const allowedOrigin = getAllowedOrigin(req.headers.origin);
        if (allowedOrigin) {
          proxyRes.headers["access-control-allow-origin"] = allowedOrigin;
          proxyRes.headers["access-control-allow-credentials"] = "true";
          proxyRes.headers.vary = proxyRes.headers.vary
            ? `${proxyRes.headers.vary}, Origin`
            : "Origin";
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

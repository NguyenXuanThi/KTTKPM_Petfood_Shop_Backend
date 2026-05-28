const recommendationService = require("../services/recommendationService");

const decodeJwtPayload = (token) => {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch (_error) {
    return null;
  }
};

const getBearerUserId = (authorizationHeader = "") => {
  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  const payload = decodeJwtPayload(token);
  return payload?.sub || payload?.id || payload?._id || null;
};

const getProductRecommendations = async (req, res, next) => {
  try {
    const userId =
      req.headers["x-auth-sub"] ||
      getBearerUserId(req.headers.authorization || "") ||
      null;
    const sessionId = req.headers["x-session-id"] || null;

    console.log(
      `[ai-service] Recommendation request userId=${userId || "guest"} sessionId=${sessionId || "n/a"}`,
    );

    const data = await recommendationService.getRecommendations({ userId, sessionId });

    return res.status(200).json({
      success: true,
      source: data.source,
      context: data.context || null,
      updatedAt: data.updatedAt || null,
      products: data.products,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProductRecommendations,
};

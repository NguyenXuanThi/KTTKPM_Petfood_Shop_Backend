const Groq = require("groq-sdk");
const config = require("../config/env");
const { safeRedis } = require("../config/redis");
const productClient = require("../clients/recommendationProductClient");

const RECOMMENDATION_TTL_SECONDS = 30 * 60;
const DEFAULT_LIMIT = 8;

const groq = config.GROQ_API_KEY ? new Groq({ apiKey: config.GROQ_API_KEY }) : null;

const getCacheKey = ({ userId, sessionId }) => {
  if (userId) return `recommend:user:${userId}`;
  if (sessionId) return `recommend:guest:${sessionId}`;
  return null;
};

const uniqueIds = (products = []) =>
  [...new Set(products.map((product) => product?._id?.toString()).filter(Boolean))];

const readCache = async (key) => {
  if (!key) return null;
  const raw = await safeRedis((client) => client.get(key), null);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
};

const writeCache = async (key, payload) => {
  if (!key) return;
  const oldValue = await safeRedis((client) => client.get(key), null);
  await safeRedis((client) =>
    client.set(key, JSON.stringify(payload), "EX", RECOMMENDATION_TTL_SECONDS),
  );
  if (oldValue) {
    console.log("[ai-service] Old recommendation overwritten");
  }
  console.log(`[ai-service] Recommendation cached key=${key} source=${payload.source}`);
  console.log(`[ai-service] New productIds=${JSON.stringify(payload.productIds)}`);
};

const rankWithGroq = async ({ sourceText, candidates }) => {
  if (!groq || candidates.length <= 1) return uniqueIds(candidates);

  const allowedIds = new Set(uniqueIds(candidates));
  const compactCandidates = candidates.slice(0, 16).map((product) => ({
    id: product._id?.toString(),
    name: product.name,
    description: product.description?.slice(0, 220),
    price: product.price,
    categoryId: product.categoryId,
    averageRating: product.averageRating || product.rating || 0,
    reviewCount: product.reviewCount || 0,
  }));

  const prompt = [
    "Rank petfood ecommerce product recommendations.",
    "Return ONLY a JSON array of product ids from the candidate list.",
    `User context: ${sourceText}`,
    `Candidates: ${JSON.stringify(compactCandidates)}`,
  ].join("\n");

  try {
    const completion = await groq.chat.completions.create({
      model: config.GROQ_MODEL,
      temperature: 0.1,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content:
            "You rank petfood products. Output valid JSON only, no markdown, no explanation.",
        },
        { role: "user", content: prompt },
      ],
    });

    const text = completion.choices?.[0]?.message?.content?.trim() || "[]";
    const parsed = JSON.parse(text);
    const rankedIds = Array.isArray(parsed)
      ? parsed.map((id) => id?.toString()).filter((id) => allowedIds.has(id))
      : [];

    return rankedIds.length > 0 ? rankedIds : uniqueIds(candidates);
  } catch (error) {
    console.warn("[ai-service] GROQ ranking failed, fallback to rule-based recommendations");
    return uniqueIds(candidates);
  }
};

const cacheFromCandidates = async ({ key, source, context, sourceText, candidates }) => {
  const rankedIds = await rankWithGroq({ sourceText, candidates });
  const payload = {
    source,
    context,
    updatedAt: new Date().toISOString(),
    productIds: rankedIds.slice(0, DEFAULT_LIMIT),
  };
  await writeCache(key, payload);
  return payload;
};

const handleProductViewed = async (eventData = {}) => {
  const key = getCacheKey(eventData);
  if (!key) return null;

  console.log(
    `[ai-service] Consumed product.viewed productId=${eventData.productId} userId=${eventData.userId || "guest"}`,
  );
  console.log(
    `[ai-service] Updating recommendation key=${key} source=viewed productId=${eventData.productId}`,
  );

  let candidates = await productClient.getRelatedProducts({
    productId: eventData.productId,
    categoryId: eventData.categoryId,
    limit: 12,
  });

  if (candidates.length === 0) {
    candidates = await productClient.getBestSellers(DEFAULT_LIMIT);
  }

  return cacheFromCandidates({
    key,
    source: "viewed",
    context: {
      productId: eventData.productId || null,
      keyword: null,
    },
    sourceText: `Viewed product: ${eventData.productName || eventData.productId}`,
    candidates,
  });
};

const handleProductSearched = async (eventData = {}) => {
  const keyword = (eventData.keyword || "").trim();
  const key = getCacheKey(eventData);
  if (!key || !keyword) return null;

  console.log(
    `[ai-service] Consumed product.searched keyword="${keyword}" userId=${eventData.userId || "guest"}`,
  );
  console.log(
    `[ai-service] Updating recommendation key=${key} source=searched keyword="${keyword}"`,
  );

  let candidates = await productClient.searchProducts({ keyword, limit: 12 });
  if (candidates.length === 0) {
    candidates = await productClient.getBestSellers(DEFAULT_LIMIT);
  }

  return cacheFromCandidates({
    key,
    source: "searched",
    context: {
      productId: null,
      keyword,
    },
    sourceText: `Recent search keyword: ${keyword}`,
    candidates,
  });
};

const getRecommendations = async ({ userId, sessionId }) => {
  const key = getCacheKey({ userId, sessionId });
  console.log(`[ai-service] Reading recommendation key=${key || "none"}`);
  const cached = await readCache(key);

  if (cached?.productIds?.length) {
    console.log(
      `[ai-service] Cache hit source=${cached.source} productIds=${JSON.stringify(cached.productIds)}`,
    );
    const products = await productClient.getProductsBatch(cached.productIds);
    if (products.length > 0) {
      return {
        source: cached.source || "best_seller",
        context: cached.context || null,
        updatedAt: cached.updatedAt || null,
        products,
      };
    }
  }

  console.log("[ai-service] Cache miss, using best_seller");
  const products = await productClient.getBestSellers(DEFAULT_LIMIT);
  const payload = {
    source: "best_seller",
    context: {
      productId: null,
      keyword: null,
    },
    updatedAt: new Date().toISOString(),
    productIds: uniqueIds(products).slice(0, DEFAULT_LIMIT),
  };
  await writeCache(key, payload);

  return {
    source: "best_seller",
    context: payload.context,
    updatedAt: payload.updatedAt,
    products,
  };
};

module.exports = {
  handleProductViewed,
  handleProductSearched,
  getRecommendations,
};

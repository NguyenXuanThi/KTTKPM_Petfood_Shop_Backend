const mongoose = require("mongoose");
const slugify = require("slugify");
const crypto = require("crypto");
const Product = require("../models/Product");
const { uploadProductImage, deleteProductImage } = require("./uploadClient");
const { ensureActiveCategory } = require("./categoryClient");
const { getJson, setJson, deleteByPattern, safeRedis } = require("../config/redis");

const PRODUCT_LIST_CACHE_PREFIX = "cache:products:list";
const PRODUCT_DETAIL_CACHE_PREFIX = "cache:products:detail";
const PRODUCT_CACHE_TTL_SECONDS = 3 * 60;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeCategoryId = (categoryId) => {
  if (categoryId === "" || categoryId === undefined) {
    return null;
  }
  return categoryId;
};

const getSafeSlug = (value) =>
  slugify(value || "", {
    lower: true,
    strict: true,
    trim: true,
  }) || "product";

const stableHash = (value) =>
  crypto
    .createHash("sha1")
    .update(JSON.stringify(value || {}))
    .digest("hex");

const productListCacheKey = (query) =>
  `${PRODUCT_LIST_CACHE_PREFIX}:${stableHash(query)}`;

const productDetailCacheKey = (productId) =>
  `${PRODUCT_DETAIL_CACHE_PREFIX}:${productId}`;

const invalidateProductCache = async (productId = null) => {
  await deleteByPattern(`${PRODUCT_LIST_CACHE_PREFIX}:*`);
  if (productId) {
    await safeRedis((client) => client.del(productDetailCacheKey(productId)));
  }
};

const ensureObjectId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Invalid product id");
    error.statusCode = 400;
    throw error;
  }
};

const generateUniqueSlug = async (name, excludeId = null) => {
  const baseSlug = getSafeSlug(name);
  let slug = baseSlug;
  let index = 1;

  while (true) {
    const existed = await Product.exists({
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });

    if (!existed) {
      return slug;
    }

    slug = `${baseSlug}-${index}`;
    index += 1;
  }
};

const createProduct = async (payload, imageFile) => {
  const uploadedImage = await uploadProductImage(imageFile);

  try {
    const normalizedCategoryId = normalizeCategoryId(payload.categoryId);
    await ensureActiveCategory(normalizedCategoryId);

    const slug = await generateUniqueSlug(payload.name);

    const product = await Product.create({
      ...payload,
      slug,
      categoryId: normalizedCategoryId,
      imageUrl: uploadedImage.url,
      imageKey: uploadedImage.key,
      imageProvider: uploadedImage.provider || "s3",
    });

    await invalidateProductCache();
    return product;
  } catch (error) {
    await deleteProductImage({
      provider: uploadedImage.provider,
      key: uploadedImage.key,
    }).catch(() => null);
    throw error;
  }
};

const listProducts = async ({
  keyword,
  categoryId,
  page,
  limit,
  sortBy,
  sortOrder,
}) => {
  const cacheKey = productListCacheKey({
    keyword,
    categoryId,
    page,
    limit,
    sortBy,
    sortOrder,
  });
  const cached = await getJson(cacheKey);
  if (cached) return cached;

  const filter = {};

  if (keyword) {
    filter.name = {
      $regex: escapeRegex(keyword),
      $options: "i",
    };
  }

  if (categoryId) {
    filter.categoryId = categoryId;
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const [items, total] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  const result = {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };

  await setJson(cacheKey, result, PRODUCT_CACHE_TTL_SECONDS);
  return result;
};

const getProductDetail = async (productId) => {
  ensureObjectId(productId);

  const cacheKey = productDetailCacheKey(productId);
  const cached = await getJson(cacheKey);
  if (cached) return cached;

  const product = await Product.findById(productId);

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  const result = {
    ...product.toObject(),
    rating: product.averageRating || 0,
  };

  await setJson(cacheKey, result, PRODUCT_CACHE_TTL_SECONDS);
  return result;
};

const updateProduct = async (productId, payload, imageFile) => {
  ensureObjectId(productId);

  const product = await Product.findById(productId);

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  const oldImageKey = product.imageKey;
  const oldImageProvider = product.imageProvider || "s3";
  let uploadedImage = null;

  if (imageFile) {
    uploadedImage = await uploadProductImage(imageFile);
  }

  try {
    if (payload.categoryId !== undefined) {
      const normalizedCategoryId = normalizeCategoryId(payload.categoryId);
      await ensureActiveCategory(normalizedCategoryId);
      payload.categoryId = normalizedCategoryId;
    }

    if (payload.name && payload.name !== product.name) {
      product.slug = await generateUniqueSlug(payload.name, productId);
    }

    if (payload.name !== undefined) product.name = payload.name;
    if (payload.description !== undefined)
      product.description = payload.description;
    if (payload.price !== undefined) product.price = payload.price;
    if (payload.stock !== undefined) product.stock = payload.stock;
    if (payload.categoryId !== undefined) {
      product.categoryId = payload.categoryId;
    }
    if (payload.isActive !== undefined) product.isActive = payload.isActive;

    if (uploadedImage) {
      product.imageKey = uploadedImage.key;
      product.imageUrl = uploadedImage.url;
      product.imageProvider = uploadedImage.provider || "s3";
    }

    await product.save();
    await invalidateProductCache(productId);

    if (uploadedImage && oldImageKey && oldImageKey !== uploadedImage.key) {
      await deleteProductImage({
        provider: oldImageProvider,
        key: oldImageKey,
      }).catch(() => null);
    }

    return product;
  } catch (error) {
    if (uploadedImage) {
      await deleteProductImage({
        provider: uploadedImage.provider,
        key: uploadedImage.key,
      }).catch(() => null);
    }
    throw error;
  }
};

const deleteProduct = async (productId) => {
  ensureObjectId(productId);

  const product = await Product.findById(productId);

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  await Product.deleteOne({ _id: productId });
  await deleteProductImage({
    provider: product.imageProvider || "s3",
    key: product.imageKey,
  }).catch(() => null);
  await invalidateProductCache(productId);

  return product;
};

const updateRatingSummary = async (productId, payload) => {
  ensureObjectId(productId);

  const product = await Product.findByIdAndUpdate(
    productId,
    {
      averageRating: payload.averageRating,
      reviewCount: payload.reviewCount,
    },
    { new: true, runValidators: true },
  );

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  await invalidateProductCache(productId);
  return product;
};

module.exports = {
  createProduct,
  listProducts,
  getProductDetail,
  updateProduct,
  deleteProduct,
  updateRatingSummary,
};

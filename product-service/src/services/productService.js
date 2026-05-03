const mongoose = require("mongoose");
const slugify = require("slugify");
const Product = require("../models/Product");
const reviewService = require("./reviewService");
const { uploadProductImage, deleteProductImage } = require("./uploadClient");
const { ensureActiveCategory } = require("./categoryClient");

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

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const getProductDetail = async (productId) => {
  ensureObjectId(productId);

  const [product, reviewSummary] = await Promise.all([
    Product.findById(productId),
    reviewService.getVisibleReviewSummary(productId),
  ]);

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    ...product.toObject(),
    averageRating: reviewSummary.averageRating,
    rating: reviewSummary.averageRating,
    reviewCount: reviewSummary.totalReviews,
  };
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
  await reviewService.deleteReviewsByProductId(productId);
  await deleteProductImage({
    provider: product.imageProvider || "s3",
    key: product.imageKey,
  }).catch(() => null);

  return product;
};

module.exports = {
  createProduct,
  listProducts,
  getProductDetail,
  updateProduct,
  deleteProduct,
};

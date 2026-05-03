const wishlistService = require("../services/wishlistService");
const {
  wishlistBodySchema,
  productIdParamSchema,
} = require("../validators/wishlistValidator");

const getMyWishlist = async (req, res, next) => {
  try {
    const wishlist = await wishlistService.getWishlist(req.auth.sub);

    return res.status(200).json(wishlist);
  } catch (error) {
    return next(error);
  }
};

const addToMyWishlist = async (req, res, next) => {
  try {
    const { productId } = await wishlistBodySchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const result = await wishlistService.addToWishlist(req.auth.sub, productId);

    return res.status(result.alreadyFavorited ? 200 : 201).json({
      message: result.alreadyFavorited
        ? "Product is already in wishlist"
        : "Product added to wishlist",
      ...result,
    });
  } catch (error) {
    return next(error);
  }
};

const removeFromMyWishlist = async (req, res, next) => {
  try {
    const { productId } = await productIdParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const result = await wishlistService.removeFromWishlist(req.auth.sub, productId);

    return res.status(200).json({
      message: result.removed
        ? "Product removed from wishlist"
        : "Product was not in wishlist",
      ...result,
    });
  } catch (error) {
    return next(error);
  }
};

const checkMyWishlistItem = async (req, res, next) => {
  try {
    const { productId } = await productIdParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const result = await wishlistService.isProductFavorited(req.auth.sub, productId);

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMyWishlist,
  addToMyWishlist,
  removeFromMyWishlist,
  checkMyWishlistItem,
};
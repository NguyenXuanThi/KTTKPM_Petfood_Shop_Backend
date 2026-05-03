jest.mock("repositories/userRepository", () => ({
  findById: jest.fn(),
}));

jest.mock("repositories/wishlistRepository", () => ({
  findOrCreateByUserId: jest.fn(),
  hasProduct: jest.fn(),
  addProduct: jest.fn(),
  removeProduct: jest.fn(),
}));

jest.mock("services/productClient", () => ({
  getProductById: jest.fn(),
}));

const userRepository = require("repositories/userRepository");
const wishlistRepository = require("repositories/wishlistRepository");
const { getProductById } = require("services/productClient");
const wishlistService = require("services/wishlistService");

const userId = "507f191e810c19729de860ea";
const productId = "507f1f77bcf86cd799439011";
const anotherProductId = "507f1f77bcf86cd799439012";

const buildWishlistDoc = (productIds = [productId]) => ({
  _id: { toString: () => "wishlist-id" },
  userId: { toString: () => userId },
  productIds: productIds.map((id) => ({ toString: () => id })),
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
});

describe("wishlistService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userRepository.findById.mockResolvedValue({
      _id: userId,
      isActive: true,
    });
  });

  test("addToWishlist should add a product for active user", async () => {
    getProductById.mockResolvedValue({ _id: productId, name: "Dry Food" });
    wishlistRepository.hasProduct.mockResolvedValue(false);
    wishlistRepository.addProduct.mockResolvedValue(buildWishlistDoc());

    const result = await wishlistService.addToWishlist(userId, productId);

    expect(getProductById).toHaveBeenCalledWith(productId);
    expect(wishlistRepository.addProduct).toHaveBeenCalledWith(
      userId,
      productId,
    );
    expect(result).toMatchObject({
      alreadyFavorited: false,
      wishlist: {
        userId,
        productIds: [productId],
      },
    });
  });

  test("addToWishlist should prevent duplicate favorites", async () => {
    getProductById.mockResolvedValue({ _id: productId, name: "Dry Food" });
    wishlistRepository.hasProduct.mockResolvedValue(true);
    wishlistRepository.findOrCreateByUserId.mockResolvedValue(
      buildWishlistDoc(),
    );

    const result = await wishlistService.addToWishlist(userId, productId);

    expect(result.alreadyFavorited).toBe(true);
    expect(wishlistRepository.addProduct).not.toHaveBeenCalled();
  });

  test("removeFromWishlist should remove product and report removed status", async () => {
    wishlistRepository.hasProduct.mockResolvedValue(true);
    wishlistRepository.removeProduct.mockResolvedValue(buildWishlistDoc([]));

    const result = await wishlistService.removeFromWishlist(userId, productId);

    expect(wishlistRepository.removeProduct).toHaveBeenCalledWith(
      userId,
      productId,
    );
    expect(result).toMatchObject({
      removed: true,
      wishlist: {
        productIds: [],
      },
    });
  });

  test("getWishlist should hydrate product details and ignore deleted products", async () => {
    wishlistRepository.findOrCreateByUserId.mockResolvedValue(
      buildWishlistDoc([productId, anotherProductId]),
    );
    getProductById.mockResolvedValueOnce({ _id: productId, name: "Dry Food" });

    const notFoundError = new Error("Product not found");
    notFoundError.statusCode = 404;
    getProductById.mockRejectedValueOnce(notFoundError);

    const result = await wishlistService.getWishlist(userId);

    expect(result.total).toBe(1);
    expect(result.items).toEqual([
      {
        productId,
        product: { _id: productId, name: "Dry Food" },
      },
    ]);
  });

  test("isProductFavorited should return boolean favorite status", async () => {
    wishlistRepository.hasProduct.mockResolvedValue(false);

    const result = await wishlistService.isProductFavorited(userId, productId);

    expect(result).toEqual({
      userId,
      productId,
      isFavorited: false,
    });
  });
});

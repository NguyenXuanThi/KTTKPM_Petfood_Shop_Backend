jest.mock("models/Product", () => ({
  findOne: jest.fn(),
}));

jest.mock("models/Review", () => ({
  aggregate: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  deleteOne: jest.fn(),
  deleteMany: jest.fn(),
}));

jest.mock("services/userClient", () => ({
  getUserSnapshot: jest.fn(),
}));

const Product = require("models/Product");
const Review = require("models/Review");
const { getUserSnapshot } = require("services/userClient");
const reviewService = require("services/reviewService");

const productId = "507f1f77bcf86cd799439011";
const userId = "507f191e810c19729de860ea";
const reviewId = "507f191e810c19729de860eb";

const buildStoredReview = (overrides = {}) => ({
  _id: { toString: () => reviewId },
  productId: { toString: () => productId },
  userId: { toString: () => userId },
  fullName: "Jane Doe",
  avatarUrl: "https://example.com/avatar.png",
  rating: 5,
  comment: "My pet loved it",
  status: "visible",
  verifiedPurchase: false,
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-01-01T00:00:00.000Z"),
  ...overrides,
});

describe("reviewService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getVisibleReviewSummary should return rounded average and total reviews", async () => {
    Review.aggregate.mockResolvedValue([
      {
        averageRating: 4.25,
        totalReviews: 4,
      },
    ]);

    const summary = await reviewService.getVisibleReviewSummary(productId);

    expect(summary).toEqual({
      averageRating: 4.3,
      totalReviews: 4,
    });
    expect(Review.aggregate).toHaveBeenCalledTimes(1);
  });

  test("upsertReview should create a new review when user has not reviewed yet", async () => {
    Product.findOne.mockResolvedValue({ _id: productId, isActive: true });
    getUserSnapshot.mockResolvedValue({
      fullName: "Jane Doe",
      avatarUrl: "https://example.com/avatar.png",
    });
    Review.findOne.mockResolvedValue(null);
    Review.create.mockResolvedValue(buildStoredReview());

    const result = await reviewService.upsertReview(productId, userId, {
      rating: 5,
      comment: "My pet loved it",
    });

    expect(Review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        productId,
        userId,
        rating: 5,
        comment: "My pet loved it",
        verifiedPurchase: false,
      }),
    );
    expect(result).toMatchObject({
      _id: reviewId,
      productId,
      userId,
      fullName: "Jane Doe",
      rating: 5,
      comment: "My pet loved it",
    });
  });

  test("deleteReview should reject when user is neither owner nor admin", async () => {
    Review.findById.mockResolvedValue(buildStoredReview());

    await expect(
      reviewService.deleteReview(reviewId, {
        sub: "507f191e810c19729de860ff",
        role: "user",
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "You are not allowed to delete this review",
    });

    expect(Review.deleteOne).not.toHaveBeenCalled();
  });
});

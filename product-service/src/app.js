const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const productRoutes = require("./routes/productRoutes");
const productController = require("./controllers/productController");
const { requireInternal } = require("./middlewares/internalMiddleware");
const { corsOrigin } = require("./config/env");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: corsOrigin === "*" ? true : corsOrigin,
    credentials: true,
  })
);
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).json({
    service: "product-service",
    status: "ok",
  });
});

app.use("/api/products", productRoutes);
app.post(
  "/internal/products/batch",
  requireInternal,
  productController.getProductsBatchInternal,
);
app.get(
  "/internal/products/best-sellers",
  requireInternal,
  productController.getBestSellersInternal,
);
app.get(
  "/internal/products/related",
  requireInternal,
  productController.getRelatedProductsInternal,
);
app.patch(
  "/internal/products/:id/rating-summary",
  requireInternal,
  productController.updateRatingSummaryInternal,
);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use((error, req, res, next) => {
  if (error.isJoi) {
    return res.status(400).json({
      message: "Validation failed",
      errors: error.details.map((detail) => detail.message),
    });
  }

  if (error && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      message: "File too large",
    });
  }

  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    message: error.message || "Internal server error",
  });
});

module.exports = app;

const express = require("express");
const productController = require("../controllers/productController");
const statisticsController = require("../controllers/statisticsController");
const { upload } = require("../middlewares/uploadMiddleware");
const { optionalAuth, requireAuth } = require("../middlewares/authMiddleware");
const { requireAdmin } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get(
  "/admin/statistics/products",
  requireAuth,
  requireAdmin,
  statisticsController.getProductStatistics,
);
router.get("/", optionalAuth, productController.listProducts);
router.get("/search", optionalAuth, productController.listProducts);
router.get("/:id", optionalAuth, productController.getProductDetail);
router.post("/", upload.single("image"), productController.createProduct);
router.put("/:id", upload.single("image"), productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

module.exports = router;

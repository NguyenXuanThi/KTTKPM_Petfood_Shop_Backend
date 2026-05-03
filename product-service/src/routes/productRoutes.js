const express = require("express");
const productController = require("../controllers/productController");
const reviewRoutes = require("./reviewRoutes");
const { upload } = require("../middlewares/uploadMiddleware");

const router = express.Router();

router.use("/", reviewRoutes);
router.get("/", productController.listProducts);
router.get("/search", productController.listProducts);
router.get("/:id", productController.getProductDetail);
router.post("/", upload.single("image"), productController.createProduct);
router.put("/:id", upload.single("image"), productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

module.exports = router;

const express = require("express");
const recommendationController = require("../controllers/recommendationController");

const router = express.Router();

router.get("/products", recommendationController.getProductRecommendations);

module.exports = router;

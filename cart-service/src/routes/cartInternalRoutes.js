const express = require("express");
const cartController = require("../controllers/cartController");
const { requireInternal } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/checkout-items", requireInternal, cartController.checkoutSelectedItems);
router.post("/restore-items", requireInternal, cartController.restoreCheckoutItems);

module.exports = router;

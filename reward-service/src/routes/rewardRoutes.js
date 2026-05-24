const express = require("express");
const rewardController = require("../controllers/rewardController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/wheel", requireAuth, rewardController.getWheel);
router.get("/me", requireAuth, rewardController.getMe);
router.post("/spin", requireAuth, rewardController.spin);
router.get("/shop", requireAuth, rewardController.getShop);
router.get("/history", requireAuth, rewardController.getHistory);
router.post("/shop/:id/exchange", requireAuth, rewardController.exchange);

module.exports = router;

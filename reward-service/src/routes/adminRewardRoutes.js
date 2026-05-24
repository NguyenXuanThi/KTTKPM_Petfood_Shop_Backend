const express = require("express");
const adminRewardController = require("../controllers/adminRewardController");
const { requireAuth, requireAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get("/pool", adminRewardController.listPool);
router.post("/pool", adminRewardController.createPoolItem);
router.patch("/pool/:id", adminRewardController.updatePoolItem);
router.patch("/pool/:id/enable", adminRewardController.enablePoolItem);
router.patch("/pool/:id/disable", adminRewardController.disablePoolItem);
router.delete("/pool/:id", adminRewardController.deletePoolItem);

router.get("/shop", adminRewardController.listShop);
router.post("/shop", adminRewardController.createShopItem);
router.patch("/shop/:id", adminRewardController.updateShopItem);
router.patch("/shop/:id/enable", adminRewardController.enableShopItem);
router.patch("/shop/:id/disable", adminRewardController.disableShopItem);

module.exports = router;

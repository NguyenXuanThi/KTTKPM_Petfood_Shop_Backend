const express = require("express");
const internalRewardController = require("../controllers/internalRewardController");
const { requireInternal } = require("../middlewares/authMiddleware");

const router = express.Router();
router.post("/grant-spins", requireInternal, internalRewardController.grantSpins);

module.exports = router;

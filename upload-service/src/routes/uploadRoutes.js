const express = require("express");
const uploadController = require("../controllers/uploadController");
const { upload } = require("../middlewares/uploadMiddleware");

const router = express.Router();

router.post("/", upload.single("file"), uploadController.upload);
router.post("/payment", upload.single("file"), uploadController.uploadPaymentProof);
router.post("/presigned", uploadController.createPresignedUrl);
router.delete("/", uploadController.remove);

module.exports = router;

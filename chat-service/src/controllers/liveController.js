const liveService = require("../services/liveService");

class LiveController {
  async getOrCreateConversation(req, res) {
    try {
      const customerId =
        req.user?.id || req.body.customerId || req.query.customerId;
      const customerName =
        req.body.customerName || req.query.customerName || "";
      const customerAvatar =
        req.body.customerAvatar || req.query.customerAvatar || "";
      if (!customerId)
        return res
          .status(400)
          .json({ success: false, message: "customerId is required" });

      const result = await liveService.getOrCreateConversation(
        customerId,
        customerName,
        customerAvatar,
      );
      if (!result.success)
        return res.status(500).json({ success: false, error: result.error });

      res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      console.error("getOrCreateConversation error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getConversationsForAdmin(req, res) {
    try {
      const result = await liveService.getConversationsForAdmin();
      if (!result.success)
        return res.status(500).json({ success: false, error: result.error });
      res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      console.error("getConversationsForAdmin error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const result = await liveService.getMessages(conversationId);
      if (!result.success)
        return res.status(500).json({ success: false, error: result.error });
      res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      console.error("getMessages error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new LiveController();

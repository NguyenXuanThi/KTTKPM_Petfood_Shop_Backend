const Product = require("../models/Product");

const getProductStatistics = async () => {
  const [totalProducts, lowStockProducts, lowStockList] = await Promise.all([
    Product.countDocuments(),
    Product.countDocuments({ stock: { $lte: 10 } }),
    Product.find({ stock: { $lte: 10 } })
      .sort({ stock: 1, updatedAt: -1 })
      .limit(20)
      .select("_id name stock imageUrl")
      .lean(),
  ]);

  return {
    summary: {
      totalProducts,
      lowStockProducts,
    },
    topSellingProducts: [],
    lowStockList: lowStockList.map((product) => ({
      productId: product._id,
      name: product.name,
      stock: product.stock,
      imageUrl: product.imageUrl,
    })),
  };
};

module.exports = { getProductStatistics };

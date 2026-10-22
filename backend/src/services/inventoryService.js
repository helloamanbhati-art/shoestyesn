const Product = require("../models/Product");

function assertQuantity(quantity) {
  const parsed = Number(quantity);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("Stock quantity must be a positive whole number");
  }
  return parsed;
}

function withSession(options = {}) {
  return options.session ? { session: options.session } : {};
}

// Update inventory after purchase
exports.reserveStock = async (productId, quantity, options = {}) => {
  try {
    const amount = assertQuantity(quantity);
    const product = await Product.findById(productId, null, withSession(options));
    if (!product) throw new Error("Product not found");
    if (product.trackInventory === false) return product;

    const updated = await Product.findOneAndUpdate(
      {
        _id: productId,
        isActive: true,
        trackInventory: { $ne: false },
        "stock.available": { $gte: amount },
      },
      {
        $inc: {
          "stock.available": -amount,
          "stock.reserved": amount,
        },
      },
      { new: true, runValidators: true, ...withSession(options) }
    );

    if (!updated) throw new Error("Insufficient stock");

    if (updated.stock.available === 0) {
      await Product.updateOne(
        { _id: productId, "stock.available": 0 },
        { $set: { inStock: false } },
        withSession(options)
      );
      updated.inStock = false;
    }

    return updated;
  } catch (error) {
    throw new Error(`Failed to reserve stock: ${error.message}`);
  }
};

// Release reserved stock (order cancelled)
exports.releaseReservedStock = async (productId, quantity, options = {}) => {
  try {
    const amount = assertQuantity(quantity);
    const product = await Product.findById(productId, "trackInventory", withSession(options));
    if (!product) throw new Error("Product not found");
    if (product.trackInventory === false) return product;
    const updated = await Product.findOneAndUpdate(
      {
        _id: productId,
        "stock.reserved": { $gte: amount },
      },
      {
        $inc: {
          "stock.available": amount,
          "stock.reserved": -amount,
        },
        $set: { inStock: true },
      },
      { new: true, runValidators: true, ...withSession(options) }
    );

    if (!updated) throw new Error("Insufficient reserved stock to release");
    return updated;
  } catch (error) {
    throw new Error(`Failed to release stock: ${error.message}`);
  }
};

// Confirm stock usage (order delivered)
exports.confirmStockUsage = async (productId, quantity, options = {}) => {
  try {
    const amount = assertQuantity(quantity);
    const product = await Product.findById(productId, "trackInventory", withSession(options));
    if (!product) throw new Error("Product not found");
    if (product.trackInventory === false) return product;
    const updated = await Product.findOneAndUpdate(
      {
        _id: productId,
        "stock.reserved": { $gte: amount },
      },
      {
        $inc: {
          "stock.reserved": -amount,
          totalSales: amount,
        },
      },
      { new: true, runValidators: true, ...withSession(options) }
    );

    if (!updated) throw new Error("Insufficient reserved stock to confirm");
    return updated;
  } catch (error) {
    throw new Error(`Failed to confirm stock usage: ${error.message}`);
  }
};

// Handle return
exports.handleReturn = async (productId, quantity, options = {}) => {
  try {
    const amount = assertQuantity(quantity);
    const updated = await Product.findByIdAndUpdate(
      productId,
      {
        $inc: { "stock.available": amount },
        $set: { inStock: true },
      },
      { new: true, runValidators: true, ...withSession(options) }
    );

    if (!updated) throw new Error("Product not found");
    return updated;
  } catch (error) {
    throw new Error(`Failed to return stock: ${error.message}`);
  }
};

// Get current stock
exports.getStock = async (productId, options = {}) => {
  try {
    const product = await Product.findById(
      productId,
      "stock trackInventory",
      withSession(options)
    );

    if (!product) {
      return {
        available: 0,
        reserved: 0,
        damaged: 0,
        total: 0,
        trackInventory: true,
      };
    }

    return {
      available: product.stock?.available || 0,
      reserved: product.stock?.reserved || 0,
      damaged: product.stock?.damaged || 0,
      total: (product.stock?.available || 0) + (product.stock?.reserved || 0),
      trackInventory: product.trackInventory !== false,
    };
  } catch (error) {
    throw new Error(`Failed to get stock: ${error.message}`);
  }
};

// Get low stock products
exports.getLowStockProducts = async (threshold = 10) => {
  try {
    return Product.find({
      isActive: true,
      trackInventory: true,
      "stock.available": { $lt: Number(threshold) || 10 },
    }).sort({ "stock.available": 1 });
  } catch (error) {
    throw new Error(`Failed to get low stock products: ${error.message}`);
  }
};

// Adjust inventory (manual adjustment)
exports.adjustInventory = async (productId, quantity, _reason, options = {}) => {
  try {
    const adjustment = Number(quantity);
    if (!Number.isInteger(adjustment) || adjustment === 0) {
      throw new Error("Adjustment must be a non-zero whole number");
    }

    const query = { _id: productId };
    if (adjustment < 0) {
      query["stock.available"] = { $gte: Math.abs(adjustment) };
    }

    const updated = await Product.findOneAndUpdate(
      query,
      { $inc: { "stock.available": adjustment } },
      { new: true, runValidators: true, ...withSession(options) }
    );
    if (!updated) {
      throw new Error("Product not found or adjustment exceeds available stock");
    }

    const isInStock = updated.trackInventory === false || updated.stock.available > 0;
    await Product.updateOne(
      { _id: productId, "stock.available": updated.stock.available },
      { $set: { inStock: isInStock } },
      withSession(options)
    );
    updated.inStock = isInStock;
    return updated;
  } catch (error) {
    throw new Error(`Failed to adjust inventory: ${error.message}`);
  }
};

// Create inventory record
exports.createInventoryRecord = async (productId, stock = {}, options = {}) => {
  try {
    const available = Math.max(0, Number(stock.available) || 0);
    const updated = await Product.findByIdAndUpdate(
      productId,
      {
        $set: {
          "stock.available": available,
          "stock.reserved": 0,
          "stock.damaged": Number(stock.damaged) || 0,
          "stock.lowStockThreshold": Number(stock.lowStockThreshold) || 10,
          inStock: available > 0,
        },
      },
      { new: true, runValidators: true, ...withSession(options) }
    );
    if (!updated) throw new Error("Product not found");
    return updated;
  } catch (error) {
    throw new Error(`Failed to initialize stock: ${error.message}`);
  }
};

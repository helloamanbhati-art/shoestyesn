const Product = require("../models/Product");
const Brand = require("../models/Brand");
const Category = require("../models/Category");
const ProductOptions = require("../models/ProductOptions");
const { v2: cloudinary } = require("cloudinary");

const CARD_PRODUCT_FIELDS = [
  "name",
  "shortDescription",
  "price",
  "compareAtPrice",
  "image",
  "images",
  "colors",
  "variants.variantId",
  "variants.variantName",
  "brand",
  "category",
  "soldBy",
  "inStock",
  "availableSizes",
  "clothingType",
  "createdAt",
].join(" ");

// Get all products
exports.getProducts = async (req, res, next) => {
  try {
    const { page = 1, brand, category, search, sort } = req.query;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 500);
    const skip = (page - 1) * limit;

    let query = { isActive: true };

    if (brand) query.brand = brand;
    if (category) query.category = category;
    if (search) {
      query.$text = { $search: search };
    }

    let sortObj = { createdAt: -1 };
    if (sort === "price-asc") sortObj = { price: 1 };
    if (sort === "price-desc") sortObj = { price: -1 };
    if (sort === "newest") sortObj = { createdAt: -1 };
    if (sort === "popular") sortObj = { totalSales: -1 };

    const isCardView = req.query.view === "card";
    let productsQuery = Product.find(query)
      .populate("brand", "name")
      .populate("category", "name")
      .skip(skip)
      .limit(limit)
      .sort(sortObj);

    if (isCardView) {
      productsQuery = productsQuery.select(CARD_PRODUCT_FIELDS).lean();
    }

    const [rawProducts, total] = await Promise.all([
      productsQuery,
      Product.countDocuments(query),
    ]);

    const products = isCardView
      ? rawProducts.map((product) => ({
          ...product,
          images: Array.isArray(product.images) ? product.images.slice(0, 1) : [],
          variants: Array.isArray(product.variants)
            ? product.variants.map(({ variantId, variantName, _id }) => ({
                variantId,
                variantName,
                _id,
              }))
            : [],
        }))
      : rawProducts;

    if (isCardView) {
      res.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=86400");
    }

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get product by ID
exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate("brand")
      .populate("category");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Older per-piece products may not have product-level sizes yet. In that
    // case, expose the centrally managed admin sizes so the storefront can
    // still require a size selection. Explicit product sizes always win.
    let availableSizes = product.availableSizes || [];
    if (product.soldBy === "piece" && availableSizes.length === 0 && !product.outfitComponents?.length) {
      const options = await ProductOptions.findOne({ key: "default" }).lean();
      availableSizes = options?.sizes || [];
    }

    res.json({
      success: true,
      data: {
        ...product.toObject(),
        availableSizes,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get featured products
exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ isFeatured: true, isActive: true })
      .limit(10)
      .populate("brand")
      .populate("category")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// Search products
exports.searchProducts = async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query required",
      });
    }

    const products = await Product.find(
      { $text: { $search: q } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .populate("brand")
      .populate("category");

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// Get products by category
exports.getProductsByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const products = await Product.find({
      category: categoryId,
      isActive: true,
    })
      .skip(skip)
      .limit(limit)
      .populate("brand")
      .populate("category");

    const total = await Product.countDocuments({ category: categoryId });

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get products by brand
exports.getProductsByBrand = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const products = await Product.find({
      brand: brandId,
      isActive: true,
    })
      .skip(skip)
      .limit(limit)
      .populate("brand")
      .populate("category");

    const total = await Product.countDocuments({ brand: brandId });

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get related products
exports.getRelatedProducts = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const relatedProducts = await Product.find({
      _id: { $ne: id },
      category: product.category,
      isActive: true,
    })
      .limit(5)
      .populate("brand")
      .populate("category");

    res.json({
      success: true,
      data: relatedProducts,
    });
  } catch (error) {
    next(error);
  }
};

// Get brands
exports.getBrands = async (req, res, next) => {
  try {
    // Exclude any brand whose name is 'Unknown' (case-insensitive) — these are placeholder entries
    const brands = await Brand.find({
      isActive: true,
      name: { $not: /^unknown$/i },
    }).sort({ name: 1 });

    res.json({
      success: true,
      data: brands,
    });
  } catch (error) {
    next(error);
  }
};

// Get categories
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({
      displayOrder: 1,
      name: 1,
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

exports.getProductOptions = async (req, res, next) => {
  try {
    let options = await ProductOptions.findOne({ key: "default" });
    if (!options) {
      options = await ProductOptions.create({ key: "default" });
    }

    res.json({
      success: true,
      data: {
        sizes: options.sizes || [],
        clothingTypes: options.clothingTypes || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get product reviews
exports.getProductReviews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const Review = require("../models/Review");

    const reviews = await Review.find({
      product: id,
      isApproved: true,
    })
      .skip(skip)
      .limit(limit)
      .populate("customer", "firstName lastName")
      .sort({ createdAt: -1 });

    const total = await Review.countDocuments({
      product: id,
      isApproved: true,
    });

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};

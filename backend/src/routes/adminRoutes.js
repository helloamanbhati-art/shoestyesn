
const express = require("express");
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const AdminUser = require("../models/AdminUser");
const Category = require("../models/Category");
const Brand = require("../models/Brand");
const Product = require("../models/Product");
const ProductOptions = require("../models/ProductOptions");
const AppSettings = require('../models/AppSettings');
const DailyVisitor = require('../models/DailyVisitor');
const { getVisitorSummary } = require('../services/visitorAnalyticsService');
const { resolveInitialStock } = require("../services/productStockService");
const {
  clearAdminCookies,
  createAdminSessionService,
  getAdminTokens,
  setAdminCookies,
} = require("../services/adminSessionService");
const adminController = require("../controllers/adminController");
const { authenticateAdmin, requireRole } = require("../middleware/auth");
const { apiLimiter, authLimiter } = require("../middleware/rateLimiter");
const { validate } = require("../middleware/validation");
const { updateOrderStatusSchema } = require("../validation/orderValidation");
const {
  getConfiguredAdminCredentials,
  isConfiguredAdminEmail,
} = require('../services/configuredAdminService');

// Configure Cloudinary & Multer
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const isSupportedMedia = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
    if (!isSupportedMedia) {
      const error = new Error('Only image and video files are allowed');
      error.statusCode = 400;
      return callback(error);
    }
    callback(null, true);
  },
});

const router = express.Router();
const adminSessionService = createAdminSessionService();

const publicAdmin = (admin) => ({
  id: admin._id.toString(),
  firstName: admin.firstName,
  lastName: admin.lastName || null,
  email: admin.email,
  role: admin.role,
  avatar: admin.avatar || null,
});

function containsApplicationErrorText(value) {
  return typeof value === 'string'
    && /Unexpected Application Error|ReferenceError:\s*\w+ is not defined/i.test(value);
}

function hasCorruptedProductContent(data) {
  return [data?.name, data?.description, data?.image, ...(Array.isArray(data?.images) ? data.images : [])]
    .some(containsApplicationErrorText);
}

async function uploadBufferToCloudinary(fileBuffer) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: "shoe-fashion/products", resource_type: "auto" }, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      })
      .end(fileBuffer);
  });
}

// PUBLIC ROUTE - Login (no auth required)
router.post("/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string'
      || !email || !password || email.length > 254 || password.length > 256) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }
    const { email: configuredEmail } = getConfiguredAdminCredentials();
    if (!isConfiguredAdminEmail(email)) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    const admin = await AdminUser.findOne({ email: configuredEmail }).select("+password");
    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    admin.lastLogin = new Date();
    admin.loginAttempts = 0;
    await admin.save();
    const session = await adminSessionService.createSession(admin._id);
    setAdminCookies(res, session);
    res.json({
      success: true,
      data: { admin: publicAdmin(admin) },
    });
  } catch (_error) {
    res.status(500).json({ success: false, message: "Server error during login" });
  }
});

router.post("/auth/refresh", async (req, res) => {
  try {
    const session = await adminSessionService.rotateSession(getAdminTokens(req).refreshToken);
    const admin = await AdminUser.findById(session.adminId);
    if (!admin?.isActive || !isConfiguredAdminEmail(admin.email)) throw new Error("Admin account is unavailable");
    setAdminCookies(res, session);
    return res.json({ success: true, data: { admin: publicAdmin(admin) } });
  } catch (_error) {
    clearAdminCookies(res);
    return res.status(401).json({ success: false, error: { code: "ADMIN_SESSION_INVALID", message: "Admin session is invalid" } });
  }
});

router.post("/auth/logout", async (req, res) => {
  await adminSessionService.revokeSession(getAdminTokens(req).refreshToken).catch(() => undefined);
  clearAdminCookies(res);
  return res.status(204).send();
});

router.get("/auth/me", authenticateAdmin, (req, res) => res.json({
  success: true,
  data: { admin: publicAdmin(req.admin) },
}));

// PROTECTED ROUTES - Apply authentication middleware here
router.use(authenticateAdmin);
router.use(apiLimiter);

router.get('/analytics/visitors', async (_req, res, next) => {
  try {
    const summary = await getVisitorSummary(DailyVisitor);
    return res.json({ success: true, data: summary });
  } catch (error) {
    return next(error);
  }
});

router.get('/storefront-settings', async (_req, res, next) => {
  try {
    const settings = await AppSettings.findOne().select('announcementEnabled announcementText').lean();
    res.json({ success: true, data: { announcementEnabled: settings?.announcementEnabled || false, announcementText: settings?.announcementText || '' } });
  } catch (error) { next(error); }
});

router.put('/storefront-settings', async (req, res, next) => {
  try {
    const announcementEnabled = Boolean(req.body.announcementEnabled);
    const announcementText = String(req.body.announcementText || '').trim().slice(0, 180);
    const settings = await AppSettings.findOneAndUpdate({}, { announcementEnabled, announcementText }, { new: true, upsert: true, setDefaultsOnInsert: true });
    res.json({ success: true, data: { announcementEnabled: settings.announcementEnabled, announcementText: settings.announcementText || '' } });
  } catch (error) { next(error); }
});


// Product media upload (images and videos)
router.post('/products/upload-image', upload.single('image'), async (req, res) => {
  try {
    console.log('[UPLOAD] Request received');
    if (!req.file) {
      console.log('[UPLOAD] No file in request');
      return res.status(400).json({ success: false, message: 'No media file uploaded' });
    }
    console.log('[UPLOAD] File received:', req.file.originalname, 'Size:', req.file.size);

    const result = await uploadBufferToCloudinary(req.file.buffer);

    res.json({ success: true, url: result.secure_url });
  } catch (error) {
    console.error('[UPLOAD] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/products/upload-images", upload.array("images", 20), async (req, res) => {
  try {
    const files = req.files || [];
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, message: "No media files uploaded" });
    }

    const uploaded = [];
    for (const file of files) {
      const result = await uploadBufferToCloudinary(file.buffer);
      uploaded.push(result.secure_url);
    }

    res.json({ success: true, urls: uploaded });
  } catch (error) {
    console.error("[UPLOAD-MULTI] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Dashboard
router.get("/dashboard", adminController.getDashboardStats);

// Analytics
router.get("/analytics", adminController.getAnalytics);

// Product management
// NEW — resolve brand and category names to ObjectIds before saving
router.get("/products", adminController.getAllProducts);
router.post('/products', async (req, res) => {
  let creationKey = '';
  try {
    const data = req.body;
    creationKey = String(req.get('Idempotency-Key') || '').trim();
    if (creationKey && !/^[A-Za-z0-9_-]{16,100}$/.test(creationKey)) {
      return res.status(400).json({ success: false, message: 'Invalid Idempotency-Key' });
    }
    if (creationKey) {
      const existingProduct = await Product.findOne({ adminCreationKey: creationKey })
        .populate('brand category');
      if (existingProduct) {
        return res.json({
          success: true,
          message: 'Product already created',
          data: existingProduct,
        });
      }
    }
    console.log('[POST /products] Request body:', data);
    console.log('[POST /products] Admin:', req.admin?._id);

    // Validate required fields
    if (!data.name || !data.description || !data.price || !data.soldBy) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, description, price, soldBy are required'
      });
    }

    if (hasCorruptedProductContent(data)) {
      return res.status(400).json({
        success: false,
        message: 'Product content cannot contain an application error message',
      });
    }

    // Find brand by name or ID
    let brandId = data.brand;
    if (data.brand && !data.brand.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('[POST /products] Looking up brand by name:', data.brand);
      let brand = await Brand.findOne({ name: data.brand });
      if (!brand) {
        console.log('[POST /products] Creating new brand:', data.brand);
        brand = await Brand.create({ name: data.brand });
      }
      brandId = brand._id;
      console.log('[POST /products] Brand ID:', brandId);
    }

    // Find category by name or ID
    let categoryId = data.category;
    if (data.category && !data.category.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('[POST /products] Looking up category by name:', data.category);
      let category = await Category.findOne({ name: data.category });
      if (!category) {
        console.log('[POST /products] Creating new category:', data.category);
        category = await Category.create({ name: data.category });
      }
      categoryId = category._id;
      console.log('[POST /products] Category ID:', categoryId);
    }

    const variants = Array.isArray(data.variants)
      ? data.variants.map((v, index) => {
          const variantImages = Array.isArray(v.images)
            ? v.images.map((img, imgIdx) => {
                if (typeof img === 'string') {
                  return {
                    imageUrl: img,
                    isPrimary: imgIdx === 0,
                    sortOrder: imgIdx,
                  };
                }
                return {
                  imageUrl: img.imageUrl || '',
                  isPrimary: img.isPrimary ?? (imgIdx === 0),
                  sortOrder: img.sortOrder ?? imgIdx,
                };
              })
            : [];
          return {
            variantId: v.variantId || v.clientId || `v-${index + 1}-${Date.now()}`,
            variantName: String(v.variantName || v.name || 'Default').trim(),
            images: variantImages,
          };
        })
      : [];

    // Derive legacy image / images from variants
    const variantWithImages = variants.find(v => v.images && v.images.length > 0);
    const firstVariantImages = variantWithImages ? variantWithImages.images.map(img => img.imageUrl) : [];
    const legacyImages = firstVariantImages.length > 0 ? firstVariantImages
      : Array.isArray(data.images) ? data.images : [];
    const legacyImage = data.image || legacyImages[0] || '';
    const initialStock = resolveInitialStock(data);

    const productData = {
      name: data.name,
      description: data.description,
      price: data.price,
      soldBy: data.soldBy,
      clothingType: data.clothingType || null,
      availableSizes: Array.isArray(data.availableSizes) ? data.availableSizes : [],
      outfitComponents: Array.isArray(data.outfitComponents) ? data.outfitComponents : [],
      brand: brandId,
      category: categoryId,
      image: legacyImage,
      images: legacyImages,
      colors: data.colors || [],
      variants,
      stock: {
        available: initialStock.available,
        reserved: 0,
        damaged: 0,
        lowStockThreshold: data.stock?.lowStockThreshold ?? 10,
      },
      inStock: initialStock.inStock,
      isFlatPrice: data.soldBy === 'meter' ? true : (data.isFlatPrice ?? false),
      isActive: data.isActive ?? true,
      createdBy: req.admin?._id,
      sku: data.sku || `SKU-${Date.now()}`,
      compareAtPrice: Number(data.compareAtPrice) || 0,
      ...(creationKey && { adminCreationKey: creationKey }),
    };

    console.log('[POST /products] Creating product with data:', productData);

    const product = new Product(productData);

    await product.save();
    console.log('[POST /products] Product saved successfully:', product._id);

    // Populate brand and category for response
    const populatedProduct = await product.populate('brand category');

    res.status(201).json({ success: true, message: 'Product created', data: populatedProduct });
  } catch (error) {
    if (creationKey && error?.code === 11000) {
      const existingProduct = await Product.findOne({ adminCreationKey: creationKey })
        .populate('brand category');
      if (existingProduct) {
        return res.json({
          success: true,
          message: 'Product already created',
          data: existingProduct,
        });
      }
    }
    console.error('[POST /products] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// NEW
router.put('/products/:productId', async (req, res) => {
  try {
    const data = req.body;
    const Product = require('../models/Product');

    if (hasCorruptedProductContent(data)) {
      return res.status(400).json({
        success: false,
        message: 'Product content cannot contain an application error message',
      });
    }

    let brandId = data.brand;
    if (data.brand && !data.brand.match(/^[0-9a-fA-F]{24}$/)) {
      let brand = await Brand.findOne({ name: data.brand });
      if (!brand) brand = await Brand.create({ name: data.brand });
      brandId = brand._id;
    }

    let categoryId = data.category;
    if (data.category && !data.category.match(/^[0-9a-fA-F]{24}$/)) {
      let category = await Category.findOne({ name: data.category });
      if (!category) category = await Category.create({ name: data.category });
      categoryId = category._id;
    }

    const variants = Array.isArray(data.variants)
      ? data.variants.map((v, index) => {
          const variantImages = Array.isArray(v.images)
            ? v.images.map((img, imgIdx) => {
                if (typeof img === 'string') {
                  return {
                    imageUrl: img,
                    isPrimary: imgIdx === 0,
                    sortOrder: imgIdx,
                  };
                }
                return {
                  imageUrl: img.imageUrl || '',
                  isPrimary: img.isPrimary ?? (imgIdx === 0),
                  sortOrder: img.sortOrder ?? imgIdx,
                };
              })
            : [];
          return {
            variantId: v.variantId || v.clientId || `v-${index + 1}-${Date.now()}`,
            variantName: String(v.variantName || v.name || 'Default').trim(),
            images: variantImages,
          };
        })
      : undefined; // undefined = don't overwrite if not sent

    // Derive legacy image / images from variants
    const variantWithImages = variants && variants.find(v => v.images && v.images.length > 0);
    const firstVariantImages = variantWithImages ? variantWithImages.images.map(img => img.imageUrl) : null;
    const legacyImages = firstVariantImages ? firstVariantImages
      : Array.isArray(data.images) ? data.images : undefined;
    const legacyImage = data.image || (legacyImages && legacyImages[0]) || undefined;

    const updatePayload = {
      ...data,
      isFlatPrice: data.soldBy === 'meter' ? true : (data.isFlatPrice !== undefined ? data.isFlatPrice : undefined),
      ...(brandId !== undefined && { brand: brandId }),
      ...(categoryId !== undefined && { category: categoryId }),
      updatedBy: req.admin._id,
      ...(variants !== undefined && { variants }),
      ...(legacyImages !== undefined && { images: legacyImages }),
      ...(legacyImage !== undefined && { image: legacyImage }),
    };

    const product = await Product.findByIdAndUpdate(
      req.params.productId,
      updatePayload,
      { new: true, runValidators: true }
    ).populate('brand category');

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product updated', data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.delete("/products/:productId", adminController.deleteProduct);
router.post("/products/bulk-update", adminController.bulkUpdateProducts);

// Product options (sizes, clothing types)
router.get("/product-options", async (req, res) => {
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
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/product-options", async (req, res) => {
  try {
    const sizes = Array.isArray(req.body?.sizes)
      ? req.body.sizes.map((s) => String(s).trim()).filter(Boolean)
      : [];
    const clothingTypes = Array.isArray(req.body?.clothingTypes)
      ? req.body.clothingTypes.map((t) => String(t).trim()).filter(Boolean)
      : [];

    const uniqueSizes = [...new Set(sizes)];
    const uniqueClothingTypes = [...new Set(clothingTypes)];

    const options = await ProductOptions.findOneAndUpdate(
      { key: "default" },
      { sizes: uniqueSizes, clothingTypes: uniqueClothingTypes },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      data: {
        sizes: options.sizes || [],
        clothingTypes: options.clothingTypes || [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Order management
router.get("/orders", adminController.getAllOrders);
router.put("/orders/:orderId/status", validate(updateOrderStatusSchema), adminController.updateOrderStatus);

// Customer management
router.get("/customers", adminController.getAllCustomers);
router.get("/customers/:customerId", adminController.getCustomerDetails);

// Return management
router.get("/returns", adminController.getReturns);
router.post("/returns/:returnId/approve", adminController.approveReturn);

// Review management
router.get("/reviews", adminController.getAllReviews);
router.post("/reviews/:reviewId/approve", adminController.approveReview);
router.post("/reviews/:reviewId/reject", adminController.rejectReview);



// PASTE THIS BLOCK before module.exports = router;

// Categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ success: true, categories });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post("/categories", async (req, res) => {
  try {
    if (!req.body.name || req.body.name.trim() === "") {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }
    const creationKey = String(req.get('Idempotency-Key') || '').trim();
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(creationKey)) {
      return res.status(400).json({ success: false, message: "A valid Idempotency-Key header is required" });
    }
    const existing = await Category.findOne({ adminCreationKey: creationKey });
    if (existing) return res.json({ success: true, category: existing });

    const category = await Category.create({
      name: req.body.name.trim(),
      adminCreationKey: creationKey,
    });
    res.status(201).json({ success: true, category });
  } catch (e) {
    if (e?.code === 11000) {
      const retried = await Category.findOne({ adminCreationKey: String(req.get('Idempotency-Key') || '').trim() });
      if (retried) return res.json({ success: true, category: retried });
    }
    res.status(500).json({ success: false, message: e.message });
  }
});
router.put("/categories/:id", async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, category });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete("/categories/:id", async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Brands
router.get("/brands", async (req, res) => {
  try {
    const brands = await Brand.find().sort({ name: 1 });
    res.json({ success: true, brands });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post("/brands", async (req, res) => {
  try {
    console.log("[POST /brands] Request body:", req.body);
    if (!req.body.name || req.body.name.trim() === "") {
      return res.status(400).json({ success: false, message: "Brand name is required" });
    }
    const brand = await Brand.create({ name: req.body.name.trim() });
    console.log("[POST /brands] Created:", brand);
    res.status(201).json({ success: true, brand });
  } catch (e) {
    console.error("[POST /brands] Error:", e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});
router.put("/brands/:id", async (req, res) => {
  try {
    const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, brand });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete("/brands/:id", async (req, res) => {
  try {
    await Brand.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});


module.exports = router;

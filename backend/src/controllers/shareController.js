const mongoose = require('mongoose');
const Product = require('../models/Product');
const { buildProductSharePage } = require('../services/productSharePage');

const DEFAULT_STOREFRONT_URL = 'https://shoefashion.in';

exports.getProductSharePage = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).type('html').send('Product not found');
    }

    const product = await Product.findOne({ _id: id, isActive: true }).lean();
    if (!product) {
      return res.status(404).type('html').send('Product not found');
    }

    const variantId = typeof req.query.variant === 'string'
      ? req.query.variant.slice(0, 100)
      : '';
    const storefrontUrl = (process.env.STOREFRONT_URL || DEFAULT_STOREFRONT_URL).replace(/\/+$/, '');
    const html = buildProductSharePage({ product, variantId, storefrontUrl });

    return res
      .status(200)
      .set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
      .type('html')
      .send(html);
  } catch (error) {
    return next(error);
  }
};

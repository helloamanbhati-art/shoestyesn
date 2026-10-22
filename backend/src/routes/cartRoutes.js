const express = require('express');
const cartController = require('../controllers/cartController');
const { authenticateCustomer } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { validate, validateParams } = require('../middleware/validation');
const {
  addCartItemSchema,
  cartItemParamsSchema,
  mergeCartSchema,
  updateCartItemSchema,
} = require('../validation/cartValidation');

const router = express.Router();

router.use(authenticateCustomer, apiLimiter);
router.get('/', cartController.getCart);
router.post('/items', validate(addCartItemSchema), cartController.addItem);
router.post('/merge', validate(mergeCartSchema), cartController.mergeCart);
router.patch(
  '/items/:itemId',
  validateParams(cartItemParamsSchema),
  validate(updateCartItemSchema),
  cartController.updateItem,
);
router.delete(
  '/items/:itemId',
  validateParams(cartItemParamsSchema),
  cartController.removeItem,
);
router.delete('/', cartController.clearCart);

module.exports = router;


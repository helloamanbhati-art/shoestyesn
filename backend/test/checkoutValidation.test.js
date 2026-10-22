const test = require('node:test');
const assert = require('node:assert/strict');

const {
  checkoutQuoteSchema,
  createOrderSchema,
} = require('../src/validation/orderValidation');
const { addAddressSchema } = require('../src/validation/customerValidation');

const addressId = '507f1f77bcf86cd799439011';

test('order creation accepts a saved address reference and never accepts client cart lines', () => {
  const valid = createOrderSchema.validate({
    addressId,
    paymentMethod: 'razorpay',
    shippingMethod: 'standard',
    couponCode: '',
    customerNotes: '',
  });
  assert.equal(valid.error, undefined);

  const forged = createOrderSchema.validate({
    addressId,
    items: [{ productId: addressId, price: 1, quantity: 99 }],
  });
  assert.ok(forged.error);
});

test('signed-in buy now accepts one validated selection without accepting a client price', () => {
  const valid = createOrderSchema.validate({
    addressId,
    checkoutMode: 'buyNow',
    items: [{ productId: addressId, variantId: 'default', selectedSize: 'M', quantity: 1 }],
  });
  assert.equal(valid.error, undefined);

  const forged = createOrderSchema.validate({
    addressId,
    checkoutMode: 'buyNow',
    items: [{ productId: addressId, variantId: 'default', selectedSize: 'M', quantity: 1, price: 1 }],
  });
  assert.ok(forged.error);

  const multipleItems = createOrderSchema.validate({
    addressId,
    checkoutMode: 'buyNow',
    items: [
      { productId: addressId, variantId: 'default', selectedSize: 'M', quantity: 1 },
      { productId: addressId, variantId: 'default', selectedSize: 'L', quantity: 1 },
    ],
  });
  assert.ok(multipleItems.error);
});

test('quote requires either a saved address or a validated address draft', () => {
  assert.equal(checkoutQuoteSchema.validate({ addressId }).error, undefined);
  assert.ok(checkoutQuoteSchema.validate({}).error);
});

test('signed-in buy now quote accepts exactly one validated selection', () => {
  assert.equal(checkoutQuoteSchema.validate({
    addressId,
    checkoutMode: 'buyNow',
    items: [{ productId: addressId, variantId: 'default', selectedSize: 'M', quantity: 1 }],
  }).error, undefined);

  assert.ok(checkoutQuoteSchema.validate({
    addressId,
    items: [{ productId: addressId, variantId: 'default', selectedSize: 'M', quantity: 1 }],
  }).error);
});

test('saved checkout addresses are validated and normalized', () => {
  const result = addAddressSchema.validate({
    type: 'home',
    fullName: 'Test Customer',
    phone: '+919876543210',
    addressLine1: 'Flat 3, Market Road',
    addressLine2: '',
    city: 'Jaipur',
    state: 'Rajasthan',
    zipCode: '302001',
    country: 'India',
    isDefault: true,
  });
  assert.equal(result.error, undefined);
  assert.ok(addAddressSchema.validate({ ...result.value, zipCode: '123' }).error);
});

test('guest checkout accepts contact, address, and product selections without client prices', () => {
  const guestCheckout = {
    guest: {
      email: 'guest@example.com',
      shippingAddress: {
        fullName: 'Guest Customer', phone: '+919876543210', addressLine1: '12 Market Road',
        addressLine2: '', city: 'Surat', state: 'Gujarat', zipCode: '395007', country: 'India',
      },
    },
    items: [{ productId: addressId, variantId: 'default', selectedSize: 'M', quantity: 1 }],
    paymentMethod: 'razorpay',
    shippingMethod: 'standard',
  };

  assert.equal(createOrderSchema.validate(guestCheckout).error, undefined);
  assert.equal(checkoutQuoteSchema.validate({
    shippingAddress: guestCheckout.guest.shippingAddress,
    items: guestCheckout.items,
  }).error, undefined);
  assert.ok(createOrderSchema.validate({
    ...guestCheckout,
    items: [{ ...guestCheckout.items[0], price: 1 }],
  }).error);
});

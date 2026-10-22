const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildCartSelection,
  cartSelectionsMatch,
  mergeCartSelections,
  serializeCart,
  summarizeCartItems,
} = require('../src/services/cartService');

test('buildCartSelection requires a size for every outfit component', () => {
  const outfitProduct = {
    _id: 'outfit-1', name: 'Two-piece outfit', isActive: true, inStock: true,
    soldBy: 'piece', price: 1999, stock: { available: 5 }, variants: [],
    availableSizes: [],
    outfitComponents: [
      { componentId: 'shirt', name: 'Shirt', availableSizes: ['M', 'L'] },
      { componentId: 'jeans', name: 'Jeans', availableSizes: ['30', '32'] },
    ],
  };

  assert.throws(
    () => buildCartSelection(outfitProduct, {
      quantity: 1,
      selectedComponents: [{ componentId: 'shirt', size: 'M' }],
    }),
    (error) => error.code === 'COMPONENT_SIZE_REQUIRED' && /Jeans/.test(error.message),
  );
});

test('buildCartSelection preserves valid sizes for every outfit component', () => {
  const outfitProduct = {
    _id: 'outfit-1', name: 'Three-piece outfit', isActive: true, inStock: true,
    soldBy: 'piece', price: 2499, stock: { available: 5 }, variants: [],
    availableSizes: [],
    outfitComponents: [
      { componentId: 'shirt', name: 'Shirt', availableSizes: ['M', 'L'] },
      { componentId: 'jeans', name: 'Jeans', availableSizes: ['30', '32'] },
      { componentId: 'shoes', name: 'Shoes', availableSizes: ['8', '9'] },
    ],
  };

  const selection = buildCartSelection(outfitProduct, {
    quantity: 1,
    selectedComponents: [
      { componentId: 'shirt', size: 'L' },
      { componentId: 'jeans', size: '32' },
      { componentId: 'shoes', size: '9' },
    ],
  });

  assert.deepEqual(selection.selectedComponents, [
    { componentId: 'shirt', name: 'Shirt', size: 'L' },
    { componentId: 'jeans', name: 'Jeans', size: '32' },
    { componentId: 'shoes', name: 'Shoes', size: '9' },
  ]);
});

const product = {
  _id: 'product-1',
  name: 'Classic Heel',
  isActive: true,
  inStock: true,
  soldBy: 'piece',
  price: 1499,
  additionalChargeAmount: 0,
  availableSizes: ['36', '37', '38'],
  stock: { available: 5 },
  variants: [
    { variantId: 'black', variantName: 'Black' },
    { variantId: 'red', variantName: 'Red' },
  ],
};

test('buildCartSelection accepts an available size and product variant', () => {
  const result = buildCartSelection(product, {
    variantId: 'black',
    selectedSize: '37',
    quantity: 2,
  });

  assert.deepEqual(result, {
    product: 'product-1',
    variantId: 'black',
    selectedSize: '37',
    selectedColor: 'Black',
    meters: null,
    quantity: 2,
  });
});

test('buildCartSelection rejects missing sizes for sized products', () => {
  assert.throws(
    () => buildCartSelection(product, { variantId: 'black', quantity: 1 }),
    /size is required/i,
  );
});

test('buildCartSelection rejects variants that do not belong to the product', () => {
  assert.throws(
    () => buildCartSelection(product, {
      variantId: 'blue',
      selectedSize: '37',
      quantity: 1,
    }),
    /variant is not available/i,
  );
});

test('buildCartSelection rejects quantities above current stock', () => {
  assert.throws(
    () => buildCartSelection(product, {
      variantId: 'black',
      selectedSize: '37',
      quantity: 6,
    }),
    /only 5 available/i,
  );
});

test('buildCartSelection rejects inactive products', () => {
  assert.throws(
    () => buildCartSelection({ ...product, isActive: false }, {
      variantId: 'black',
      selectedSize: '37',
      quantity: 1,
    }),
    /not available/i,
  );
});

test('buildCartSelection derives saleability from authoritative stock instead of stale inStock', () => {
  const accepted = buildCartSelection({ ...product, inStock: false }, {
    variantId: 'black',
    selectedSize: '37',
    quantity: 1,
  });
  assert.equal(accepted.quantity, 1);

  assert.throws(
    () => buildCartSelection({
      ...product,
      inStock: true,
      stock: { available: 0 },
    }, {
      variantId: 'black',
      selectedSize: '37',
      quantity: 1,
    }),
    /only 0 available/i,
  );
});

test('buildCartSelection rejects forged variants for products without variants', () => {
  assert.throws(
    () => buildCartSelection({ ...product, variants: [] }, {
      variantId: 'forged',
      selectedSize: '37',
      quantity: 1,
    }),
    /variant is not available/i,
  );
});

test('buildCartSelection allows only the meter packages offered by the storefront', () => {
  const meterProduct = {
    ...product,
    soldBy: 'meter',
    availableSizes: [],
    variants: [],
  };

  assert.equal(buildCartSelection(meterProduct, { meters: 4, quantity: 1 }).meters, 4);
  assert.equal(buildCartSelection(meterProduct, { meters: 5, quantity: 1 }).meters, 5);
  assert.throws(
    () => buildCartSelection(meterProduct, { meters: 7, quantity: 1 }),
    /meter option is not available/i,
  );
});

test('cartSelectionsMatch distinguishes the same product by variant and size', () => {
  const first = {
    product: 'product-1',
    variantId: 'black',
    selectedSize: '37',
    selectedColor: 'Black',
    meters: null,
  };

  assert.equal(cartSelectionsMatch(first, { ...first }), true);
  assert.equal(cartSelectionsMatch(first, { ...first, selectedSize: '38' }), false);
  assert.equal(cartSelectionsMatch(first, { ...first, variantId: 'red' }), false);
});

test('summarizeCartItems calculates display totals from current backend product data', () => {
  const summary = summarizeCartItems([
    {
      product: { ...product, price: 1499 },
      quantity: 2,
      meters: null,
    },
    {
      product: {
        ...product,
        _id: 'fabric-1',
        soldBy: 'meter',
        price: 800,
        compareAtPrice: 200,
        additionalChargeAmount: 50,
        availableSizes: [],
        variants: [],
      },
      quantity: 1,
      meters: 5,
    },
  ]);

  assert.deepEqual(summary, {
    totalItems: 3,
    subtotal: 4048,
  });
});

test('serializeCart exposes current backend prices and marks deleted products unavailable', () => {
  const result = serializeCart({
    _id: 'cart-1',
    updatedAt: new Date('2026-10-08T10:00:00.000Z'),
    items: [
      {
        _id: 'item-1',
        product,
        variantId: 'black',
        selectedSize: '37',
        selectedColor: 'Black',
        meters: null,
        quantity: 2,
      },
      {
        _id: 'item-2',
        product: null,
        variantId: 'default',
        selectedSize: null,
        selectedColor: null,
        meters: null,
        quantity: 1,
      },
    ],
  });

  assert.equal(result.id, 'cart-1');
  assert.equal(result.items[0].product.price, 1499);
  assert.equal(result.items[0].lineTotal, 2998);
  assert.equal(result.items[0].isAvailable, true);
  assert.equal(result.items[1].isAvailable, false);
  assert.deepEqual(result.summary, {
    totalItems: 3,
    payableItems: 2,
    subtotal: 2998,
  });
});

test('mergeCartSelections deduplicates selections and caps combined quantity to stock', () => {
  const existing = [{
    _id: 'item-1',
    product: 'product-1',
    variantId: 'black',
    selectedSize: '37',
    selectedColor: 'Black',
    meters: null,
    quantity: 2,
  }];
  const incoming = [{
    product: 'product-1',
    variantId: 'black',
    selectedSize: '37',
    selectedColor: 'Black',
    meters: null,
    quantity: 4,
  }];

  const result = mergeCartSelections(existing, incoming, new Map([['product-1', 5]]));

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].quantity, 5);
  assert.equal(result.items[0]._id, 'item-1');
  assert.deepEqual(result.adjustments, [{
    productId: 'product-1',
    requestedQuantity: 6,
    appliedQuantity: 5,
    reason: 'STOCK_CAPPED',
  }]);
});

test('mergeCartSelections rejects more than the cart line limit', () => {
  const incoming = Array.from({ length: 51 }, (_, index) => ({
    product: `product-${index}`,
    variantId: 'default',
    selectedSize: null,
    selectedColor: null,
    meters: null,
    quantity: 1,
  }));
  const stock = new Map(incoming.map((item) => [item.product, 1]));

  assert.throws(
    () => mergeCartSelections([], incoming, stock),
    /up to 50 different items/i,
  );
});

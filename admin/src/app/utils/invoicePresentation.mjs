const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const money = (value) => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const invoiceDate = (value) => {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  }).format(date);
};
const addressLines = (address) => {
  if (!address) return [];
  if (typeof address === 'string') return [address];
  return [
    address.fullName,
    address.phone && `Phone: ${address.phone}`,
    [address.houseName || address.addressLine1, address.building].filter(Boolean).join(', '),
    address.street,
    address.landmark && `Landmark: ${address.landmark}`,
    [address.city, address.state, address.zipCode || address.pincode || address.zip]
      .filter(Boolean).join(', '),
    address.country || 'India',
  ].filter(Boolean);
};

const itemDescription = (item) => [
  item.size && `Size: ${item.size}`,
  (item.selectedVariant?.color || item.color) && `Color: ${item.selectedVariant?.color || item.color}`,
  item.selectedVariant?.variantName && `Variant: ${item.selectedVariant.variantName}`,
].filter(Boolean).join(' · ');

export const createInvoiceHtml = (order) => {
  const orderNumber = order.orderNumber || order.id || order._id || 'N/A';
  const rows = (order.items || []).map((item, index) => {
    const unitPrice = item.selectedVariant?.priceAtPurchase ?? item.price ?? 0;
    const sku = item.selectedVariant?.sku || item.productId || '—';
    return `<tr>
      <td>${index + 1}</td>
      <td><strong>${escapeHtml(item.productName || 'Item')}</strong><small>${escapeHtml(itemDescription(item))}</small></td>
      <td>${escapeHtml(sku)}</td>
      <td class="number">${Number(item.quantity || 0)}</td>
      <td class="number">₹${money(unitPrice)}</td>
      <td class="number">₹${money(unitPrice * Number(item.quantity || 0))}</td>
    </tr>`;
  }).join('');
  const address = addressLines(order.shippingAddress || order.billingAddress)
    .map((line) => `<div>${escapeHtml(line)}</div>`).join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice ${escapeHtml(orderNumber)}</title>
<style>
  *{box-sizing:border-box} body{margin:0;background:#eef1f3;color:#17211b;font:14px/1.5 Arial,sans-serif}
  .toolbar{position:sticky;top:0;display:flex;justify-content:flex-end;padding:12px 24px;background:#fff;border-bottom:1px solid #dfe4e1}
  button{border:0;border-radius:6px;background:#166534;color:#fff;padding:10px 18px;font:600 14px Arial;cursor:pointer}
  .invoice{width:210mm;min-height:297mm;margin:20px auto;padding:18mm;background:#fff;box-shadow:0 4px 20px #0001}
  header{display:flex;justify-content:space-between;gap:32px;padding-bottom:22px;border-bottom:3px solid #166534}
  h1{margin:0;color:#166534;font-size:28px;letter-spacing:.02em}.brand{font-size:24px;font-weight:800}.muted{color:#607068}
  .meta{min-width:240px}.meta div,.totals div{display:flex;justify-content:space-between;gap:24px}
  .customer{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin:28px 0}.label{margin-bottom:6px;color:#607068;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
  table{width:100%;border-collapse:collapse}th{background:#edf5f0;color:#284b37;text-align:left;font-size:11px;text-transform:uppercase}th,td{padding:10px 8px;border-bottom:1px solid #dfe4e1;vertical-align:top}.number{text-align:right;white-space:nowrap}small{display:block;margin-top:3px;color:#607068}
  .summary{display:flex;justify-content:flex-end;margin-top:24px}.totals{width:310px}.totals div{padding:5px 0}.totals .grand{margin-top:8px;padding-top:10px;border-top:2px solid #166534;font-size:17px;font-weight:800}
  footer{margin-top:56px;padding-top:16px;border-top:1px solid #dfe4e1;text-align:center;color:#607068;font-size:12px}
  @page{size:A4;margin:0}@media print{body{background:#fff}.toolbar{display:none}.invoice{margin:0;box-shadow:none;width:auto;min-height:auto}thead{display:table-header-group}tr{break-inside:avoid}}
  @media(max-width:800px){.invoice{width:100%;min-height:0;margin:0;padding:24px}.customer{grid-template-columns:1fr}header{flex-direction:column}.table-wrap{overflow-x:auto}}
</style></head><body>
<div class="toolbar"><button type="button" onclick="window.print()">Print / Save as PDF</button></div>
<main class="invoice">
  <header><div><div class="brand">Shoe Style</div><div class="muted">Fashion made for every step</div></div>
    <div><h1>Tax Invoice</h1><div class="muted">Original for recipient</div></div></header>
  <section class="customer">
    <div><div class="label">Bill / Ship to</div><strong>${escapeHtml(order.customerName || 'Customer')}</strong>
      ${address || '<div>Address unavailable</div>'}<div>${escapeHtml(order.customerPhone || '')}</div><div>${escapeHtml(order.customerEmail || '')}</div></div>
    <div class="meta"><div><span class="muted">Invoice no.</span><strong>${escapeHtml(orderNumber)}</strong></div>
      <div><span class="muted">Invoice date</span><strong>${escapeHtml(invoiceDate(order.createdAt))}</strong></div>
      <div><span class="muted">Payment</span><strong>${escapeHtml(order.paymentStatus || 'pending')}</strong></div>
      <div><span class="muted">Method</span><strong>${escapeHtml(order.paymentMethod || 'N/A')}</strong></div></div>
  </section>
  <div class="table-wrap"><table><thead><tr><th>#</th><th>Description</th><th>SKU</th><th class="number">Qty</th><th class="number">Rate</th><th class="number">Amount</th></tr></thead><tbody>${rows}</tbody></table></div>
  <section class="summary"><div class="totals"><div><span>Subtotal</span><span>₹${money(order.subtotal)}</span></div>
    <div><span>GST</span><span>₹${money(order.tax)}</span></div><div><span>Shipping</span><span>₹0.00</span></div>
    <div class="grand"><span>Total</span><span>₹${money(order.total)}</span></div></div></section>
  <footer>This is a computer-generated invoice. Thank you for shopping with Shoe Style.</footer>
</main></body></html>`;
};

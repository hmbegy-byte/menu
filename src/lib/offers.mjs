export function discountedPrice(product, offers) {
  const percent = Math.max(0, ...offers.filter(o => o.active && (!o.product_id || o.product_id === product.id)).map(o => Math.min(100, Math.max(0, Number(o.discount_percentage) || 0))));
  return Math.round(Number(product.price) * (100-percent)) / 100;
}

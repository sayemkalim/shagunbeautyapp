/**
 * Resolves available stock strictly & independently for Base Product vs Variant.
 *
 * @param {Object} product - Product object or Cart Item
 * @param {string|Object|null} variantSku - Selected variant sku, _id, or variant object
 * @returns {number} Available stock quantity
 */
export function getAvailableStock(product, variantSku = null) {
  if (!product) return 0;

  // Case 1: Direct Cart Item or Product with a specific `variant` object attached
  const directVariant = variantSku && typeof variantSku === 'object'
    ? variantSku
    : (product.variant && typeof product.variant === 'object' ? product.variant : null);

  if (directVariant) {
    if (
      directVariant.status === 'Out Of Stock' ||
      directVariant.status === 'out_of_stock' ||
      directVariant.is_out_of_stock === true ||
      directVariant.isOutOfStock === true
    ) {
      return 0;
    }
    return Number(
      directVariant.available_inventory ??
      directVariant.qty_on_hand ??
      directVariant.inventory ??
      product.available_inventory ??
      0
    );
  }

  // Case 2: User selected a specific Variant SKU / _id from `product.variants`
  const targetKey = typeof variantSku === 'string'
    ? variantSku
    : (variantSku?.sku || variantSku?._id || null);

  if (targetKey && Array.isArray(product.variants) && product.variants.length > 0) {
    const variant = product.variants.find(
      (v) =>
        v.sku === targetKey ||
        String(v._id) === String(targetKey) ||
        String(v.sku) === String(targetKey)
    );
    if (variant) {
      if (
        variant.status === 'Out Of Stock' ||
        variant.status === 'out_of_stock' ||
        variant.is_out_of_stock === true ||
        variant.isOutOfStock === true
      ) {
        return 0;
      }
      return Number(
        variant.available_inventory ??
        variant.qty_on_hand ??
        variant.inventory ??
        0
      );
    }
    return 0;
  }

  // Case 3: Cart Item without variant (explicit base product cart item)
  if (product.cartItemId && !product.variant) {
    if (
      product.status === 'Out Of Stock' ||
      product.status === 'out_of_stock' ||
      product.is_out_of_stock === true ||
      product.isOutOfStock === true
    ) {
      return 0;
    }
    if (product.base_available_inventory !== undefined && product.base_available_inventory !== null && product.base_available_inventory !== '') {
      return Number(product.base_available_inventory);
    }
    return Number(product.available_inventory ?? product.qty_on_hand ?? product.inventory ?? 0);
  }

  // Case 4: Base Product Catalog Item (when checking base stock)
  // If base stock is explicitly defined
  if (product.base_available_inventory !== undefined && product.base_available_inventory !== null && product.base_available_inventory !== '') {
    const baseStock = Number(product.base_available_inventory);
    if (
      product.status === 'Out Of Stock' ||
      product.status === 'out_of_stock' ||
      product.is_out_of_stock === true ||
      product.isOutOfStock === true
    ) {
      return 0;
    }
    return baseStock;
  }

  // If product has variants but no explicit base_available_inventory, base stock is 0 (forces variant selection)
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return 0;
  }

  // Fallback for simple standalone products without variants
  if (
    product.status === 'Out Of Stock' ||
    product.status === 'out_of_stock' ||
    product.is_out_of_stock === true ||
    product.isOutOfStock === true
  ) {
    return 0;
  }

  return Number(product.available_inventory ?? product.qty_on_hand ?? product.inventory ?? 0);
}

export function isAvailableInStock(product, variantSku = null) {
  return getAvailableStock(product, variantSku) > 0;
}

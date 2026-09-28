/**
 * Utility functions for product inventory and stock management
 * Matches the inventory logic used across the application:
 * - Base/main product: out of stock is decided by base_available_inventory
 * - Variant: out of stock is decided by available_inventory inside the variant
 */

export function getProductStock(product, currentVariant = null) {
  const effectiveVariant = currentVariant || (product?.variant ? product.variant : null);

  // 1. Variant stock: decided by available_inventory inside the variant
  if (effectiveVariant) {
    if (typeof effectiveVariant.available_inventory === 'number') {
      return effectiveVariant.available_inventory;
    }
    if (
      effectiveVariant.available_inventory !== undefined &&
      effectiveVariant.available_inventory !== null &&
      effectiveVariant.available_inventory !== ''
    ) {
      const parsed = Number(effectiveVariant.available_inventory);
      if (!isNaN(parsed)) return parsed;
    }
    // Fallback if available_inventory is missing on the variant
    if (typeof effectiveVariant.inventory === 'number') {
      return effectiveVariant.inventory;
    }
    if (
      effectiveVariant.inventory !== undefined &&
      effectiveVariant.inventory !== null &&
      effectiveVariant.inventory !== ''
    ) {
      const parsed = Number(effectiveVariant.inventory);
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  }

  if (!product) return 0;

  // 2. Base / main product: out of stock is decided by base_available_inventory
  if (typeof product.base_available_inventory === 'number') {
    return product.base_available_inventory;
  }
  if (
    product.base_available_inventory !== undefined &&
    product.base_available_inventory !== null &&
    product.base_available_inventory !== ''
  ) {
    const parsed = Number(product.base_available_inventory);
    if (!isNaN(parsed)) return parsed;
  }

  // 3. Fallback: available_inventory on base product if base_available_inventory is missing
  if (typeof product.available_inventory === 'number') {
    return product.available_inventory;
  }
  if (
    product.available_inventory !== undefined &&
    product.available_inventory !== null &&
    product.available_inventory !== ''
  ) {
    const parsed = Number(product.available_inventory);
    if (!isNaN(parsed)) return parsed;
  }

  // 4. Fallback: inventory on base product if available_inventory is missing
  if (typeof product.inventory === 'number') {
    return product.inventory;
  }
  if (
    product.inventory !== undefined &&
    product.inventory !== null &&
    product.inventory !== ''
  ) {
    const parsed = Number(product.inventory);
    if (!isNaN(parsed)) return parsed;
  }

  return 0;
}

export function isProductOutOfStock(product, currentVariant = null) {
  return getProductStock(product, currentVariant) <= 0;
}

export function hasInStockVariants(product) {
  if (!product || !Array.isArray(product.variants) || product.variants.length === 0) {
    return false;
  }
  return product.variants.some((v) => getProductStock(product, v) > 0);
}

export function getProductStockStatus(product) {
  if (!product) {
    return {
      isCompletelyOutOfStock: true,
      isSelectOption: false,
      baseOutOfStock: true,
      anyVariantInStock: false,
    };
  }

  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const baseOutOfStock = getProductStock(product, null) <= 0;
  const anyVariantInStock = hasVariants && product.variants.some((v) => getProductStock(product, v) > 0);
  const isCompletelyOutOfStock = baseOutOfStock && !anyVariantInStock;
  const isSelectOption = baseOutOfStock && anyVariantInStock;

  return {
    isCompletelyOutOfStock,
    isSelectOption,
    baseOutOfStock,
    anyVariantInStock,
  };
}

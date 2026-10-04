import { getAvailableStock } from './inventory';

export { getAvailableStock };

export function getProductStock(product, currentVariant = null) {
  const effectiveVariant = currentVariant || (product?.variant ? product.variant : null);
  return getAvailableStock(product, effectiveVariant);
}

export function isProductOutOfStock(product, currentVariant = null) {
  if (!product) return true;

  // 1. If checking a specific variant
  if (currentVariant) {
    return getProductStock(product, currentVariant) <= 0;
  }

  // 2. If checking a cart/order item with a variant attached
  if (product.variant) {
    return getProductStock(product, product.variant) <= 0;
  }

  // 3. If product has variants, it is ONLY out of stock if BOTH base AND ALL variants have 0 stock
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const baseStock = getAvailableStock(product, null);
    const anyVariantInStock = product.variants.some((v) => getAvailableStock(product, v) > 0);
    return baseStock <= 0 && !anyVariantInStock;
  }

  // 4. Standalone base product
  return getAvailableStock(product, null) <= 0;
}

export function hasInStockVariants(product) {
  if (!product || !Array.isArray(product.variants) || product.variants.length === 0) {
    return false;
  }
  return product.variants.some((v) => getAvailableStock(product, v) > 0);
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
  const baseOutOfStock = getAvailableStock(product, null) <= 0;
  const anyVariantInStock = hasVariants && product.variants.some((v) => getAvailableStock(product, v) > 0);
  const isCompletelyOutOfStock = baseOutOfStock && !anyVariantInStock;
  const isSelectOption = baseOutOfStock && anyVariantInStock;

  return {
    isCompletelyOutOfStock,
    isSelectOption,
    baseOutOfStock,
    anyVariantInStock,
  };
}

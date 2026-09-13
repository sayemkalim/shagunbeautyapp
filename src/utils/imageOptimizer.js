import { BASE_URL } from '../api/client';

export const IMAGE_PRESETS = {
  // Mini thumbnails for Cart, Orders, Checkout lists (200x200 cropped square)
  THUMBNAIL: { width: 200, height: 200, crop: 'fill', quality: 'q_auto', format: 'f_auto' },
  // Product cards in 2-column or horizontal grid (width 450px)
  PRODUCT_CARD: { width: 450, crop: 'limit', quality: 'q_auto', format: 'f_auto' },
  // Category circular avatars (200x200 cropped)
  CATEGORY_ICON: { width: 200, height: 200, crop: 'fill', quality: 'q_auto', format: 'f_auto' },
  // Full-width carousels, hero banners, deal headers (width 1000px)
  BANNER_HERO: { width: 1000, crop: 'limit', quality: 'q_auto', format: 'f_auto' },
  // Product detail primary gallery hero slider (width 1000px)
  DETAIL_MAIN: { width: 1000, crop: 'limit', quality: 'q_auto', format: 'f_auto' },
  // Product detail thumbnail indicator strip (160x160 cropped)
  DETAIL_THUMB: { width: 160, height: 160, crop: 'fill', quality: 'q_auto', format: 'f_auto' },
  // Brand logo tiles
  BRAND_LOGO: { width: 300, crop: 'limit', quality: 'q_auto', format: 'f_auto' },
};

/**
 * Resolves a raw image input into an absolute HTTP/HTTPS URL string.
 * Handles objects ({ url, uri, secure_url }), relative backend paths, and whitespace.
 */
export function resolveImageUrl(input) {
  if (!input) return null;

  let raw = input;
  if (typeof input === 'object') {
    raw = input.url || input.secure_url || input.uri || input.path || input.image || null;
  }

  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file:')
  ) {
    return trimmed;
  }

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${BASE_URL}${cleanPath}`;
}

/**
 * Injects dynamic Cloudinary transformation parameters (quality, format, dimensions, crop).
 * Returns the optimized URL, or the original if not a Cloudinary image.
 *
 * @param {string|object} url - Raw URL or object with image URL
 * @param {string|object} optionsOrPreset - Preset name (e.g. 'PRODUCT_CARD') or options object
 * @returns {string|null} Optimized URL string
 */
export function getOptimizedImageUrl(url, optionsOrPreset = 'PRODUCT_CARD') {
  const resolved = resolveImageUrl(url);
  if (!resolved) return null;

  const options =
    typeof optionsOrPreset === 'string'
      ? IMAGE_PRESETS[optionsOrPreset] || IMAGE_PRESETS.PRODUCT_CARD
      : optionsOrPreset || {};

  const uploadIdx = resolved.indexOf('/image/upload/');
  if (uploadIdx === -1) {
    // Non-Cloudinary URL — return resolved URL directly
    return resolved;
  }

  const prefix = resolved.slice(0, uploadIdx + '/image/upload/'.length);
  let rest = resolved.slice(uploadIdx + '/image/upload/'.length);

  // Check if rest starts with existing transformation segment
  const segments = rest.split('/');
  if (
    segments[0] &&
    (segments[0].includes(',') || /^(w_|h_|c_|q_|f_|b_|e_|r_|g_|a_|dpr_)/.test(segments[0]))
  ) {
    rest = segments.slice(1).join('/');
  }

  const {
    width,
    height,
    crop,
    quality = 'q_auto',
    format = 'f_auto',
  } = options;

  const transforms = [];
  if (format) transforms.push(format);
  if (quality) transforms.push(quality);
  if (width) transforms.push(`w_${Math.round(width)}`);
  if (height) transforms.push(`h_${Math.round(height)}`);

  if (crop) {
    transforms.push(`c_${crop}`);
  } else if (width && height) {
    transforms.push('c_fill,g_auto');
  } else if (width || height) {
    transforms.push('c_limit');
  }

  const transformStr = transforms.join(',');
  return `${prefix}${transformStr}/${rest}`;
}

/**
 * Returns a React Native Image `source` prop object with HTTP caching enabled,
 * or a local required number if a local asset is supplied.
 *
 * @param {string|object|number} input - Image source
 * @param {string|object} optionsOrPreset - Preset name or options
 * @param {number} fallbackRequire - Local image require to fall back to
 * @returns {object|number} Source suitable for <Image source={...} />
 */
export function getImageSource(input, optionsOrPreset = 'PRODUCT_CARD', fallbackRequire) {
  if (typeof input === 'number') {
    return input;
  }

  const optimized = getOptimizedImageUrl(input, optionsOrPreset);
  if (optimized) {
    return { uri: optimized, cache: 'force-cache' };
  }

  return fallbackRequire || require('../../assets/dummy_product.png');
}

export default {
  IMAGE_PRESETS,
  resolveImageUrl,
  getOptimizedImageUrl,
  getImageSource,
};

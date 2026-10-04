import { BASE_URL } from '../api/client';

export const IMAGE_PRESETS = {
  // Mini thumbnails for Cart, Orders, Checkout lists (200x200 cropped square in WebP)
  THUMBNAIL: { width: 200, height: 200, crop: 'fill', quality: 'q_auto:good', format: 'f_webp' },
  // Product cards in 2-column or horizontal grid (width 450px in WebP)
  PRODUCT_CARD: { width: 450, crop: 'limit', quality: 'q_auto:good', format: 'f_webp' },
  // Category circular avatars (200x200 cropped in WebP)
  CATEGORY_ICON: { width: 200, height: 200, crop: 'fill', quality: 'q_auto:good', format: 'f_webp' },
  // Full-width carousels, hero banners, deal headers (width 900px in WebP)
  BANNER_HERO: { width: 900, crop: 'limit', quality: 'q_auto:good', format: 'f_webp' },
  // Product detail primary gallery hero slider (width 900px in WebP)
  DETAIL_MAIN: { width: 900, crop: 'limit', quality: 'q_auto:good', format: 'f_webp' },
  // Product detail thumbnail indicator strip (160x160 cropped in WebP)
  DETAIL_THUMB: { width: 160, height: 160, crop: 'fill', quality: 'q_auto:good', format: 'f_webp' },
  // Brand logo tiles (300px in WebP)
  BRAND_LOGO: { width: 300, crop: 'limit', quality: 'q_auto:good', format: 'f_webp' },
};

/**
 * Resolves a raw image input into an absolute HTTP/HTTPS URL string.
 * Handles objects ({ url, uri, secure_url }), relative backend paths, and whitespace.
 */
export function resolveImageUrl(input) {
  if (!input) return null;

  let raw = input;
  if (typeof input === 'object') {
    raw = input.url || input.secure_url || input.uri || input.path || input.image || input.imageUrl || null;
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
 * Injects dynamic WebP transformation parameters (quality, WebP format, dimensions, crop).
 * Supports Cloudinary, Imgix/Unsplash, and general CDNs.
 *
 * @param {string|object} url - Raw URL or object with image URL
 * @param {string|object} optionsOrPreset - Preset name (e.g. 'PRODUCT_CARD') or options object
 * @returns {string|null} Optimized WebP URL string
 */
export function getOptimizedImageUrl(url, optionsOrPreset = 'PRODUCT_CARD') {
  const resolved = resolveImageUrl(url);
  if (!resolved) return null;

  const options =
    typeof optionsOrPreset === 'string'
      ? IMAGE_PRESETS[optionsOrPreset] || IMAGE_PRESETS.PRODUCT_CARD
      : optionsOrPreset || {};

  const {
    width,
    height,
    crop,
    quality = 'q_auto:good',
    format = 'f_webp',
  } = options;

  // 1. Cloudinary URL optimization with WebP + Auto Quality + Lossless metadata stripping
  const uploadIdx = resolved.indexOf('/image/upload/');
  if (uploadIdx !== -1) {
    const prefix = resolved.slice(0, uploadIdx + '/image/upload/'.length);
    let rest = resolved.slice(uploadIdx + '/image/upload/'.length);

    // Remove existing transformation segment if present
    const segments = rest.split('/');
    if (
      segments[0] &&
      (segments[0].includes(',') || /^(w_|h_|c_|q_|f_|b_|e_|r_|g_|a_|dpr_|fl_)/.test(segments[0]))
    ) {
      rest = segments.slice(1).join('/');
    }

    const transforms = [];
    if (format) transforms.push(format);
    if (quality) transforms.push(quality);
    transforms.push('fl_lossy', 'fl_strip_profile', 'dpr_auto');

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

  // 2. Unsplash / Imgix CDN WebP transformation
  if (resolved.includes('images.unsplash.com') || resolved.includes('imgix.net')) {
    const delimiter = resolved.includes('?') ? '&' : '?';
    const params = [];
    params.push('fm=webp', 'auto=format,compress', 'q=80');
    if (width) params.push(`w=${Math.round(width)}`);
    if (height) params.push(`h=${Math.round(height)}`);
    if (crop === 'fill') params.push('fit=crop');
    return `${resolved}${delimiter}${params.join('&')}`;
  }

  return resolved;
}

/**
 * Returns a React Native Image `source` prop object with WebP URL and HTTP caching enabled.
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
    return {
      uri: optimized,
      cache: 'force-cache',
    };
  }

  return fallbackRequire || require('../../assets/dummy_product.png');
}

export default {
  IMAGE_PRESETS,
  resolveImageUrl,
  getOptimizedImageUrl,
  getImageSource,
};

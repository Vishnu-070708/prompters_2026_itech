/**
 * Strip dangerous script tags, HTML tags, null bytes, and markup from citizen inputs to prevent XSS.
 * @param {string} text - Raw input text
 * @returns {string} Sanitized string safe for rendering and storage
 */
export function sanitizeInput(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/\0/g, '')                                                 // remove null bytes
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // remove script tags & contents
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // remove style tags & contents
    .replace(/<[^>]*>/g, '')                                             // remove any remaining HTML tags
    .trim();
}

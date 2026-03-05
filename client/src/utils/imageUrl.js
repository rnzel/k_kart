/**
 * Enhanced image URL utility that handles both regular filenames and Base64 images
 * @param {string} filename - Can be a filename, raw Base64, or full data URL
 * @returns {string} - Proper image URL or data URL for rendering
 */
export const getImageUrl = (filename) => {
  if (!filename) return ''
  
  // If it's already a data URL (starts with data:image/), return as-is
  if (filename.startsWith('data:image/')) {
    return filename
  }
  
  // If it looks like Base64 data (contains only valid Base64 characters and is long enough)
  if (isValidBase64(filename)) {
    return `data:image/png;base64,${filename}`
  }
  
  // Otherwise, treat as a regular filename and construct API URL
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  return `${baseUrl}/api/images/${filename}`
}

/**
 * Validates if a string is likely to be Base64 encoded data
 * @param {string} str - String to validate
 * @returns {boolean} - True if likely Base64
 */
function isValidBase64(str) {
  if (!str || typeof str !== 'string') return false
  
  // Base64 strings are typically long (images are usually > 100 chars)
  if (str.length < 100) return false
  
  // Check if string contains only valid Base64 characters
  // Base64: A-Z, a-z, 0-9, +, /, = (padding)
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
  
  // Remove any whitespace and check format
  const cleanStr = str.replace(/\s/g, '')
  
  return base64Regex.test(cleanStr)
}

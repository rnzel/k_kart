export const getImageUrl = (filename) => {
  if (!filename) return ''
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  return `${baseUrl}/api/images/${filename}`
}

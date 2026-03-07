import axios from 'axios'

// Get base URL from environment or use localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: API_BASE_URL
})

// Add token to all requests automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle response errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !error.config.url.includes('api/auth/login')
    ) {
      // Clear local storage
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // Redirect to login page
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

// Cart API methods
export const cartAPI = {
  // Get user's cart
  getCart: () => api.get('/api/cart'),
  
  // Add item to cart
  addToCart: (productId, quantity = 1) => 
    api.post('/api/cart/add', { productId, quantity }),
  
  // Update cart item quantity
  updateCartItem: (itemId, quantity) => 
    api.put(`/api/cart/update/${itemId}`, { quantity }),
  
  // Remove item from cart
  removeFromCart: (itemId) => 
    api.delete(`/api/cart/remove/${itemId}`),
  
  // Clear entire cart
  clearCart: () => api.delete('/api/cart/clear'),
  
  // Remove multiple items
  removeMultipleItems: (itemIds) => 
    api.delete('/api/cart/remove-multiple', { data: { itemIds } })
}

// Admin API methods
export const adminAPI = {
  // Get all users with pagination (with optional role filter and search)
  getUsers: (page = 1, limit = 10, role = null, search = null) => 
    api.get('/api/admin/users', { params: { page, limit, role, search } }),
  
  // Delete user
  deleteUser: (userId) => 
    api.delete(`/api/admin/users/${userId}`),
  
  // Get seller applications with pagination (with optional status filter)
  getSellerApplications: (status, page = 1, limit = 10) => 
    api.get('/api/admin/seller-applications', { params: { status, page, limit } }),
  
  // Approve or reject seller application
  reviewApplication: (userId, status, reason = '', note = '') => 
    api.patch(`/api/admin/seller-applications/${userId}`, { status, rejectionReason: reason, rejectionNote: note }),
  
  // Get my application status
  getMyApplication: () => api.get('/api/admin/my-application'),
  
  // Apply to become a seller
  applySeller: (idImage) => api.post('/api/admin/apply-seller', { idImage })
}

// Order API methods
export const orderAPI = {
  // Create orders from cart (checkout)
  createOrder: (pickupLocation, note) => 
    api.post('/api/orders/checkout', { pickupLocation, note }),
  
  // Get buyer's orders
  getMyOrders: () => api.get('/api/orders/my-orders'),
  
  // Get seller's orders
  getSellerOrders: () => api.get('/api/orders/seller-orders'),
  
  // Update order status (seller only)
  updateOrderStatus: (orderId, status) => 
    api.patch(`/api/orders/${orderId}/status`, { status }),
  
  // Cancel order (buyer only)
  cancelOrder: (orderId) => 
    api.patch(`/api/orders/${orderId}/cancel`)
}

export default api

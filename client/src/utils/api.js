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

// Enhanced error handler for API responses
const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response
    
    if (data && data.message) {
      return {
        success: false,
        message: data.message,
        errors: data.errors || [],
        statusCode: status
      }
    }
    
    // Generic error messages based on status
    const errorMessages = {
      400: 'Bad Request: Invalid input data',
      401: 'Unauthorized: Please log in to continue',
      403: 'Forbidden: You do not have permission to access this resource',
      404: 'Not Found: The requested resource was not found',
      409: 'Conflict: The request conflicts with the current state',
      422: 'Validation Error: Please check your input',
      500: 'Server Error: Please try again later',
      503: 'Service Unavailable: Please try again later'
    }
    
    return {
      success: false,
      message: errorMessages[status] || `Server Error (${status})`,
      errors: [],
      statusCode: status
    }
  } else if (error.request) {
    // Network error
    return {
      success: false,
      message: 'Network Error: Please check your internet connection',
      errors: [],
      statusCode: 0
    }
  } else {
    // Other error
    return {
      success: false,
      message: 'An unexpected error occurred',
      errors: [],
      statusCode: -1
    }
  }
}

// Stock validation helper
const validateStockBeforeAction = async (productId, quantity = 1) => {
  try {
    const response = await api.get(`/api/products/${productId}/stock`);
    if (response.data && response.data.stock !== undefined) {
      if (response.data.stock < quantity) {
        return {
          success: false,
          message: `Not enough stock available. Available: ${response.data.stock}, Requested: ${quantity}`
        };
      }
      return { success: true, availableStock: response.data.stock };
    }
    return { success: true }; // If we can't validate, let the server handle it
  } catch (error) {
    console.warn('Stock validation failed:', error);
    return { success: true }; // If validation fails, let the server handle it
  }
}

// Cart API methods with enhanced error handling
export const cartAPI = {
  // Get user's cart
  getCart: async () => {
    try {
      const response = await api.get('/api/cart')
      return {
        success: true,
        data: response.data.data || response.data,
        message: 'Cart retrieved successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  },
  
  // Add item to cart with stock validation
  addToCart: async (productId, quantity = 1) => {
    try {
      // Validate stock before adding
      const stockValidation = await validateStockBeforeAction(productId, quantity);
      if (!stockValidation.success) {
        return {
          success: false,
          message: stockValidation.message,
          data: null
        };
      }
      
      const response = await api.post('/api/cart/add', { productId, quantity })
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Item added to cart successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  },
  
  // Update cart item quantity
  updateCartItem: async (itemId, quantity) => {
    try {
      const response = await api.put(`/api/cart/update/${itemId}`, { quantity })
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Cart item updated successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  },
  
  // Remove item from cart
  removeFromCart: async (itemId) => {
    try {
      const response = await api.delete(`/api/cart/remove/${itemId}`)
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Item removed from cart successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  },
  
  // Clear entire cart
  clearCart: async () => {
    try {
      const response = await api.delete('/api/cart/clear')
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Cart cleared successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  },
  
  // Remove multiple items
  removeMultipleItems: async (itemIds) => {
    try {
      const response = await api.post('/api/cart/remove-multiple', { itemIds })
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Items removed from cart successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  }
}

// Admin API methods with enhanced error handling
export const adminAPI = {
  // Get all users with pagination (with optional role filter and search)
  getUsers: async (page = 1, limit = 10, role = null, search = null) => {
    try {
      const response = await api.get('/api/admin/users', { params: { page, limit, role, search } })
      return {
        success: true,
        data: response.data.data || response.data,
        message: 'Users retrieved successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  },
  
  // Delete user
  deleteUser: async (userId) => {
    try {
      const response = await api.delete(`/api/admin/users/${userId}`)
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'User deleted successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  },
  
  // Get seller applications with pagination (with optional status filter)
  getSellerApplications: async (status, page = 1, limit = 10) => {
    try {
      const response = await api.get('/api/admin/seller-applications', { params: { status, page, limit } })
      return {
        success: true,
        data: response.data.data || response.data,
        message: 'Seller applications retrieved successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  },
  
  // Approve or reject seller application
  reviewApplication: async (userId, status, reason = '', note = '') => {
    try {
      const response = await api.patch(`/api/admin/seller-applications/${userId}`, { status, rejectionReason: reason, rejectionNote: note })
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Application reviewed successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  },
  
  // Get my application status
  getMyApplication: async () => {
    try {
      const response = await api.get('/api/admin/my-application')
      return {
        success: true,
        data: response.data.data || response.data,
        message: 'Application status retrieved successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  },
  
  // Apply to become a seller
  applySeller: async (idImage) => {
    try {
      const response = await api.post('/api/admin/apply-seller', { idImage })
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Application submitted successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  }
}

// Order API methods with enhanced error handling
export const orderAPI = {
  // Create orders from cart (checkout)
  createOrder: async (pickupLocation, note, selectedItems, contactNumber) => {
    try {
      const response = await api.post('/api/orders/checkout', { pickupLocation, note, selectedItems, contactNumber })
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Order created successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  },
  
  // Get buyer's orders
  getMyOrders: async () => {
    try {
      const response = await api.get('/api/orders/my-orders')
      return {
        success: true,
        data: response.data.data || response.data,
        message: 'Orders retrieved successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  },
  
  // Get seller's orders
  getSellerOrders: async () => {
    try {
      const response = await api.get('/api/orders/seller-orders')
      return {
        success: true,
        data: response.data.data || response.data,
        message: 'Orders retrieved successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  },
  
  // Update order status (seller only)
  updateOrderStatus: async (orderId, status) => {
    try {
      const response = await api.patch(`/api/orders/${orderId}/status`, { status })
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Order status updated successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  },
  
  // Cancel order (buyer only)
  cancelOrder: async (orderId) => {
    try {
      const response = await api.patch(`/api/orders/${orderId}/cancel`)
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Order cancelled successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  }
}

export default api
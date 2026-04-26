import axios from 'axios'

// Get base URL from environment or use localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: API_BASE_URL
})

// In-memory cache for deduplicating GET requests
const pendingRequests = new Map();

// Add token and deduplication to all requests automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Deduplicate GET requests
  if (config.method === 'get') {
    const requestKey = `${config.url}${JSON.stringify(config.params || {})}`;
    if (pendingRequests.has(requestKey)) {
      // Return a custom flag to handle this in the response interceptor
      config.isDuplicate = true;
      config.originalRequest = pendingRequests.get(requestKey);
      
      // Use a cancel token to stop the actual network request
      const source = axios.CancelToken.source();
      config.cancelToken = source.token;
      source.cancel('Deduplicated request');
    } else {
      pendingRequests.set(requestKey, new Promise((resolve, reject) => {
        config.resolvePromise = resolve;
        config.rejectPromise = reject;
      }));
    }
  }

  return config
})

// Handle response errors and deduplication cleanup globally
api.interceptors.response.use(
  (response) => {
    const { config } = response;
    if (config.method === 'get') {
      const requestKey = `${config.url}${JSON.stringify(config.params || {})}`;
      if (config.resolvePromise) {
        config.resolvePromise(response);
      }
      pendingRequests.delete(requestKey);
    }
    return response;
  },
  async (error) => {
    // Handle deduplicated requests that were cancelled - these are NOT actual errors
    if (axios.isCancel(error) && error.message === 'Deduplicated request') {
      try {
        // When cancel is called from request interceptor, error.config does not exist
        if (error.config && error.config.originalRequest) {
          return await error.config.originalRequest;
        }
        
        // If we reach here, the request was cancelled inside the interceptor
        // These are NOT errors - this is intentional optimization
        // Return empty success response, caller will handle it gracefully
        return {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config || {}
        };
      } catch (originalError) {
        // If original request failed, pass that error through instead
        return Promise.reject(originalError);
      }
    }

    // Cleanup failed requests from pending map
    if (error.config && error.config.method === 'get') {
      const requestKey = `${error.config.url}${JSON.stringify(error.config.params || {})}`;
      if (error.config.rejectPromise) {
        error.config.rejectPromise(error);
      }
      pendingRequests.delete(requestKey);
    }

    // Handle 401 Unauthorized errors with automatic token refresh
    if (error.response?.status === 401 && 
        !error.config.url.includes('api/auth/login') &&
        !error.config.url.includes('api/auth/refresh') &&
        !error.config._retry
    ) {
      error.config._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
          // No refresh token available - redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('refreshToken');
          window.location.href = '/';
          return Promise.reject(error);
        }

        // Attempt token refresh
        const refreshResponse = await api.post('/api/auth/refresh', { refreshToken });
        
        if (refreshResponse.data.success) {
          // Save new tokens
          localStorage.setItem('token', refreshResponse.data.token);
          localStorage.setItem('refreshToken', refreshResponse.data.refreshToken);
          
          // Update authorization header for original request
          error.config.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
          
          // Retry original request with new token
          return api(error.config);
        }
      } catch (refreshError) {
        // Refresh failed - clear storage and redirect
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('refreshToken');
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error)
  }
)

// Enhanced error handler for API responses
const handleApiError = (error) => {
  // Ignore cancelled deduplication requests - these are not actual errors
  if (axios.isCancel(error) && error.message === 'Deduplicated request') {
    return null;
  }
  
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

// Enhanced error handler specifically for product operations
const handleProductApiError = (error) => {
  const baseError = handleApiError(error);
  
  // Add specific error messages for product operations
  if (error.response) {
    const { status, data } = error.response;
    
    // Check for specific validation errors
    if (status === 400 && data && data.errors) {
      const fieldErrors = data.errors.map(err => `${err.field}: ${err.message}`).join(', ');
      return {
        ...baseError,
        message: `Validation Error: ${fieldErrors}`,
        errors: data.errors
      };
    }
    
    // Check for file upload errors
    if (status === 400 && data && data.message) {
      const message = data.message.toLowerCase();
      if (message.includes('file') || message.includes('image')) {
        return {
          ...baseError,
          message: `Image Upload Error: ${data.message}`
        };
      }
    }
  }
  
  return baseError;
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
      const response = await api.patch(`/api/cart/update/${itemId}`, { quantity })
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

// Shop API methods with enhanced error handling
export const shopAPI = {
  // Get shop by ID
  getShopById: async (shopId) => {
    try {
      const response = await api.get(`/api/shops/${shopId}`)
      return {
        success: true,
        data: response.data,
        message: 'Shop retrieved successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  },
  
  // Get products by shop ID
  getProductsByShopId: async (shopId, page = 1, limit = 12) => {
    try {
      const response = await api.get(`/api/shops/${shopId}/products`, { params: { page, limit } })
      return {
        success: true,
        data: response.data,
        message: 'Products retrieved successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  },
  
  // Get all shops (admin only)
  getAllShops: async (page = 1, limit = 10) => {
    try {
      const response = await api.get('/api/admin/shops', { params: { page, limit } })
      return {
        success: true,
        data: response.data.data || response.data,
        pagination: response.data.pagination,
        message: 'Shops retrieved successfully'
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
  getMyOrders: async (page = 1, limit = 10) => {
    try {
      const response = await api.get('/api/orders/my-orders', { params: { page, limit } })
      return {
        success: true,
        data: response.data.data || response.data,
        pagination: response.data.pagination,
        message: 'Orders retrieved successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  },
  
  // Get seller's orders
  getSellerOrders: async (page = 1, limit = 10) => {
    try {
      const response = await api.get('/api/orders/seller-orders', { params: { page, limit } })
      return {
        success: true,
        data: response.data.data || response.data,
        pagination: response.data.pagination,
        message: 'Orders retrieved successfully'
      }
    } catch (error) {
      return handleApiError(error)
    }
  },
  
  // Get all orders (admin only)
  getAllOrders: async (page = 1, limit = 10) => {
    try {
      const response = await api.get('/api/admin/orders', { params: { page, limit } })
      return {
        success: true,
        data: response.data.data || response.data,
        pagination: response.data.pagination,
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

// Search API methods
export const searchAPI = {
  // Get search suggestions (for autocomplete dropdown)
  getSuggestions: async (query) => {
    try {
      const response = await api.get('/api/search/suggestions', { params: { q: query } });
      return {
        success: true,
        data: response.data.data || response.data,
        message: 'Search suggestions retrieved successfully'
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Get search results (for main search results page)
  searchProducts: async (query, page = 1, limit = 12, sort = 'relevance') => {
    try {
      const response = await api.get('/api/search/products', { 
        params: { q: query, page, limit, sort } 
      });
      return {
        success: true,
        data: response.data.data || response.data,
        message: 'Search results retrieved successfully'
      };
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// Product-specific API methods with enhanced error handling
export const productAPI = {
  // Create a new product
  createProduct: async (productData, images) => {
    try {
      const formData = new FormData();
      
      // Add product data
      Object.keys(productData).forEach(key => {
        if (productData[key] !== null && productData[key] !== undefined) {
          formData.append(key, productData[key]);
        }
      });
      
      // Add images
      if (images && images.length > 0) {
        images.forEach((file) => {
          formData.append('productImages', file);
        });
      }
      
      const response = await api.post('/api/products', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Product created successfully'
      };
    } catch (error) {
      return handleProductApiError(error);
    }
  },
  
  // Update an existing product
  updateProduct: async (productId, productData, images, keepImages = []) => {
    try {
      const formData = new FormData();
      
      // Add product data
      Object.keys(productData).forEach(key => {
        if (productData[key] !== null && productData[key] !== undefined) {
          formData.append(key, productData[key]);
        }
      });
      
      // Add images
      if (images && images.length > 0) {
        images.forEach((file) => {
          formData.append('productImages', file);
        });
      }
      
      // Add keepImages array
      formData.append('keepImages', JSON.stringify(keepImages));
      
      const response = await api.put(`/api/products/update-product/${productId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Product updated successfully'
      };
    } catch (error) {
      return handleProductApiError(error);
    }
  },
  
  // Delete a product
  deleteProduct: async (productId) => {
    try {
      const response = await api.delete(`/api/products/delete-product/${productId}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Product deleted successfully'
      };
    } catch (error) {
      return handleProductApiError(error);
    }
  },
  
  // Get my products (seller)
  getMyProducts: async (page = 1, limit = 10) => {
    try {
      const response = await api.get('/api/products/my-products', { params: { page, limit } });
      return {
        success: true,
        data: response.data.data || response.data,
        pagination: response.data.pagination,
        message: 'Products retrieved successfully'
      };
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Get all products (public)
  getAllProducts: async (page = 1, limit = 12) => {
    try {
      const response = await api.get('/api/products', { params: { page, limit } });
      return {
        success: true,
        data: response.data.data || response.data,
        pagination: response.data.pagination,
        message: 'Products retrieved successfully'
      };
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Get product by ID
  getProductById: async (productId) => {
    try {
      const response = await api.get(`/api/products/${productId}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: 'Product retrieved successfully'
      };
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Get products by shop ID
  getProductsByShopId: async (shopId, page = 1, limit = 12) => {
    try {
      const response = await api.get(`/api/products/shop/${shopId}`, { params: { page, limit } });
      return {
        success: true,
        data: response.data.data || response.data,
        pagination: response.data.pagination,
        message: 'Products retrieved successfully'
      };
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Get product stock
  getProductStock: async (productId) => {
    try {
      const response = await api.get(`/api/products/${productId}/stock`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: 'Stock retrieved successfully'
      };
    } catch (error) {
      return handleApiError(error);
    }
  }
};

export default api

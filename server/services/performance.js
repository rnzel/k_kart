const mongoose = require('mongoose');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const User = require('../models/User');
const Order = require('../models/Order');
const Cart = require('../models/Cart');

/**
 * Performance Optimization Service
 * Handles caching, query optimization, and performance monitoring
 */

class PerformanceService {
  
  // Cache configuration
  static cache = new Map();
  static CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  static CACHE_MAX_SIZE = 1000;

  /**
   * Get products with optimized query and caching
   */
  static async getProducts(page = 1, limit = 12, filters = {}, sort = 'relevance') {
    try {
      const skip = (page - 1) * limit;
      const cacheKey = `products:${page}:${limit}:${JSON.stringify(filters)}:${sort}`;

      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Build query
      const query = { isDeleted: { $ne: true } };
      
      // Apply filters
      if (filters.shopId) {
        query.shop = filters.shopId;
      }
      
      if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
        query.productPrice = { $gte: filters.minPrice, $lte: filters.maxPrice };
      } else if (filters.minPrice !== undefined) {
        query.productPrice = { $gte: filters.minPrice };
      } else if (filters.maxPrice !== undefined) {
        query.productPrice = { $lte: filters.maxPrice };
      }

      // Build sort options
      let sortOptions = {};
      switch (sort) {
        case 'price-asc':
          sortOptions = { productPrice: 1 };
          break;
        case 'price-desc':
          sortOptions = { productPrice: -1 };
          break;
        case 'date-asc':
          sortOptions = { createdAt: 1 };
          break;
        case 'date-desc':
          sortOptions = { createdAt: -1 };
          break;
        case 'relevance':
        default:
          sortOptions = { createdAt: -1 }; // Default to newest first
      }

      // Execute optimized query with projection
      const [products, total] = await Promise.all([
        Product.find(query)
          .select('productName productPrice productStock productImages featuredImageIndex shop createdAt')
          .populate({
            path: 'shop',
            select: 'shopName shopLogo shopLocation',
            match: { isDeleted: { $ne: true } }
          })
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(query)
      ]);

      // Filter out products with deleted shops
      const validProducts = products.filter(p => p.shop);

      const result = {
        success: true,
        data: validProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };

      // Cache the result
      this.setCache(cacheKey, result);

      return result;

    } catch (error) {
      console.error('Error getting products:', error);
      throw error;
    }
  }

  /**
   * Get shops with optimized query and caching
   */
  static async getShops(page = 1, limit = 10, filters = {}) {
    try {
      const skip = (page - 1) * limit;
      const cacheKey = `shops:${page}:${limit}:${JSON.stringify(filters)}`;

      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Build query
      const query = { isDeleted: { $ne: true } };
      
      if (filters.location) {
        query.shopLocation = { $regex: filters.location, $options: 'i' };
      }

      // Execute optimized query
      const [shops, total] = await Promise.all([
        Shop.find(query)
          .select('shopName shopDescription shopLogo shopLocation shopContact owner createdAt')
          .populate({
            path: 'owner',
            select: 'firstName lastName email',
            match: { isDeleted: { $ne: true } }
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Shop.countDocuments(query)
      ]);

      // Filter out shops with deleted owners
      const validShops = shops.filter(s => s.owner);

      const result = {
        success: true,
        data: validShops,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };

      // Cache the result
      this.setCache(cacheKey, result);

      return result;

    } catch (error) {
      console.error('Error getting shops:', error);
      throw error;
    }
  }

  /**
   * Get product by ID with optimized query
   */
  static async getProductById(productId) {
    try {
      const cacheKey = `product:${productId}`;

      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Execute optimized query
      const product = await Product.findById(productId)
        .populate({
          path: 'shop',
          select: 'shopName shopDescription shopLogo shopLocation shopContact owner',
          populate: {
            path: 'owner',
            select: 'firstName lastName email'
          }
        })
        .lean();

      if (!product || product.isDeleted || !product.shop || product.shop.isDeleted) {
        return { success: false, message: 'Product not found' };
      }

      const result = {
        success: true,
        data: product
      };

      // Cache the result
      this.setCache(cacheKey, result);

      return result;

    } catch (error) {
      console.error('Error getting product:', error);
      throw error;
    }
  }

  /**
   * Get shop by ID with optimized query
   */
  static async getShopById(shopId) {
    try {
      const cacheKey = `shop:${shopId}`;

      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Execute optimized query
      const shop = await Shop.findById(shopId)
        .populate({
          path: 'owner',
          select: 'firstName lastName email role sellerStatus'
        })
        .lean();

      if (!shop || shop.isDeleted || !shop.owner || shop.owner.isDeleted) {
        return { success: false, message: 'Shop not found' };
      }

      const result = {
        success: true,
        data: shop
      };

      // Cache the result
      this.setCache(cacheKey, result);

      return result;

    } catch (error) {
      console.error('Error getting shop:', error);
      throw error;
    }
  }

  /**
   * Get user's orders with optimized query
   */
  static async getUserOrders(userId, userType = 'buyer', page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const cacheKey = `orders:${userType}:${userId}:${page}:${limit}`;

      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Build query based on user type
      const query = userType === 'buyer' ? { buyer: userId } : { seller: userId };

      // Execute optimized query
      const [orders, total] = await Promise.all([
        Order.find(query)
          .populate([
            {
              path: 'buyer',
              select: 'firstName lastName email'
            },
            {
              path: 'seller',
              select: 'firstName lastName email'
            },
            {
              path: 'items.product',
              select: 'productName productImages productStock'
            }
          ])
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Order.countDocuments(query)
      ]);

      const result = {
        success: true,
        data: orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };

      // Cache the result
      this.setCache(cacheKey, result);

      return result;

    } catch (error) {
      console.error('Error getting user orders:', error);
      throw error;
    }
  }

  /**
   * Search products with optimized query
   */
  static async searchProducts(query, page = 1, limit = 12, sort = 'relevance') {
    try {
      const skip = (page - 1) * limit;
      const cacheKey = `search:${query}:${page}:${limit}:${sort}`;

      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Build search query using text search or regex
      let searchQuery;
      if (mongoose.connection.db.databaseName) {
        // Use text search if available
        searchQuery = {
          $text: { $search: query },
          isDeleted: { $ne: true }
        };
      } else {
        // Fallback to regex search
        searchQuery = {
          $or: [
            { productName: { $regex: query, $options: 'i' } },
            { productDescription: { $regex: query, $options: 'i' } }
          ],
          isDeleted: { $ne: true }
        };
      }

      // Build sort options
      let sortOptions = {};
      if (sort === 'relevance' && mongoose.connection.db.databaseName) {
        sortOptions = { score: { $meta: 'textScore' } };
      } else {
        switch (sort) {
          case 'price-asc':
            sortOptions = { productPrice: 1 };
            break;
          case 'price-desc':
            sortOptions = { productPrice: -1 };
            break;
          case 'date-asc':
            sortOptions = { createdAt: 1 };
            break;
          case 'date-desc':
            sortOptions = { createdAt: -1 };
            break;
          default:
            sortOptions = { createdAt: -1 };
        }
      }

      // Execute optimized search query
      const [products, total] = await Promise.all([
        Product.find(searchQuery)
          .select('productName productPrice productStock productImages featuredImageIndex shop createdAt')
          .populate({
            path: 'shop',
            select: 'shopName shopLogo shopLocation',
            match: { isDeleted: { $ne: true } }
          })
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(searchQuery)
      ]);

      // Filter out products with deleted shops
      const validProducts = products.filter(p => p.shop);

      const result = {
        success: true,
        data: validProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };

      // Cache the result
      this.setCache(cacheKey, result);

      return result;

    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  /**
   * Get search suggestions with caching
   */
  static async getSearchSuggestions(query, limit = 5) {
    try {
      const cacheKey = `suggestions:${query}:${limit}`;

      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Get suggestions from product names
      const suggestions = await Product.aggregate([
        {
          $match: {
            productName: { $regex: `^${query}`, $options: 'i' },
            isDeleted: { $ne: true }
          }
        },
        {
          $group: {
            _id: '$productName',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1, _id: 1 }
        },
        {
          $limit: limit
        },
        {
          $project: {
            suggestion: '$_id',
            _id: 0
          }
        }
      ]);

      const result = {
        success: true,
        data: suggestions.map(s => s.suggestion)
      };

      // Cache the result
      this.setCache(cacheKey, result);

      return result;

    } catch (error) {
      console.error('Error getting search suggestions:', error);
      throw error;
    }
  }

  /**
   * Cache management methods
   */
  static setCache(key, value) {
    // Implement LRU cache with size limit
    if (this.cache.size >= this.CACHE_MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }

  static getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  static clearCache() {
    this.cache.clear();
  }

  static getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.CACHE_MAX_SIZE,
      ttl: this.CACHE_TTL
    };
  }

  /**
   * Database query optimization helpers
   */
  static async optimizeDatabaseIndexes() {
    try {
      // Create indexes for frequently queried fields
      await Product.createIndexes([
        { key: { isDeleted: 1, createdAt: -1 } },
        { key: { shop: 1, isDeleted: 1 } },
        { key: { productPrice: 1 } },
        { key: { productName: 'text', productDescription: 'text' } }
      ]);

      await Shop.createIndexes([
        { key: { isDeleted: 1, createdAt: -1 } },
        { key: { owner: 1 } },
        { key: { shopLocation: 'text' } }
      ]);

      await Order.createIndexes([
        { key: { buyer: 1, createdAt: -1 } },
        { key: { seller: 1, createdAt: -1 } },
        { key: { status: 1 } },
        { key: { orderNumber: 1 }, unique: true }
      ]);

      await User.createIndexes([
        { key: { email: 1 }, unique: true },
        { key: { role: 1, sellerStatus: 1 } },
        { key: { isDeleted: 1, dateRegistered: -1 } }
      ]);

      await Cart.createIndexes([
        { key: { user: 1 }, unique: true }
      ]);

      return { success: true, message: 'Database indexes optimized' };

    } catch (error) {
      console.error('Error optimizing database indexes:', error);
      throw error;
    }
  }

  /**
   * Performance monitoring
   */
  static async getPerformanceMetrics() {
    try {
      const metrics = {
        cache: this.getCacheStats(),
        database: {
          collections: await this.getCollectionStats(),
          indexes: await this.getIndexStats()
        },
        memory: {
          used: process.memoryUsage(),
          uptime: process.uptime()
        }
      };

      return { success: true, data: metrics };

    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  static async getCollectionStats() {
    try {
      const collections = ['products', 'shops', 'users', 'orders', 'carts'];
      const stats = {};

      for (const collection of collections) {
        const count = await mongoose.connection.db.collection(collection).countDocuments();
        stats[collection] = { count };
      }

      return stats;

    } catch (error) {
      console.error('Error getting collection stats:', error);
      return {};
    }
  }

  static async getIndexStats() {
    try {
      const collections = ['products', 'shops', 'users', 'orders', 'carts'];
      const indexStats = {};

      for (const collection of collections) {
        const indexes = await mongoose.connection.db.collection(collection).indexes();
        indexStats[collection] = indexes;
      }

      return indexStats;

    } catch (error) {
      console.error('Error getting index stats:', error);
      return {};
    }
  }

  /**
   * Cleanup expired cache entries
   */
  static cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Start periodic cache cleanup
   */
  static startCacheCleanup(interval = 5 * 60 * 1000) { // 5 minutes
    setInterval(() => {
      this.cleanupCache();
    }, interval);
  }
}

// Start periodic cache cleanup
PerformanceService.startCacheCleanup();

module.exports = PerformanceService;
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const AppError = require('../middleware/errorHandler').AppError;

/**
 * Data Integrity Service
 * Handles stock management, order validation, and database constraints
 */

class DataIntegrityService {
  
  /**
   * Validate product stock before adding to cart or creating order
   */
  static async validateStock(productId, quantity, userId = null) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
      }

      if (product.isDeleted) {
        throw new AppError('Product has been deleted', 400, 'PRODUCT_DELETED');
      }

      if (product.productStock < quantity) {
        throw new AppError(`Insufficient stock. Available: ${product.productStock}, Requested: ${quantity}`, 400, 'INSUFFICIENT_STOCK');
      }

      // Check if product belongs to an active shop
      const shop = await Shop.findById(product.shop);
      if (!shop || shop.isDeleted) {
        throw new AppError('Product belongs to a deleted or inactive shop', 400, 'SHOP_INACTIVE');
      }

      return {
        success: true,
        product: {
          id: product._id,
          name: product.productName,
          price: product.productPrice,
          stock: product.productStock,
          shopId: product.shop
        }
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Reserve stock for order creation (deduct stock temporarily)
   */
  static async reserveStock(productId, quantity) {
    try {
      const session = await mongoose.startSession();
      
      return await session.withTransaction(async () => {
        const product = await Product.findById(productId).session(session);
        if (!product) {
          throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
        }

        if (product.isDeleted) {
          throw new AppError('Product has been deleted', 400, 'PRODUCT_DELETED');
        }

        if (product.productStock < quantity) {
          throw new AppError(`Insufficient stock. Available: ${product.productStock}, Requested: ${quantity}`, 400, 'INSUFFICIENT_STOCK');
        }

        // Reserve stock by deducting from available stock
        const updatedProduct = await Product.findByIdAndUpdate(
          productId,
          { $inc: { productStock: -quantity } },
          { new: true, session }
        );

        return {
          success: true,
          reservedStock: quantity,
          remainingStock: updatedProduct.productStock
        };

      });

    } catch (error) {
      throw error;
    }
  }

  /**
   * Release reserved stock (add back to inventory)
   */
  static async releaseStock(productId, quantity) {
    try {
      const session = await mongoose.startSession();
      
      return await session.withTransaction(async () => {
        const product = await Product.findById(productId).session(session);
        if (!product) {
          throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
        }

        // Release stock by adding back to available stock
        const updatedProduct = await Product.findByIdAndUpdate(
          productId,
          { $inc: { productStock: quantity } },
          { new: true, session }
        );

        return {
          success: true,
          releasedStock: quantity,
          currentStock: updatedProduct.productStock
        };

      });

    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate order items and calculate total
   */
  static async validateOrderItems(items) {
    try {
      if (!Array.isArray(items) || items.length === 0) {
        throw new AppError('Order must contain at least one item', 400, 'EMPTY_ORDER');
      }

      let totalAmount = 0;
      const validatedItems = [];
      const productIds = new Set();

      for (const item of items) {
        const { productId, quantity } = item;

        if (productIds.has(productId)) {
          throw new AppError(`Duplicate product found: ${productId}`, 400, 'DUPLICATE_PRODUCT');
        }
        productIds.add(productId);

        // Validate stock and get product details
        const stockValidation = await this.validateStock(productId, quantity);
        const product = stockValidation.product;

        // Calculate item total
        const itemTotal = product.price * quantity;

        validatedItems.push({
          product: product.id,
          productName: product.name,
          quantity: quantity,
          price: product.price,
          seller: product.shop, // This should be the shop owner's ID
          sellerName: '', // Will be populated later
          contactNumber: '' // Will be populated from shop
        });

        totalAmount += itemTotal;
      }

      return {
        success: true,
        items: validatedItems,
        totalAmount: totalAmount
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Create order with stock reservation
   */
  static async createOrder(orderData) {
    try {
      const {
        buyerId,
        sellerId,
        items,
        pickupLocation,
        contactNumber,
        note = '',
        paymentMethod = 'COD'
      } = orderData;

      // Validate buyer and seller
      const [buyer, seller] = await Promise.all([
        mongoose.connection.db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(buyerId) }),
        mongoose.connection.db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(sellerId) })
      ]);

      if (!buyer) {
        throw new AppError('Buyer not found', 404, 'BUYER_NOT_FOUND');
      }

      if (!seller) {
        throw new AppError('Seller not found', 404, 'SELLER_NOT_FOUND');
      }

      if (buyer.isDeleted || seller.isDeleted) {
        throw new AppError('One or both users have been deactivated', 400, 'USER_INACTIVE');
      }

      // Validate order items and reserve stock
      const validation = await this.validateOrderItems(items);
      
      // Reserve stock for all items
      const stockReservations = [];
      for (const item of validation.items) {
        const reservation = await this.reserveStock(item.product, item.quantity);
        stockReservations.push(reservation);
      }

      // Create order
      const session = await mongoose.startSession();
      let order;
      
      try {
        order = await session.withTransaction(async () => {
          const newOrder = new Order({
            orderNumber: await this.generateOrderNumber(),
            buyer: buyerId,
            seller: sellerId,
            items: validation.items,
            totalAmount: validation.totalAmount,
            pickupLocation: pickupLocation.trim(),
            contactNumber: contactNumber.trim(),
            note: note.trim(),
            paymentMethod: paymentMethod,
            status: 'Pending'
          });

          return await newOrder.save({ session });
        });

      } catch (error) {
        // If order creation fails, release all reserved stock
        for (const item of validation.items) {
          await this.releaseStock(item.product, item.quantity);
        }
        throw error;
      }

      return {
        success: true,
        order: order,
        stockReservations: stockReservations
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancel order and release stock
   */
  static async cancelOrder(orderId, userId, userType = 'buyer') {
    try {
      const session = await mongoose.startSession();
      
      return await session.withTransaction(async () => {
        const order = await Order.findById(orderId).session(session);
        if (!order) {
          throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        // Check if order can be cancelled
        if (order.status === 'Completed' || order.status === 'On-Delivery') {
          throw new AppError('Cannot cancel order that is already in progress or completed', 400, 'ORDER_CANNOT_CANCEL');
        }

        // Check authorization
        if (userType === 'buyer' && order.buyer.toString() !== userId) {
          throw new AppError('Unauthorized: You can only cancel your own orders', 403, 'UNAUTHORIZED');
        }

        if (userType === 'seller' && order.seller.toString() !== userId) {
          throw new AppError('Unauthorized: You can only cancel orders from your shop', 403, 'UNAUTHORIZED');
        }

        // Release stock
        for (const item of order.items) {
          await this.releaseStock(item.product, item.quantity);
        }

        // Update order status
        order.status = 'Cancelled';
        order.cancelledAt = new Date();
        order.cancelledBy = userType;
        
        await order.save({ session });

        return {
          success: true,
          message: 'Order cancelled successfully',
          order: order
        };

      });

    } catch (error) {
      throw error;
    }
  }

  /**
   * Update order status with validation
   */
  static async updateOrderStatus(orderId, newStatus, userId) {
    try {
      const session = await mongoose.startSession();
      
      return await session.withTransaction(async () => {
        const order = await Order.findById(orderId).session(session);
        if (!order) {
          throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        // Validate status transition
        const validTransitions = {
          'Pending': ['Confirmed', 'Cancelled'],
          'Confirmed': ['On-Delivery'],
          'On-Delivery': ['Completed'],
          'Completed': [],
          'Cancelled': []
        };

        if (!validTransitions[order.status]?.includes(newStatus)) {
          throw new AppError(`Invalid status transition from ${order.status} to ${newStatus}`, 400, 'INVALID_STATUS_TRANSITION');
        }

        // Check if seller can update status
        if (order.seller.toString() !== userId) {
          throw new AppError('Unauthorized: Only the seller can update this order status', 403, 'UNAUTHORIZED');
        }

        // Handle stock release for cancelled orders
        if (newStatus === 'Cancelled') {
          for (const item of order.items) {
            await this.releaseStock(item.product, item.quantity);
          }
        }

        // Handle order completion (stock is already reserved, no need to release)
        order.status = newStatus;
        order.updatedAt = new Date();
        
        await order.save({ session });

        return {
          success: true,
          message: `Order status updated to ${newStatus}`,
          order: order
        };

      });

    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate unique order number
   */
  static async generateOrderNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    const baseNumber = `KK-${timestamp}-${random}`;
    
    // Check if order number already exists
    const existingOrder = await Order.findOne({ orderNumber: baseNumber });
    if (existingOrder) {
      // Add a suffix if collision occurs
      return `${baseNumber}-${Math.random().toString(36).substr(2, 2).toUpperCase()}`;
    }

    return baseNumber;
  }

  /**
   * Clean up expired reservations (orders not completed within time limit)
   */
  static async cleanupExpiredReservations() {
    try {
      const cutoffTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      
      const expiredOrders = await Order.find({
        status: 'Pending',
        createdAt: { $lt: cutoffTime }
      });

      let cleanedCount = 0;

      for (const order of expiredOrders) {
        try {
          // Release stock for expired order
          for (const item of order.items) {
            await this.releaseStock(item.product, item.quantity);
          }

          // Mark order as expired
          order.status = 'Cancelled';
          order.cancelledAt = new Date();
          order.cancelledBy = 'system';
          await order.save();

          cleanedCount++;
        } catch (error) {
          console.error(`Error cleaning up order ${order._id}:`, error.message);
        }
      }

      return {
        success: true,
        cleanedOrders: cleanedCount,
        message: `Cleaned up ${cleanedCount} expired orders`
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate cart items and update prices/stock
   */
  static async validateAndCleanCart(userId) {
    try {
      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (!cart) {
        return { success: true, cart: null, removedItems: 0 };
      }

      let removedItems = 0;
      const validItems = [];

      for (const item of cart.items) {
        try {
          // Check if product still exists and is not deleted
          if (!item.product || item.product.isDeleted) {
            removedItems++;
            continue;
          }

          // Check if shop is still active
          const shop = await Shop.findById(item.product.shop);
          if (!shop || shop.isDeleted) {
            removedItems++;
            continue;
          }

          // Check stock availability
          if (item.product.productStock < item.quantity) {
            // Reduce quantity to available stock or remove item
            if (item.product.productStock === 0) {
              removedItems++;
              continue;
            } else {
              item.quantity = item.product.productStock;
            }
          }

          // Update price if changed
          if (item.product.productPrice !== item.productPrice) {
            item.productPrice = item.product.productPrice;
          }

          // Update stock snapshot
          item.productStock = item.product.productStock;

          validItems.push(item);

        } catch (error) {
          console.error(`Error validating cart item:`, error.message);
          removedItems++;
        }
      }

      // Update cart with valid items
      if (removedItems > 0) {
        cart.items = validItems;
        await cart.save();
      }

      return {
        success: true,
        cart: cart,
        removedItems: removedItems
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Check data consistency across collections
   */
  static async checkDataConsistency() {
    try {
      const issues = [];

      // Check for products with negative stock
      const negativeStockProducts = await Product.find({ productStock: { $lt: 0 } });
      if (negativeStockProducts.length > 0) {
        issues.push({
          type: 'NEGATIVE_STOCK',
          count: negativeStockProducts.length,
          products: negativeStockProducts.map(p => ({ id: p._id, name: p.productName, stock: p.productStock }))
        });
      }

      // Check for orders with invalid product references
      const orders = await Order.find();
      for (const order of orders) {
        for (const item of order.items) {
          const product = await Product.findById(item.product);
          if (!product) {
            issues.push({
              type: 'INVALID_PRODUCT_REFERENCE',
              orderId: order._id,
              productId: item.product
            });
          }
        }
      }

      // Check for carts with invalid product references
      const carts = await Cart.find();
      for (const cart of carts) {
        for (const item of cart.items) {
          const product = await Product.findById(item.product);
          if (!product) {
            issues.push({
              type: 'INVALID_CART_PRODUCT',
              cartId: cart._id,
              productId: item.product
            });
          }
        }
      }

      return {
        success: true,
        issues: issues,
        hasIssues: issues.length > 0
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Fix data consistency issues
   */
  static async fixDataIssues() {
    try {
      const { issues } = await this.checkDataConsistency();
      let fixesApplied = 0;

      for (const issue of issues) {
        try {
          switch (issue.type) {
            case 'NEGATIVE_STOCK':
              for (const product of issue.products) {
                await Product.findByIdAndUpdate(product.id, { productStock: 0 });
                fixesApplied++;
              }
              break;

            case 'INVALID_PRODUCT_REFERENCE':
              // Remove invalid items from orders
              await Order.findByIdAndUpdate(issue.orderId, {
                $pull: { items: { product: issue.productId } }
              });
              fixesApplied++;
              break;

            case 'INVALID_CART_PRODUCT':
              // Remove invalid items from carts
              await Cart.findByIdAndUpdate(issue.cartId, {
                $pull: { items: { product: issue.productId } }
              });
              fixesApplied++;
              break;
          }
        } catch (error) {
          console.error(`Error fixing issue ${issue.type}:`, error.message);
        }
      }

      return {
        success: true,
        fixesApplied: fixesApplied,
        message: `Applied ${fixesApplied} fixes`
      };

    } catch (error) {
      throw error;
    }
  }
}

module.exports = DataIntegrityService;
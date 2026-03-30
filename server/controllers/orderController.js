const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const { generateOrderNumber } = require('../utils/orderNumberGenerator');

// Create orders from cart items (checkout)
const createOrder = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { pickupLocation, note, selectedItems, contactNumber } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized: Please log in to checkout' 
      });
    }

    // Validate pickup location
    if (!pickupLocation || !pickupLocation.trim()) {
      return res.status(400).json({ 
        success: false,
        message: 'Pickup location is required' 
      });
    }

    // Validate contact number
    if (!contactNumber || !contactNumber.trim()) {
      return res.status(400).json({ 
        success: false,
        message: 'Contact number is required' 
      });
    }

    // Validate Philippine phone number format (11 digits starting with 09)
    if (!/^09[0-9]{9}$/.test(contactNumber)) {
      return res.status(400).json({ 
        success: false,
        message: 'Contact number must be an 11-digit Philippine number starting with 09 (e.g., 09123456789)' 
      });
    }

    if (pickupLocation.trim().length > 200) {
      return res.status(400).json({ 
        success: false,
        message: 'Pickup location cannot exceed 200 characters' 
      });
    }

    if (note && note.length > 500) {
      return res.status(400).json({ 
        success: false,
        message: 'Note cannot exceed 500 characters' 
      });
    }

    // Validate selected items
    if (!selectedItems || !Array.isArray(selectedItems) || selectedItems.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Selected items are required' 
      });
    }

    // Use transaction to ensure atomicity
    const session = await Order.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Check if this is a direct checkout (product IDs) or cart checkout (cart item IDs)
        const isDirectCheckout = selectedItems.some(item => 
          item.productId && typeof item.productId === 'string'
        );

        let itemsToProcess = [];

        if (isDirectCheckout) {
          // Direct checkout: items are { productId, quantity }
          itemsToProcess = selectedItems;
        } else {
          // Cart checkout: items are cart item IDs
          // Get user's cart with session
          const cart = await Cart.findOne({ user: userId }).session(session)
            .populate('items.product', 'productStock productName productPrice isDeleted')
            .populate('items.shop', 'shopName owner isDeleted');

          if (!cart || cart.items.length === 0) {
            throw new Error('Cart is empty');
          }

          // Filter cart items to only include selected items
          itemsToProcess = cart.items.filter(item => 
            selectedItems.includes(item._id.toString())
          );

          if (itemsToProcess.length === 0) {
            throw new Error('No selected items found in cart');
          }
        }

        // Group items by seller
        const itemsBySeller = {};
        const validationErrors = [];

        // First pass: Validate all items and reserve stock
        for (const item of itemsToProcess) {
          let product, shop, quantity, productName;

          if (isDirectCheckout) {
            // Direct checkout format
            const productData = await Product.findById(item.productId).session(session);
            const shopData = await Shop.findOne({ _id: productData.shop }).session(session);
            
            if (!productData) {
              validationErrors.push(`Product not found: ${item.productId}`);
              continue;
            }

            if (productData.isDeleted) {
              validationErrors.push(`Cannot order deleted product: ${item.productId}`);
              continue;
            }

            if (!shopData) {
              validationErrors.push(`Shop not found for product: ${item.productId}`);
              continue;
            }

            if (shopData.isDeleted) {
              validationErrors.push(`Cannot order from deleted shop: ${shopData.shopName}`);
              continue;
            }

            product = productData;
            shop = shopData;
            quantity = item.quantity;
            productName = productData.productName;
          } else {
            // Cart item format
            product = item.product;
            shop = item.shop;
            quantity = item.quantity;
            productName = item.productName;
          }

          // Validate product and shop
          if (!product) {
            validationErrors.push(`Product not found for item: ${productName}`);
            continue;
          }

          if (product.isDeleted) {
            validationErrors.push(`Cannot order deleted product: ${productName}`);
            continue;
          }

          if (!shop) {
            validationErrors.push(`Shop not found for product: ${productName}`);
            continue;
          }

          if (shop.isDeleted) {
            validationErrors.push(`Cannot order from deleted shop: ${shop.shopName}`);
            continue;
          }

          // Validate stock with additional safety margin
          if (product.productStock < quantity) {
            validationErrors.push(`Insufficient stock for ${productName}. Available: ${product.productStock}, Requested: ${quantity}`);
            continue;
          }

          // Use the shop owner's user ID as the seller ID
          const sellerId = shop.owner.toString();
          if (!itemsBySeller[sellerId]) {
            itemsBySeller[sellerId] = {
              seller: shop.owner,
              sellerName: shop.shopName,
              items: []
            };
          }
          itemsBySeller[sellerId].items.push({
            product: product._id,
            productName: productName,
            quantity: quantity,
            price: product.productPrice,
            seller: shop.owner,
            sellerName: shop.shopName,
            contactNumber: contactNumber.trim()
          });
        }

        if (validationErrors.length > 0) {
          throw new Error(validationErrors.join('; '));
        }

        if (Object.keys(itemsBySeller).length === 0) {
          throw new Error('No valid items found');
        }

        const createdOrders = [];
        const failedOrders = [];

        // Second pass: Create orders and update stock atomically
        for (const sellerId in itemsBySeller) {
          const sellerData = itemsBySeller[sellerId];
          
          // Calculate total amount
          const totalAmount = sellerData.items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
          }, 0);

          try {
            // Generate unique order number
            const orderNumber = await generateOrderNumber();
            
            // Create order
            const order = new Order({
              orderNumber,
              buyer: userId,
              seller: sellerData.seller,
              items: sellerData.items,
              totalAmount,
              pickupLocation: pickupLocation.trim(),
              contactNumber: contactNumber.trim(),
              note: note || '',
              paymentMethod: 'COD',
              status: 'Pending'
            });

            await order.save({ session });
            
            // Update product stock atomically
            for (const item of sellerData.items) {
              const product = await Product.findById(item.product).session(session);
              if (product) {
                // Double-check stock before updating (optimistic concurrency control)
                if (product.productStock < item.quantity) {
                  throw new Error(`Stock reservation failed for ${item.productName}. Stock changed during checkout.`);
                }
                
                product.productStock -= item.quantity;
                await product.save({ session });
              }
            }
            
            createdOrders.push(order);
          } catch (error) {
            console.error('Error creating order for seller:', sellerId, error);
            failedOrders.push({
              sellerName: sellerData.sellerName,
              error: error.message
            });
          }
        }

        // Third pass: Remove purchased items from cart (only for cart checkout)
        if (!isDirectCheckout && createdOrders.length > 0) {
          // Get cart again to ensure we have the latest version
          const cart = await Cart.findOne({ user: userId }).session(session);
          if (cart) {
            console.log('Attempting to remove purchased items from cart...');
            console.log('Selected items to remove:', selectedItems);
            console.log('Cart items before removal:', cart.items.map(item => ({
              id: item._id.toString(),
              productId: item.product ? item.product.toString() : 'null',
              quantity: item.quantity
            })));

            // Remove all selected items from cart since they were successfully purchased
            const originalCartLength = cart.items.length;
            cart.items = cart.items.filter(item => {
              const shouldRemove = selectedItems.includes(item._id.toString());
              console.log(`Cart item ${item._id}: selected=${shouldRemove}`);
              return !shouldRemove;
            });
            
            const itemsRemoved = originalCartLength - cart.items.length;
            console.log(`Items removed from cart: ${itemsRemoved} (original: ${originalCartLength}, remaining: ${cart.items.length})`);
            
            if (itemsRemoved > 0) {
              await cart.save({ session });
              console.log(`Successfully removed ${itemsRemoved} purchased items from cart`);
            } else {
              console.log('No items were removed from cart - this indicates a matching issue');
            }
          }
        }

        // Prepare response
        const response = {
          success: createdOrders.length > 0,
          createdOrders,
          failedOrders,
          message: createdOrders.length > 0 
            ? `Successfully created ${createdOrders.length} order(s)`
            : 'No orders were created'
        };

        if (failedOrders.length > 0) {
          response.message += `. Failed: ${failedOrders.length} order(s)`;
        }

        res.status(createdOrders.length > 0 ? 201 : 400).json(response);
      });
    } catch (error) {
      if (error.message.includes('Cart is empty') ||
          error.message.includes('Cannot order') ||
          error.message.includes('Insufficient stock') ||
          error.message.includes('No valid items') ||
          error.message.includes('Stock reservation failed')) {
        return res.status(400).json({ 
          success: false,
          message: error.message 
        });
      }
      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create order. Please try again.' 
    });
  }
};

// Get buyer's orders
const getMyOrders = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized: Please log in to view your orders' 
      });
    }

    // Get total count for pagination
    const totalOrders = await Order.countDocuments({ buyer: userId });
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find({ buyer: userId })
      .populate('seller', 'firstName lastName email')
      .populate('items.product', 'productName productImages productStock')
      .populate('items.seller', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        totalPages,
        totalOrders
      }
    });
  } catch (error) {
    console.error('Error getting my orders:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to retrieve orders. Please try again.' 
    });
  }
};

// Get seller's orders
const getSellerOrders = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized: Please log in to view your orders' 
      });
    }

    // Get total count for pagination
    const totalOrders = await Order.countDocuments({ seller: userId });
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find({ seller: userId })
      .populate('buyer', 'firstName lastName email')
      .populate('items.product', 'productName productImages productStock')
      .populate('items.seller', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        totalPages,
        totalOrders
      }
    });
  } catch (error) {
    console.error('Error getting seller orders:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to retrieve orders. Please try again.' 
    });
  }
};

// Update order status (seller only)
const updateOrderStatus = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { status } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized: Please log in to update order status' 
      });
    }

    if (!status) {
      return res.status(400).json({ 
        success: false,
        message: 'Status is required' 
      });
    }

    const session = await Order.startSession();
    
    try {
      await session.withTransaction(async () => {
        const order = await Order.findById(id).session(session);
        if (!order) {
          throw new Error('Order not found');
        }

        // Check if user is the seller
        if (order.seller.toString() !== userId) {
          throw new Error('Forbidden: You can only update your own orders');
        }

        // Check if status transition is valid
        const validTransitions = Order.getValidTransitions();
        const allowedStatuses = validTransitions[order.status] || [];
        if (!allowedStatuses.includes(status)) {
          throw new Error(`Invalid status transition from ${order.status} to ${status}`);
        }

        order.status = status;
        await order.save({ session });

        res.status(200).json({
          success: true,
          message: 'Order status updated successfully',
          data: order
        });
      });
    } catch (error) {
      if (error.message.includes('Order not found') ||
          error.message.includes('Forbidden') ||
          error.message.includes('Invalid status transition')) {
        return res.status(400).json({ 
          success: false,
          message: error.message 
        });
      }
      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update order status. Please try again.' 
    });
  }
};

// Cancel order (buyer only, only if pending)
const cancelOrder = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized: Please log in to cancel order' 
      });
    }

    const session = await Order.startSession();
    
    try {
      await session.withTransaction(async () => {
        const order = await Order.findById(id).session(session);
        if (!order) {
          throw new Error('Order not found');
        }

        // Check if user is the buyer
        if (order.buyer.toString() !== userId) {
          throw new Error('Forbidden: You can only cancel your own orders');
        }

        // Check if order can be cancelled (only pending orders can be cancelled)
        if (order.status !== 'Pending') {
          throw new Error(`Cannot cancel order with status: ${order.status}. Only pending orders can be cancelled.`);
        }

        // Restore product stock for each item in the order
        for (const item of order.items) {
          try {
            const product = await Product.findById(item.product).session(session);
            if (product) {
              // Add back the quantity that was reserved
              product.productStock += item.quantity;
              await product.save({ session });
            }
          } catch (error) {
            console.error(`Error restoring stock for product ${item.product}:`, error);
            throw new Error(`Failed to restore stock for product: ${item.productName || item.product}`);
          }
        }

        // Update order status to cancelled
        order.status = 'Cancelled';
        await order.save({ session });

        res.status(200).json({
          success: true,
          message: 'Order cancelled successfully and stock has been restored.',
          data: order
        });
      });
    } catch (error) {
      if (error.message.includes('Order not found') ||
          error.message.includes('Forbidden') ||
          error.message.includes('Cannot cancel order') ||
          error.message.includes('Failed to restore stock')) {
        return res.status(400).json({ 
          success: false,
          message: error.message 
        });
      }
      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to cancel order. Please try again.' 
    });
  }
};

// Get order by order number
const getOrderByOrderNumber = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized: Please log in to view order' 
      });
    }

    if (!orderNumber) {
      return res.status(400).json({ 
        success: false,
        message: 'Order number is required' 
      });
    }

    const order = await Order.findByOrderNumber(orderNumber);
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // Check if user owns the order (either as buyer or seller)
    if (order.buyer._id.toString() !== userId && order.seller._id.toString() !== userId) {
      return res.status(403).json({ 
        success: false,
        message: 'Forbidden: You can only view your own orders' 
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error getting order by order number:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to retrieve order. Please try again.' 
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getSellerOrders,
  updateOrderStatus,
  cancelOrder,
  getOrderByOrderNumber
};
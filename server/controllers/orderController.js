const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
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

    // Validate Philippine phone number format (10 digits)
    if (!/^[0-9]{10}$/.test(contactNumber)) {
      return res.status(400).json({ 
        success: false,
        message: 'Contact number must be a 10-digit Philippine number (e.g., 09123456789)' 
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
        // Get user's cart with session
        const cart = await Cart.findOne({ user: userId }).session(session)
          .populate('items.product', 'productStock productName productPrice isDeleted')
          .populate('items.shop', 'shopName owner isDeleted');

        if (!cart || cart.items.length === 0) {
          throw new Error('Cart is empty');
        }

        // Filter cart items to only include selected items
        const selectedCartItems = cart.items.filter(item => 
          selectedItems.includes(item._id.toString())
        );

        if (selectedCartItems.length === 0) {
          throw new Error('No selected items found in cart');
        }

        // Group selected cart items by seller
        const itemsBySeller = {};
        const validationErrors = [];

        for (const item of selectedCartItems) {
          // Validate product and shop
          if (!item.product) {
            validationErrors.push(`Product not found for item: ${item.productName}`);
            continue;
          }

          if (item.product.isDeleted) {
            validationErrors.push(`Cannot order deleted product: ${item.productName}`);
            continue;
          }

          if (!item.shop) {
            validationErrors.push(`Shop not found for product: ${item.productName}`);
            continue;
          }

          if (item.shop.isDeleted) {
            validationErrors.push(`Cannot order from deleted shop: ${item.shop.shopName}`);
            continue;
          }

          // Validate stock
          if (item.product.productStock < item.quantity) {
            validationErrors.push(`Insufficient stock for ${item.productName}. Available: ${item.product.productStock}, Requested: ${item.quantity}`);
            continue;
          }

          // Use the shop owner's user ID as the seller ID
          const sellerId = item.shop.owner.toString();
          if (!itemsBySeller[sellerId]) {
            itemsBySeller[sellerId] = {
              seller: item.shop.owner,
              sellerName: item.shop.shopName,
              items: []
            };
          }
          itemsBySeller[sellerId].items.push({
            product: item.product._id,
            productName: item.product.productName,
            quantity: item.quantity,
            price: item.product.productPrice,
            seller: item.shop.owner,
            sellerName: item.shop.shopName,
            contactNumber: contactNumber.trim()
          });
        }

        if (validationErrors.length > 0) {
          throw new Error(validationErrors.join('; '));
        }

        if (Object.keys(itemsBySeller).length === 0) {
          throw new Error('No valid items found in cart');
        }

        const createdOrders = [];
        const failedOrders = [];

        // Create orders for each seller
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
            
            // Update product stock
            for (const item of sellerData.items) {
              const product = await Product.findById(item.product).session(session);
              if (product) {
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

        // Remove purchased items from cart
        if (createdOrders.length > 0) {
          // Get all cart item IDs that were successfully purchased
          const purchasedCartItemIds = createdOrders.flatMap(order => 
            order.items.map(item => item.product.toString())
          );

          // Remove only the successfully purchased items from the cart
          cart.items = cart.items.filter(item => {
            const wasSelected = selectedItems.includes(item._id.toString());
            const wasPurchased = purchasedCartItemIds.includes(item.product.toString());
            
            // Remove the item if it was selected AND successfully purchased
            // Keep the item if it wasn't selected OR if it was selected but failed to purchase
            return !(wasSelected && wasPurchased);
          });
          
          await cart.save({ session });
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
          error.message.includes('No valid items')) {
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

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized: Please log in to view your orders' 
      });
    }

    const orders = await Order.find({ buyer: userId })
      .populate('seller', 'firstName lastName email')
      .populate('items.product', 'productName productImages productStock')
      .populate('items.seller', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: orders
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

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized: Please log in to view your orders' 
      });
    }

    const orders = await Order.find({ seller: userId })
      .populate('buyer', 'firstName lastName email')
      .populate('items.product', 'productName productImages productStock')
      .populate('items.seller', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: orders
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
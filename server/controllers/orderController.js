const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { generateOrderNumber } = require('../utils/orderNumberGenerator');

// Create orders from cart items (checkout)
const createOrder = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { pickupLocation, note } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate pickup location is provided
    if (!pickupLocation || !pickupLocation.trim()) {
      return res.status(400).json({ message: 'Pickup location is required' });
    }

    // Get user's cart
    const cart = await Cart.findOne({ user: userId })
      .populate('items.product', 'productStock productName productPrice')
      .populate('items.shop', 'shopName');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Group cart items by seller
    const itemsBySeller = {};
    cart.items.forEach(item => {
      const sellerId = item.shop._id.toString();
      if (!itemsBySeller[sellerId]) {
        itemsBySeller[sellerId] = {
          seller: item.shop._id,
          sellerName: item.shop.shopName,
          items: []
        };
      }
      itemsBySeller[sellerId].items.push({
        product: item.product._id,
        productName: item.product.productName,
        quantity: item.quantity,
        price: item.product.productPrice
      });
    });

    const createdOrders = [];
    const failedOrders = [];

    // Create orders for each seller
    for (const sellerId in itemsBySeller) {
      const sellerData = itemsBySeller[sellerId];
      
      // Calculate total amount
      const totalAmount = sellerData.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);

      // Check stock for all items
      const stockChecks = await Promise.all(
        sellerData.items.map(async (item) => {
          const product = await Product.findById(item.product);
          if (!product) {
            return { valid: false, message: `Product not found: ${item.productName}` };
          }
          if (product.productStock < item.quantity) {
            return { 
              valid: false, 
              message: `Insufficient stock for ${item.productName}. Available: ${product.productStock}, Requested: ${item.quantity}` 
            };
          }
          return { valid: true };
        })
      );

      const hasStockIssues = stockChecks.some(check => !check.valid);
      if (hasStockIssues) {
        failedOrders.push({
          sellerName: sellerData.sellerName,
          error: stockChecks.find(check => !check.valid).message
        });
        continue;
      }

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
          pickupLocation: pickupLocation || 'SSU – Bulan Campus',
          note: note || '',
          paymentMethod: 'COD'
        });

        console.log('Creating order with data:', {
          orderNumber,
          buyer: userId,
          seller: sellerData.seller,
          totalAmount,
          pickupLocation: pickupLocation || 'SSU – Bulan Campus',
          note: note || '',
          paymentMethod: 'COD'
        });

        await order.save();
        console.log('Order saved successfully with orderNumber:', order.orderNumber);
        
        // Update product stock and handle cart updates
        const productsToUpdate = [];
        const productsToRemoveFromCart = [];
        
        for (const item of sellerData.items) {
          const product = await Product.findById(item.product);
          if (product) {
            // Update product stock
            product.productStock -= item.quantity;
            productsToUpdate.push(product);
            
            // If stock reaches zero, mark for cart removal
            if (product.productStock <= 0) {
              productsToRemoveFromCart.push(item.product.toString());
            }
          }
        }
        
        // Save all product updates
        await Promise.all(productsToUpdate.map(product => product.save()));
        
        createdOrders.push(order);
      } catch (error) {
        console.error('Error creating order:', error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          code: error.code,
          errors: error.errors
        });
        
        failedOrders.push({
          sellerName: sellerData.sellerName,
          error: error.message
        });
      }
    }

    // Remove purchased items from cart
    if (createdOrders.length > 0) {
      // Get all product IDs from successful orders
      const purchasedProductIds = createdOrders.flatMap(order => 
        order.items.map(item => item.product.toString())
      );

      console.log('Purchased product IDs:', purchasedProductIds);
      console.log('Cart items before filter:', cart.items.map(item => item.product.toString()));

      // Remove purchased items from cart
      cart.items = cart.items.filter(item => {
        const productId = item.product.toString();
        const shouldRemove = purchasedProductIds.includes(productId);
        console.log(`Checking item ${productId}: shouldRemove = ${shouldRemove}`);
        return !shouldRemove;
      });
      
      console.log('Cart items after purchased items filter:', cart.items.map(item => item.product.toString()));
      
      await cart.save();
      console.log('Cart saved successfully with', cart.items.length, 'items remaining');
    }

    // Prepare response
    const response = {
      success: true,
      createdOrders,
      failedOrders,
      message: createdOrders.length > 0 
        ? `Successfully created ${createdOrders.length} order(s)`
        : 'No orders were created'
    };

    if (failedOrders.length > 0) {
      response.message += `. Failed: ${failedOrders.length} order(s)`;
    }

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get buyer's orders
const getMyOrders = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const orders = await Order.find({ buyer: userId })
      .populate('seller', 'firstName lastName email')
      .populate('items.product', 'productName productImages')
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get seller's orders
const getSellerOrders = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const orders = await Order.find({ seller: userId })
      .populate('buyer', 'firstName lastName email')
      .populate('items.product', 'productName productImages')
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update order status (seller only)
const updateOrderStatus = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { status } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    // Valid status transitions
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['on_delivery'],
      on_delivery: ['completed'],
      completed: [],
      cancelled: []
    };

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is the seller
    if (order.seller.toString() !== userId) {
      return res.status(403).json({ message: 'Forbidden: You can only update your own orders' });
    }

    // Check if status transition is valid
    const allowedStatuses = validTransitions[order.status] || [];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status transition from ${order.status} to ${status}` 
      });
    }

    order.status = status;
    await order.save();

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cancel order (buyer only, only if pending)
const cancelOrder = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is the buyer
    if (order.buyer.toString() !== userId) {
      return res.status(403).json({ message: 'Forbidden: You can only cancel your own orders' });
    }

    // Check if order can be cancelled (only pending orders can be cancelled)
    if (order.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot cancel order with status: ${order.status}. Only pending orders can be cancelled.` 
      });
    }

    // Restore product stock for each item in the order
    const productsToUpdate = [];
    
    for (const item of order.items) {
      try {
        const product = await Product.findById(item.product);
        if (product) {
          // Add back the quantity that was reserved
          product.productStock += item.quantity;
          productsToUpdate.push(product);
        }
      } catch (error) {
        console.error(`Error restoring stock for product ${item.product}:`, error);
        return res.status(500).json({ 
          message: `Failed to restore stock for product: ${item.productName || item.product}` 
        });
      }
    }

    // Save all product updates
    try {
      await Promise.all(productsToUpdate.map(product => product.save()));
    } catch (error) {
      console.error('Error saving product updates:', error);
      return res.status(500).json({ 
        message: 'Failed to restore product stock. Please try again.' 
      });
    }

    // Update order status to cancelled
    order.status = 'cancelled';
    await order.save();

    res.status(200).json({
      ...order.toObject(),
      message: 'Order cancelled successfully and stock has been restored.'
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ message: 'Failed to cancel order. Please try again.' });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getSellerOrders,
  updateOrderStatus,
  cancelOrder
};
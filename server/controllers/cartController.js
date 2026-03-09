const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Shop = require('../models/Shop');

// Get user's cart
const getCart = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized: Please log in to view your cart' 
      });
    }

    let cart = await Cart.findByUserWithPopulate(userId);

    // If cart doesn't exist, create an empty one
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
      await cart.save();
      cart = await Cart.findByUserWithPopulate(userId);
    }

    // Validate cart items and update price/stock snapshots
    const validationErrors = await cart.validateItems();
    let removedItemsCount = 0;
    
    if (validationErrors.length > 0) {
      // Remove invalid items and save
      const validItems = cart.items.filter(item => {
        // Check if item.product is null or undefined before calling toString()
        if (!item.product) {
          return false; // Remove items with null product references
        }
        return validationErrors.every(error => !error.includes(item.product.toString()));
      });
      
      removedItemsCount = cart.items.length - validItems.length;
      
      // Only save if items were actually removed
      if (removedItemsCount > 0) {
        try {
          cart.items = validItems;
          await cart.save();
        } catch (saveError) {
          console.error('Error saving cleaned cart:', saveError);
          // Continue with the original cart even if save fails
          // This prevents 500 errors when products are deleted
        }
      }
    }

    res.status(200).json({
      success: true,
      data: cart,
      removedItemsCount: removedItemsCount,
      validationErrors: validationErrors
    });
  } catch (error) {
    console.error('Error getting cart:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to retrieve cart. Please try again.' 
    });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized: Please log in to add items to cart' 
      });
    }

    const { productId, quantity = 1 } = req.body;

    // Input validation
    if (!productId) {
      return res.status(400).json({ 
        success: false,
        message: 'Product ID is required' 
      });
    }

    const quantityNum = Number(quantity);
    if (isNaN(quantityNum) || quantityNum < 1 || quantityNum > 999) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid quantity. Must be between 1 and 999' 
      });
    }

    // Use transaction to prevent race conditions
    const session = await Cart.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Get product details with session
        const product = await Product.findById(productId).session(session);
        if (!product) {
          throw new Error('Product not found');
        }

        // Check if product is deleted
        if (product.isDeleted) {
          throw new Error('Cannot add deleted product to cart');
        }

        // Get shop details with session
        const shop = await Shop.findById(product.shop).session(session);
        if (!shop) {
          throw new Error('Shop not found');
        }

        // Check if shop is deleted
        if (shop.isDeleted) {
          throw new Error('Cannot add product from deleted shop to cart');
        }

        // Check stock - ensure we have enough for the requested quantity
        if (quantityNum > product.productStock) {
          throw new Error(`Not enough stock available. Available: ${product.productStock}`);
        }

        // Find or create cart with session
        let cart = await Cart.findOne({ user: userId }).session(session);
        if (!cart) {
          cart = new Cart({ user: userId, items: [] });
        }

        // Check if item already exists in cart
        const existingItemIndex = cart.items.findIndex(
          item => item.product.toString() === productId
        );

        if (existingItemIndex > -1) {
          // Update quantity - check if new total would exceed stock
          const currentQuantity = cart.items[existingItemIndex].quantity;
          const newTotalQuantity = currentQuantity + quantityNum;
          
          if (newTotalQuantity > product.productStock) {
            throw new Error(`Cannot add ${quantityNum} more items. Total would exceed available stock. Current: ${currentQuantity}, Requested: ${quantityNum}, Available: ${product.productStock}`);
          }
          
          cart.items[existingItemIndex].quantity = newTotalQuantity;
          // Update price and stock snapshot
          cart.items[existingItemIndex].productPrice = product.productPrice;
          cart.items[existingItemIndex].productStock = product.productStock;
        } else {
          // Add new item
          cart.items.push({
            product: product._id,
            productName: product.productName,
            productPrice: product.productPrice,
            productImages: product.productImages || [],
            productStock: product.productStock,
            quantity: quantityNum,
            shop: shop._id,
            shopName: shop.shopName,
            shopLogo: shop.shopLogo || null
          });
        }

        await cart.save({ session });
      });

      // Return populated cart
      const updatedCart = await Cart.findByUserWithPopulate(userId);

      res.status(200).json({
        success: true,
        message: 'Item added to cart successfully',
        data: updatedCart
      });
    } catch (error) {
      if (error.message.includes('Not enough stock') || 
          error.message.includes('Product not found') ||
          error.message.includes('Shop not found') ||
          error.message.includes('deleted')) {
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
    console.error('Error adding to cart:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to add item to cart. Please try again.' 
    });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized: Please log in to update cart' 
      });
    }

    if (!itemId) {
      return res.status(400).json({ 
        success: false,
        message: 'Item ID is required' 
      });
    }

    const quantityNum = Number(quantity);
    if (isNaN(quantityNum) || quantityNum < 1 || quantityNum > 999) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid quantity. Must be between 1 and 999' 
      });
    }

    const session = await Cart.startSession();
    
    try {
      await session.withTransaction(async () => {
        const cart = await Cart.findOne({ user: userId }).session(session);
        if (!cart) {
          throw new Error('Cart not found');
        }

        const itemIndex = cart.items.findIndex(
          item => item._id.toString() === itemId
        );

        if (itemIndex === -1) {
          throw new Error('Item not found in cart');
        }

        // Get product to check stock
        const product = await Product.findById(cart.items[itemIndex].product).session(session);
        if (!product) {
          throw new Error('Product not found');
        }

        if (product.isDeleted) {
          throw new Error('Cannot update quantity for deleted product');
        }

        if (quantityNum > product.productStock) {
          throw new Error(`Not enough stock available. Available: ${product.productStock}`);
        }

        cart.items[itemIndex].quantity = quantityNum;
        await cart.save({ session });
      });

      const updatedCart = await Cart.findByUserWithPopulate(userId);

      res.status(200).json({
        success: true,
        message: 'Cart item updated successfully',
        data: updatedCart
      });
    } catch (error) {
      if (error.message.includes('Cart not found') || 
          error.message.includes('Item not found') ||
          error.message.includes('Product not found') ||
          error.message.includes('Not enough stock') ||
          error.message.includes('deleted')) {
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
    console.error('Error updating cart item:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update cart item. Please try again.' 
    });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { itemId } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized: Please log in to remove items from cart' 
      });
    }

    if (!itemId) {
      return res.status(400).json({ 
        success: false,
        message: 'Item ID is required' 
      });
    }

    const session = await Cart.startSession();
    
    try {
      await session.withTransaction(async () => {
        const cart = await Cart.findOne({ user: userId }).session(session);
        if (!cart) {
          throw new Error('Cart not found');
        }

        const itemIndex = cart.items.findIndex(
          item => item._id.toString() === itemId
        );

        if (itemIndex === -1) {
          throw new Error('Item not found in cart');
        }

        cart.items.splice(itemIndex, 1);
        await cart.save({ session });
      });

      const updatedCart = await Cart.findByUserWithPopulate(userId);

      res.status(200).json({
        success: true,
        message: 'Item removed from cart successfully',
        data: updatedCart
      });
    } catch (error) {
      if (error.message.includes('Cart not found') || 
          error.message.includes('Item not found')) {
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
    console.error('Error removing from cart:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to remove item from cart. Please try again.' 
    });
  }
};

// Clear entire cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized: Please log in to clear cart' 
      });
    }

    const session = await Cart.startSession();
    
    try {
      await session.withTransaction(async () => {
        const cart = await Cart.findOne({ user: userId }).session(session);
        if (!cart) {
          throw new Error('Cart not found');
        }

        cart.items = [];
        await cart.save({ session });
      });

      res.status(200).json({
        success: true,
        message: 'Cart cleared successfully',
        data: { user: userId, items: [] }
      });
    } catch (error) {
      if (error.message.includes('Cart not found')) {
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
    console.error('Error clearing cart:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to clear cart. Please try again.' 
    });
  }
};

// Remove multiple items from cart
const removeMultipleItems = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { itemIds } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized: Please log in to remove items from cart' 
      });
    }

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Item IDs array is required' 
      });
    }

    const session = await Cart.startSession();
    
    try {
      await session.withTransaction(async () => {
        const cart = await Cart.findOne({ user: userId }).session(session);
        if (!cart) {
          throw new Error('Cart not found');
        }

        cart.items = cart.items.filter(
          item => !itemIds.includes(item._id.toString())
        );
        await cart.save({ session });
      });

      const updatedCart = await Cart.findByUserWithPopulate(userId);

      res.status(200).json({
        success: true,
        message: `${itemIds.length} item(s) removed from cart successfully`,
        data: updatedCart
      });
    } catch (error) {
      if (error.message.includes('Cart not found')) {
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
    console.error('Error removing multiple items from cart:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to remove items from cart. Please try again.' 
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  removeMultipleItems
};
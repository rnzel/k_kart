const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Shop = require('../models/Shop');

// Get user's cart
const getCart = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    let cart = await Cart.findOne({ user: userId })
      .populate('items.product', 'productStock')
      .populate('items.shop', 'shopName shopLogo');

    // If cart doesn't exist, create an empty one
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
      await cart.save();
    }

    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    // Get product details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get shop details
    const shop = await Shop.findById(product.shop);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Check stock
    const quantityNum = Number(quantity);
    if (quantityNum > product.productStock) {
      return res.status(400).json({ 
        message: 'Not enough stock available',
        availableStock: product.productStock 
      });
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantityNum;
      
      if (newQuantity > product.productStock) {
        return res.status(400).json({ 
          message: 'Not enough stock available',
          availableStock: product.productStock,
          currentQuantity: cart.items[existingItemIndex].quantity
        });
      }
      
      cart.items[existingItemIndex].quantity = newQuantity;
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

    await cart.save();
    
    // Return populated cart
    cart = await Cart.findById(cart._id)
      .populate('items.product', 'productStock')
      .populate('items.shop', 'shopName shopLogo');

    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!itemId) {
      return res.status(400).json({ message: 'Item ID is required' });
    }

    const quantityNum = Number(quantity);
    if (isNaN(quantityNum) || quantityNum < 1) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(
      item => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    // Get product to check stock
    const product = await Product.findById(cart.items[itemIndex].product);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (quantityNum > product.productStock) {
      return res.status(400).json({ 
        message: 'Not enough stock available',
        availableStock: product.productStock 
      });
    }

    cart.items[itemIndex].quantity = quantityNum;
    await cart.save();

    const updatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'productStock')
      .populate('items.shop', 'shopName shopLogo');

    res.status(200).json(updatedCart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { itemId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!itemId) {
      return res.status(400).json({ message: 'Item ID is required' });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(
      item => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    const updatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'productStock')
      .populate('items.shop', 'shopName shopLogo');

    res.status(200).json(updatedCart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Clear entire cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = [];
    await cart.save();

    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove multiple items from cart
const removeMultipleItems = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { itemIds } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ message: 'Item IDs array is required' });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(
      item => !itemIds.includes(item._id.toString())
    );
    await cart.save();

    const updatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'productStock')
      .populate('items.shop', 'shopName shopLogo');

    res.status(200).json(updatedCart);
  } catch (error) {
    res.status(500).json({ message: error.message });
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

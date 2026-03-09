const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productPrice: {
    type: Number,
    required: true,
    min: 0
  },
  productImages: [{
    type: String
  }],
  productStock: {
    type: Number,
    default: 0,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    max: 999
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  shopName: {
    type: String,
    required: true
  },
  shopLogo: {
    type: String,
    default: null
  }
}, { _id: true });

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema]
}, { 
  timestamps: true,
  // Add validation to prevent duplicate products in cart
  validate: {
    validator: function() {
      const productIds = this.items.map(item => item.product.toString());
      const uniqueProductIds = new Set(productIds);
      return productIds.length === uniqueProductIds.size;
    },
    message: 'Cannot add duplicate products to cart'
  }
});

// Method to calculate total price
cartSchema.methods.calculateTotal = function() {
  return this.items.reduce((total, item) => {
    return total + (item.productPrice * item.quantity);
  }, 0);
};

// Static method to find cart by user with populated items
cartSchema.statics.findByUserWithPopulate = function(userId) {
  return this.findOne({ user: userId })
    .populate('items.product', 'productStock productName productPrice')
    .populate('items.shop', 'shopName shopLogo');
};

// Instance method to validate cart items
cartSchema.methods.validateItems = async function() {
  const Product = mongoose.model('Product');
  const Shop = mongoose.model('Shop');
  const errors = [];
  
  // Use Promise.all for better performance
  const productPromises = this.items.map(item => Product.findById(item.product));
  const shopPromises = this.items.map(item => Shop.findById(item.shop));
  const products = await Promise.all(productPromises);
  const shops = await Promise.all(shopPromises);
  
  for (let i = 0; i < this.items.length; i++) {
    const item = this.items[i];
    const product = products[i];
    const shop = shops[i];
    
    // Validate product exists
    if (!product) {
      errors.push(`Product ${item.productName} (${item.product}) not found`);
      continue;
    }
    
    // Validate product is not deleted
    if (product.isDeleted) {
      errors.push(`Product ${item.productName} (${item.product}) has been deleted`);
      continue;
    }
    
    // Validate shop exists
    if (!shop) {
      errors.push(`Shop ${item.shopName} (${item.shop}) not found`);
      continue;
    }
    
    // Validate shop is not deleted
    if (shop.isDeleted) {
      errors.push(`Shop ${item.shopName} (${item.shop}) has been deleted`);
      continue;
    }
    
    // Validate stock
    if (product.productStock < item.quantity) {
      errors.push(`Insufficient stock for ${item.productName}. Available: ${product.productStock}, Requested: ${item.quantity}`);
    }
    
    // Validate shop ownership
    if (product.shop.toString() !== shop._id.toString()) {
      errors.push(`Shop mismatch for ${item.productName}. Product belongs to a different shop`);
    }
    
    // Update price and stock snapshot for consistency
    if (product.productPrice !== item.productPrice) {
      item.productPrice = product.productPrice;
    }
    item.productStock = product.productStock;
    
    // Update shop information for consistency
    if (shop.shopName !== item.shopName) {
      item.shopName = shop.shopName;
    }
    if (shop.shopLogo !== item.shopLogo) {
      item.shopLogo = shop.shopLogo;
    }
  }
  
  return errors;
};

// Enhanced validation method with detailed error reporting
cartSchema.methods.validateItemsDetailed = async function() {
  const Product = mongoose.model('Product');
  const Shop = mongoose.model('Shop');
  const validationResults = [];
  
  // Use Promise.all for better performance
  const productPromises = this.items.map(item => Product.findById(item.product));
  const shopPromises = this.items.map(item => Shop.findById(item.shop));
  const products = await Promise.all(productPromises);
  const shops = await Promise.all(shopPromises);
  
  for (let i = 0; i < this.items.length; i++) {
    const item = this.items[i];
    const product = products[i];
    const shop = shops[i];
    const validationResult = {
      itemId: item._id,
      productName: item.productName,
      shopName: item.shopName,
      valid: true,
      errors: [],
      warnings: []
    };
    
    // Validate product exists
    if (!product) {
      validationResult.valid = false;
      validationResult.errors.push('Product not found');
      validationResults.push(validationResult);
      continue;
    }
    
    // Validate product is not deleted
    if (product.isDeleted) {
      validationResult.valid = false;
      validationResult.errors.push('Product has been deleted');
      validationResults.push(validationResult);
      continue;
    }
    
    // Validate shop exists
    if (!shop) {
      validationResult.valid = false;
      validationResult.errors.push('Shop not found');
      validationResults.push(validationResult);
      continue;
    }
    
    // Validate shop is not deleted
    if (shop.isDeleted) {
      validationResult.valid = false;
      validationResult.errors.push('Shop has been deleted');
      validationResults.push(validationResult);
      continue;
    }
    
    // Validate stock
    if (product.productStock < item.quantity) {
      validationResult.valid = false;
      validationResult.errors.push(`Insufficient stock. Available: ${product.productStock}, Requested: ${item.quantity}`);
    }
    
    // Validate shop ownership
    if (product.shop.toString() !== shop._id.toString()) {
      validationResult.valid = false;
      validationResult.errors.push('Shop ownership mismatch');
    }
    
    // Check for price changes (warning)
    if (product.productPrice !== item.productPrice) {
      validationResult.warnings.push(`Price changed from ₱${item.productPrice} to ₱${product.productPrice}`);
    }
    
    // Check for stock changes (warning)
    if (product.productStock !== item.productStock) {
      validationResult.warnings.push(`Stock changed from ${item.productStock} to ${product.productStock}`);
    }
    
    // Update item with current data
    item.productPrice = product.productPrice;
    item.productStock = product.productStock;
    item.shopName = shop.shopName;
    item.shopLogo = shop.shopLogo;
    
    validationResults.push(validationResult);
  }
  
  return validationResults;
};

module.exports = mongoose.model('Cart', cartSchema);
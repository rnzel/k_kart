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
  const errors = [];
  
  // Use Promise.all for better performance
  const productPromises = this.items.map(item => Product.findById(item.product));
  const products = await Promise.all(productPromises);
  
  for (let i = 0; i < this.items.length; i++) {
    const item = this.items[i];
    const product = products[i];
    
    if (!product) {
      errors.push(`Product ${item.productName} (${item.product}) not found`);
      continue;
    }
    
    if (product.productStock < item.quantity) {
      errors.push(`Insufficient stock for ${item.productName}. Available: ${product.productStock}, Requested: ${item.quantity}`);
    }
    
    // Update price and stock snapshot
    if (product.productPrice !== item.productPrice) {
      item.productPrice = product.productPrice;
    }
    item.productStock = product.productStock;
  }
  
  return errors;
};

module.exports = mongoose.model('Cart', cartSchema);
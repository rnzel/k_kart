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
    required: true
  },
  productImages: [{
    type: String
  }],
  productStock: {
    type: Number,
    default: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
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
}, { timestamps: true });

// Method to calculate total price
cartSchema.methods.calculateTotal = function() {
  return this.items.reduce((total, item) => {
    return total + (item.productPrice * item.quantity);
  }, 0);
};

module.exports = mongoose.model('Cart', cartSchema);

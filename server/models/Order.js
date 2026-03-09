const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    max: 999
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerName: {
    type: String,
    required: true
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true,
    match: [/^[0-9]{10}$/, 'Contact number must be a 10-digit Philippine number'],
    maxlength: 10
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true,
    uppercase: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  pickupLocation: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true,
    match: [/^[0-9]{10}$/, 'Contact number must be a 10-digit Philippine number'],
    maxlength: 10
  },
  note: {
    type: String,
    default: '',
    maxlength: 500
  },
  paymentMethod: {
    type: String,
    enum: ['COD'],
    default: 'COD'
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'On-Delivery', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt before saving
orderSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// Static method to find order by order number
orderSchema.statics.findByOrderNumber = function(orderNumber) {
  return this.findOne({ orderNumber: orderNumber.toUpperCase() })
    .populate('buyer', 'firstName lastName email')
    .populate('seller', 'firstName lastName email')
    .populate('items.product', 'productName productImages productStock')
    .populate('items.seller', 'firstName lastName');
};

// Instance method to validate order
orderSchema.methods.validateOrder = async function() {
  const Product = mongoose.model('Product');
  const errors = [];
  
  for (let i = 0; i < this.items.length; i++) {
    const item = this.items[i];
    const product = await Product.findById(item.product);
    
    if (!product) {
      errors.push(`Product ${item.productName} (${item.product}) not found`);
      continue;
    }
    
    if (product.isDeleted) {
      errors.push(`Cannot order deleted product: ${item.productName}`);
    }
    
    if (product.productStock < item.quantity) {
      errors.push(`Insufficient stock for ${item.productName}. Available: ${product.productStock}, Requested: ${item.quantity}`);
    }
  }
  
  return errors;
};

// Static method to get order status history
orderSchema.statics.getStatusHistory = function() {
  return [
    'Pending',
    'Confirmed',
    'On-Delivery',
    'Completed',
    'Cancelled'
  ];
};

// Static method to get valid status transitions
orderSchema.statics.getValidTransitions = function() {
  return {
    'Pending': ['Confirmed', 'Cancelled'],
    'Confirmed': ['On-Delivery'],
    'On-Delivery': ['Completed'],
    'Completed': [],
    'Cancelled': []
  };
};

module.exports = mongoose.model('Order', orderSchema);
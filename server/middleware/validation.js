const mongoose = require('mongoose');

/**
 * Validation middleware for cart operations
 */

// Validate MongoDB ObjectId
const validateObjectId = (id, fieldName = 'ID') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`${fieldName} is not a valid ObjectId`);
  }
};

// Validate cart item data
const validateCartItem = (req, res, next) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const quantityNum = Number(quantity);
    if (isNaN(quantityNum) || quantityNum < 1 || quantityNum > 999) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a number between 1 and 999'
      });
    }

    req.validatedData = {
      productId,
      quantity: quantityNum
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Validation error'
    });
  }
};

// Validate order checkout data
const validateCheckout = (req, res, next) => {
  try {
    const { pickupLocation, note } = req.body;

    if (!pickupLocation || !pickupLocation.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Pickup location is required'
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

    req.validatedData = {
      pickupLocation: pickupLocation.trim(),
      note: note || ''
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Validation error'
    });
  }
};

// Validate order status update
const validateOrderStatus = (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['Pending', 'Accepted', 'Preparing', 'Ready for Pickup', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    req.validatedData = { status };
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Validation error'
    });
  }
};

// Validate order number format
const validateOrderNumber = (req, res, next) => {
  try {
    const { orderNumber } = req.params;

    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        message: 'Order number is required'
      });
    }

    // Order number format: KK-YYYY-MM-XXXXXX
    const orderNumberRegex = /^KK-\d{4}-\d{2}-\d{6}$/;
    if (!orderNumberRegex.test(orderNumber.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order number format. Expected: KK-YYYY-MM-XXXXXX'
      });
    }

    req.validatedData = {
      orderNumber: orderNumber.toUpperCase()
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Validation error'
    });
  }
};

/**
 * Validation middleware for product operations
 */

// Validate product data
const validateProduct = (req, res, next) => {
  try {
    const { productName, productPrice, productStock, productDescription } = req.body;

    if (!productName || productName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required and must be at least 2 characters long'
      });
    }

    if (productName.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Product name cannot exceed 100 characters'
      });
    }

    const price = Number(productPrice);
    if (isNaN(price) || price < 0 || price > 999999) {
      return res.status(400).json({
        success: false,
        message: 'Product price must be a number between 0 and 999,999'
      });
    }

    const stock = Number(productStock);
    if (isNaN(stock) || stock < 0 || stock > 999999) {
      return res.status(400).json({
        success: false,
        message: 'Product stock must be a number between 0 and 999,999'
      });
    }

    if (productDescription && productDescription.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Product description cannot exceed 1000 characters'
      });
    }

    req.validatedData = {
      productName: productName.trim(),
      productPrice: price,
      productStock: stock,
      productDescription: productDescription || ''
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Validation error'
    });
  }
};

/**
 * Validation middleware for shop operations
 */

// Validate shop data
const validateShop = (req, res, next) => {
  try {
    const { shopName, shopDescription } = req.body;

    if (!shopName || shopName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Shop name is required and must be at least 2 characters long'
      });
    }

    if (shopName.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Shop name cannot exceed 100 characters'
      });
    }

    if (shopDescription && shopDescription.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Shop description cannot exceed 500 characters'
      });
    }

    req.validatedData = {
      shopName: shopName.trim(),
      shopDescription: shopDescription || ''
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Validation error'
    });
  }
};

/**
 * Validation middleware for user operations
 */

// Validate user data
const validateUser = (req, res, next) => {
  try {
    const { firstName, lastName, email, role } = req.body;

    if (!firstName || firstName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'First name is required and must be at least 2 characters long'
      });
    }

    if (firstName.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: 'First name cannot exceed 50 characters'
      });
    }

    if (!lastName || lastName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Last name is required and must be at least 2 characters long'
      });
    }

    if (lastName.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Last name cannot exceed 50 characters'
      });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }

    if (email.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Email cannot exceed 100 characters'
      });
    }

    const validRoles = ['user', 'seller', 'admin'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    req.validatedData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      role: role || 'user'
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Validation error'
    });
  }
};

module.exports = {
  validateObjectId,
  validateCartItem,
  validateCheckout,
  validateOrderStatus,
  validateOrderNumber,
  validateProduct,
  validateShop,
  validateUser
};
const { body, param, query, validationResult } = require('express-validator');
const validator = require('validator');

/**
 * Input validation and sanitization middleware
 * Provides comprehensive security against injection attacks and data validation
 */

// Custom sanitization functions
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return validator.escape(value.trim());
};

const sanitizeEmail = (value) => {
  if (typeof value !== 'string') return value;
  return validator.normalizeEmail(value.trim(), {
    gmail_lowercase: true,
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_lowercase: true,
    outlookdotcom_remove_subaddress: true,
    yahoo_lowercase: true,
    yahoo_remove_subaddress: true,
    icloud_lowercase: true,
    icloud_remove_subaddress: true
  });
};

const sanitizePhoneNumber = (value) => {
  if (typeof value !== 'string') return value;
  // Remove all non-digit characters except leading +
  const cleaned = value.replace(/[^\d+]/g, '');
  
  // Ensure it's a valid Philippine number format
  if (cleaned.startsWith('+63')) {
    return cleaned;
  } else if (cleaned.startsWith('09') && cleaned.length === 11) {
    return cleaned;
  }
  return value; // Return original if format is unclear
};

// Validation rules for user registration
const validateUserRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes')
    .customSanitizer(sanitizeString),

  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes')
    .customSanitizer(sanitizeString),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .customSanitizer(sanitizeEmail),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),

  body('role')
    .optional()
    .isIn(['buyer', 'seller'])
    .withMessage('Role must be either buyer or seller'),

  body('studentIdPicture')
    .optional()
    .isBase64()
    .withMessage('Student ID picture must be a valid base64 encoded image')
];

// Validation rules for user login
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .customSanitizer(sanitizeEmail),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Validation rules for user profile updates
const validateUserProfile = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes')
    .customSanitizer(sanitizeString),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes')
    .customSanitizer(sanitizeString),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .customSanitizer(sanitizeEmail)
];

// Validation rules for password change
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one letter and one number')
];

// Validation rules for shop creation/update
const validateShop = [
  body('shopName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Shop name must be between 2 and 50 characters')
    .customSanitizer(sanitizeString),

  body('shopDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Shop description cannot exceed 500 characters')
    .customSanitizer(sanitizeString),

  body('shopContact')
    .trim()
    .matches(/^(?:\+63|0)\d{10}$/)
    .withMessage('Please provide a valid Philippine phone number (e.g., +639123456789 or 09123456789)')
    .customSanitizer(sanitizePhoneNumber),

  body('shopEmail')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .customSanitizer(sanitizeEmail),

  body('shopLocation')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Shop location must be between 2 and 200 characters')
    .customSanitizer(sanitizeString)
];

// Validation rules for product creation/update
const validateProduct = [
  body('productName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Product name must be between 2 and 50 characters')
    .customSanitizer(sanitizeString),

  body('productDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Product description cannot exceed 500 characters')
    .customSanitizer(sanitizeString),

  body('productPrice')
    .isFloat({ min: 0, max: 999999 })
    .withMessage('Product price must be a valid number between 0 and 999,999'),

  body('productStock')
    .isInt({ min: 0, max: 999999 })
    .withMessage('Product stock must be a valid number between 0 and 999,999'),

  body('productImages')
    .optional()
    .isArray({ max: 3 })
    .withMessage('Product can have at most 3 images'),

  body('productImages.*')
    .optional()
    .isBase64()
    .withMessage('Product images must be valid base64 encoded images')
];

// Validation rules for cart operations
const validateCartOperation = [
  body('productId')
    .isMongoId()
    .withMessage('Invalid product ID format'),

  body('quantity')
    .isInt({ min: 1, max: 999 })
    .withMessage('Quantity must be between 1 and 999')
];

// Validation rules for order creation
const validateOrder = [
  body('pickupLocation')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Pickup location must be between 2 and 200 characters')
    .customSanitizer(sanitizeString),

  body('contactNumber')
    .trim()
    .matches(/^09[0-9]{9}$/)
    .withMessage('Please provide a valid Philippine phone number (e.g., 09123456789)')
    .customSanitizer(sanitizePhoneNumber),

  body('note')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Note cannot exceed 500 characters')
    .customSanitizer(sanitizeString),

  body('selectedItems')
    .isArray({ min: 1 })
    .withMessage('At least one item must be selected'),

  body('selectedItems.*.productId')
    .isMongoId()
    .withMessage('Invalid product ID format'),

  body('selectedItems.*.quantity')
    .isInt({ min: 1, max: 999 })
    .withMessage('Quantity must be between 1 and 999')
];

// Validation rules for order status updates
const validateOrderStatus = [
  body('status')
    .isIn(['Pending', 'Confirmed', 'On-Delivery', 'Completed', 'Cancelled'])
    .withMessage('Invalid order status')
];

// Validation rules for admin operations
const validateAdminUserAction = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format')
];

const validateAdminSellerAction = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),

  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be either approved or rejected'),

  body('rejectionReason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Rejection reason cannot exceed 200 characters')
    .customSanitizer(sanitizeString),

  body('rejectionNote')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Rejection note cannot exceed 500 characters')
    .customSanitizer(sanitizeString)
];

// Validation rules for search
const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .customSanitizer(sanitizeString),

  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sort')
    .optional()
    .isIn(['relevance', 'price-asc', 'price-desc', 'date-asc', 'date-desc'])
    .withMessage('Invalid sort parameter')
];

// Validation rules for pagination
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Validation rules for MongoDB ObjectID parameters
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`)
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }

  next();
};

// Middleware to sanitize query parameters
const sanitizeQueryParams = (req, res, next) => {
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key]);
      }
    });
  }
  next();
};

// Middleware to sanitize request body
const sanitizeRequestBody = (req, res, next) => {
  if (req.body) {
    const sanitizeObject = (obj) => {
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      });
    };
    sanitizeObject(req.body);
  }
  next();
};

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateUserProfile,
  validatePasswordChange,
  validateShop,
  validateProduct,
  validateCartOperation,
  validateOrder,
  validateOrderStatus,
  validateAdminUserAction,
  validateAdminSellerAction,
  validateSearch,
  validatePagination,
  validateObjectId,
  handleValidationErrors,
  sanitizeQueryParams,
  sanitizeRequestBody
};
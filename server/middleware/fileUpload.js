const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

/**
 * Secure file upload middleware with comprehensive validation
 */

// Allowed MIME types for images
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  profilePicture: 2 * 1024 * 1024, // 2MB for profile pictures
  productImage: 5 * 1024 * 1024,    // 5MB for product images
  shopLogo: 1 * 1024 * 1024,        // 1MB for shop logos
  idPicture: 3 * 1024 * 1024        // 3MB for ID pictures
};

// File type validation function
const validateFileType = (file) => {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
    };
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      message: 'Invalid file extension. Only .jpg, .jpeg, .png, .gif, and .webp files are allowed.'
    };
  }

  return { valid: true };
};

// File size validation function
const validateFileSize = (file, type = 'general') => {
  const maxSize = FILE_SIZE_LIMITS[type] || FILE_SIZE_LIMITS.profilePicture;
  
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      message: `File size too large. Maximum allowed size is ${maxSizeMB}MB for ${type} files.`
    };
  }

  return { valid: true };
};

// Security validation function
const validateFileSecurity = (file) => {
  // Check for dangerous file names
  const dangerousPatterns = [
    /\.\./,           // Directory traversal
    /<.*>/,           // HTML tags
    /script/i,        // Script tags
    /\.exe$/i,        // Executable files
    /\.bat$/i,        // Batch files
    /\.sh$/i,         // Shell scripts
    /\.php$/i,        // PHP files
    /\.asp$/i,        // ASP files
    /\.jsp$/i         // JSP files
  ];

  const filename = file.originalname.toLowerCase();
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(filename)) {
      return {
        valid: false,
        message: 'File name contains potentially dangerous characters or patterns.'
      };
    }
  }

  // Check for null bytes (null byte injection)
  if (filename.includes('\0')) {
    return {
      valid: false,
      message: 'File name contains invalid characters.'
    };
  }

  return { valid: true };
};

// Generate secure filename
const generateSecureFilename = (originalname, userId) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(originalname).toLowerCase();
  const baseName = path.basename(originalname, ext);
  
  // Sanitize base name
  const sanitizedBase = baseName
    .replace(/[^a-zA-Z0-9]/g, '_')  // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_')            // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '');       // Remove leading/trailing underscores

  return `${userId}_${timestamp}_${randomString}_${sanitizedBase}${ext}`;
};

// Custom file filter for multer
const createFileFilter = (allowedTypes = ALLOWED_MIME_TYPES) => {
  return (req, file, cb) => {
    // Basic MIME type check
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only image files are allowed.'), false);
    }

    // Additional security check
    const securityCheck = validateFileSecurity(file);
    if (!securityCheck.valid) {
      return cb(new Error(securityCheck.message), false);
    }

    cb(null, true);
  };
};

// Create multer storage with GridFS
const createGridFSStorage = (bucket) => {
  return multer.memoryStorage({
    filename: (req, file, cb) => {
      const userId = req.user?.userId || 'anonymous';
      const secureFilename = generateSecureFilename(file.originalname, userId);
      cb(null, secureFilename);
    }
  });
};

// Enhanced file upload middleware factory
const createFileUploadMiddleware = (options = {}) => {
  const {
    fieldName = 'file',
    maxCount = 1,
    fileType = 'general',
    required = true,
    allowedTypes = ALLOWED_MIME_TYPES
  } = options;

  return (req, res, next) => {
    // Check if file is required but not provided
    if (required && (!req.files || !req.files[fieldName] || req.files[fieldName].length === 0)) {
      return res.status(400).json({
        success: false,
        message: `No ${fileType} file provided. Please upload a valid ${fileType} image.`
      });
    }

    // If no file provided and not required, continue
    if (!required && (!req.files || !req.files[fieldName])) {
      return next();
    }

    const files = req.files[fieldName];
    const validationErrors = [];

    // Validate each file
    for (const file of files) {
      // File type validation
      const typeValidation = validateFileType(file);
      if (!typeValidation.valid) {
        validationErrors.push(typeValidation.message);
        continue;
      }

      // File size validation
      const sizeValidation = validateFileSize(file, fileType);
      if (!sizeValidation.valid) {
        validationErrors.push(sizeValidation.message);
        continue;
      }

      // Security validation
      const securityValidation = validateFileSecurity(file);
      if (!securityValidation.valid) {
        validationErrors.push(securityValidation.message);
        continue;
      }
    }

    // If there are validation errors, return them
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'File validation failed',
        errors: validationErrors
      });
    }

    next();
  };
};

// Specific middleware for different file types
const uploadProfilePicture = createFileUploadMiddleware({
  fieldName: 'profilePicture',
  maxCount: 1,
  fileType: 'profilePicture',
  required: false,
  allowedTypes: ALLOWED_MIME_TYPES
});

const uploadProductImages = createFileUploadMiddleware({
  fieldName: 'productImages',
  maxCount: 3,
  fileType: 'productImage',
  required: true,
  allowedTypes: ALLOWED_MIME_TYPES
});

const uploadShopLogo = createFileUploadMiddleware({
  fieldName: 'shopLogo',
  maxCount: 1,
  fileType: 'shopLogo',
  required: false,
  allowedTypes: ALLOWED_MIME_TYPES
});

const uploadIdPicture = createFileUploadMiddleware({
  fieldName: 'idPicture',
  maxCount: 1,
  fileType: 'idPicture',
  required: true,
  allowedTypes: ALLOWED_MIME_TYPES
});

// Multer configuration for different scenarios
const createMulterUpload = (options = {}) => {
  const {
    fieldName = 'file',
    maxCount = 1,
    fileSize = FILE_SIZE_LIMITS.profilePicture,
    allowedTypes = ALLOWED_MIME_TYPES
  } = options;

  const storage = multer.memoryStorage({
    filename: (req, file, cb) => {
      const userId = req.user?.userId || 'anonymous';
      const secureFilename = generateSecureFilename(file.originalname, userId);
      cb(null, secureFilename);
    }
  });

  return multer({
    storage: storage,
    fileFilter: createFileFilter(allowedTypes),
    limits: {
      fileSize: fileSize,
      files: maxCount
    }
  });
};

// Error handling middleware for file uploads
const handleFileUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Please upload a smaller file.',
        maxSize: FILE_SIZE_LIMITS.general / (1024 * 1024) + 'MB'
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: `Too many files. Maximum ${FILE_SIZE_LIMITS.general} files allowed.`
      });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Please check the form fields.'
      });
    }
  }

  if (err && err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Only image files are allowed.',
      allowedTypes: ALLOWED_MIME_TYPES
    });
  }

  if (err && err.message && err.message.includes('File name contains')) {
    return res.status(400).json({
      success: false,
      message: 'File name contains invalid characters. Please use a different file name.'
    });
  }

  next(err);
};

// Cleanup function for failed uploads
const cleanupFailedUpload = async (fileIds) => {
  try {
    if (!fileIds || fileIds.length === 0) return;

    const bucket = require('../config/gridfsBucket').getGridFSBucket();
    for (const fileId of fileIds) {
      await bucket.delete(fileId);
    }
    console.log(`Cleaned up ${fileIds.length} failed upload(s)`);
  } catch (error) {
    console.error('Error cleaning up failed upload:', error);
  }
};

module.exports = {
  // Validation functions
  validateFileType,
  validateFileSize,
  validateFileSecurity,
  
  // File handling functions
  generateSecureFilename,
  createFileFilter,
  createGridFSStorage,
  
  // Middleware factories
  createFileUploadMiddleware,
  
  // Specific middleware
  uploadProfilePicture,
  uploadProductImages,
  uploadShopLogo,
  uploadIdPicture,
  
  // Multer configuration
  createMulterUpload,
  
  // Error handling
  handleFileUploadError,
  
  // Cleanup
  cleanupFailedUpload,
  
  // Constants
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  FILE_SIZE_LIMITS
};
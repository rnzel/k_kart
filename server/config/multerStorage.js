const multer = require('multer');
const { getGridFSBucket, getBucketName, isGridFSReady } = require('./gridfsBucket');
const path = require('path');

/**
 * Enhanced multer storage engine using the shared GridFSBucket
 * - Secure filename generation with user ID
 * - Image mimetypes only with enhanced validation
 * - 5MB file size limit
 * - Stores metadata (originalName, mimeType, userId)
 * - Better error handling and validation
 */
const createMulterStorage = () => {
  return multer({
    storage: {
      _handleFile: async (req, file, cb) => {
        try {
          // Check if GridFS is ready (cold start handling)
          if (!isGridFSReady()) {
            return cb(new Error('File storage service temporarily unavailable. Please try again.'), false);
          }

          const bucket = getGridFSBucket();
          const bucketName = getBucketName();
          const userId = req.user?.userId || 'anonymous';
          
          // Enhanced filename generation with security
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 8);
          const originalName = file.originalname;
          
          // Sanitize filename
          const sanitizedOriginalName = originalName
            .replace(/[^a-zA-Z0-9.-]/g, '_')  // Replace special characters
            .replace(/_+/g, '_')              // Replace multiple underscores
            .replace(/^_+|_+$/g, '');         // Remove leading/trailing underscores
          
          // Generate secure filename
          const filename = `${userId}_${timestamp}_${randomString}_${sanitizedOriginalName}`;
          
          // Validate filename length
          if (filename.length > 255) {
            return cb(new Error('Filename too long. Please use a shorter filename.'), false);
          }
          
          // Create upload stream with enhanced metadata
          const uploadStream = bucket.openUploadStream(filename, {
            metadata: {
              originalName: originalName,
              mimeType: file.mimetype,
              userId: userId,
              uploadDate: new Date(),
              fileSize: file.size
            }
          });

          // Pipe file to GridFS with error handling
          file.stream.pipe(uploadStream);

          uploadStream.on('finish', () => {
            cb(null, {
              filename: filename,
              originalName: originalName,
              mimetype: file.mimetype,
              size: uploadStream.length,
              gridFSFileId: uploadStream.id,
              bucketName: bucketName,
              userId: userId
            });
          });

          uploadStream.on('error', (err) => {
            console.error('GridFS upload error:', err);
            cb(err);
          });

        } catch (err) {
          console.error('Multer storage error:', err);
          cb(err);
        }
      },
      
      _removeFile: async (req, file, cb) => {
        try {
          if (!isGridFSReady()) {
            console.warn('GridFS not ready during file removal, skipping cleanup');
            return cb(null);
          }

          const bucket = getGridFSBucket();
          
          if (file.gridFSFileId) {
            await bucket.delete(file.gridFSFileId);
            cb(null);
          } else {
            cb(null);
          }
        } catch (err) {
          console.error('Error removing file from GridFS:', err);
          // Don't fail the request if cleanup fails, just log it
          cb(null);
        }
      }
    },
    
    // Enhanced file filter with better validation
    fileFilter: (req, file, cb) => {
      // Check if file is an image
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed!'), false);
      }
      
      // Additional security checks
      const originalName = file.originalname.toLowerCase();
      
      // Check for dangerous file extensions
      const dangerousExtensions = ['.exe', '.bat', '.sh', '.php', '.asp', '.jsp', '.js', '.html'];
      const ext = path.extname(originalName);
      if (dangerousExtensions.includes(ext)) {
        return cb(new Error('File type not allowed for security reasons.'), false);
      }
      
      // Check for suspicious patterns in filename
      if (originalName.includes('..') || originalName.includes('/') || originalName.includes('\\')) {
        return cb(new Error('Invalid filename. Please use a different filename.'), false);
      }
      
      // Check filename length
      if (originalName.length > 100) {
        return cb(new Error('Filename too long. Maximum 100 characters allowed.'), false);
      }
      
      cb(null, true);
    },
    
    // Limit file size to 5MB with better error message
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 3, // Maximum 3 files per request
      fields: 10, // Maximum 10 form fields
      parts: 15 // Maximum 15 parts (files + fields)
    }
  });
};

// Enhanced upload instance with better error handling
const upload = createMulterStorage();

// Enhanced error handler for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum file size is 5MB.',
          errors: [{ field: 'productImages', message: 'File size exceeds 5MB limit' }]
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum 3 images allowed per product.',
          errors: [{ field: 'productImages', message: 'Maximum 3 files allowed' }]
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field. Please check the form fields.',
          errors: [{ field: 'productImages', message: 'Unexpected file field' }]
        });
      case 'LIMIT_FIELD_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many form fields. Please reduce the number of fields.',
          errors: [{ field: 'form', message: 'Too many form fields' }]
        });
      default:
        return res.status(500).json({
          success: false,
          message: 'File upload error. Please try again.',
          errors: [{ field: 'productImages', message: 'Upload failed' }]
        });
    }
  }
  
  // Handle custom errors from file filter
  if (err && err.message) {
    if (err.message.includes('Only image files are allowed')) {
      return res.status(400).json({
        success: false,
        message: err.message,
        errors: [{ field: 'productImages', message: 'Only image files are allowed' }]
      });
    }
    if (err.message.includes('File type not allowed')) {
      return res.status(400).json({
        success: false,
        message: err.message,
        errors: [{ field: 'productImages', message: 'File type not allowed for security reasons' }]
      });
    }
    if (err.message.includes('Invalid filename')) {
      return res.status(400).json({
        success: false,
        message: err.message,
        errors: [{ field: 'productImages', message: 'Invalid filename' }]
      });
    }
    if (err.message.includes('File storage service temporarily unavailable')) {
      return res.status(503).json({
        success: false,
        message: err.message,
        errors: [{ field: 'productImages', message: 'Service temporarily unavailable' }]
      });
    }
  }
  
  next(err);
};

module.exports = {
  upload,
  createMulterStorage,
  handleMulterError
};

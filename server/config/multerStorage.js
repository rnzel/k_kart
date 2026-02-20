const multer = require('multer');
const { getGridFSBucket, getBucketName } = require('./gridfsBucket');

/**
 * Create multer storage engine using the shared GridFSBucket
 * - Unique filenames: Date.now() + originalname
 * - Image mimetypes only
 * - 5MB file size limit
 * - Stores metadata (originalName, mimeType)
 */
const createMulterStorage = () => {
  return multer({
    storage: {
      _handleFile: async (req, file, cb) => {
        try {
          const bucket = getGridFSBucket();
          const bucketName = getBucketName();
          
          // Generate unique filename: timestamp + original name
          const filename = `${Date.now()}-${file.originalname}`;
          
          // Create upload stream with metadata
          const uploadStream = bucket.openUploadStream(filename, {
            metadata: {
              originalName: file.originalname,
              mimeType: file.mimetype
            }
          });

          // Pipe file to GridFS
          file.stream.pipe(uploadStream);

          uploadStream.on('finish', () => {
            cb(null, {
              filename: filename,
              originalName: file.originalname,
              mimetype: file.mimetype,
              size: uploadStream.length,
              gridFSFileId: uploadStream.id,
              bucketName: bucketName
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
          const bucket = getGridFSBucket();
          
          if (file.gridFSFileId) {
            await bucket.delete(file.gridFSFileId);
            cb(null);
          } else {
            cb(null);
          }
        } catch (err) {
          console.error('Error removing file:', err);
          cb(err);
        }
      }
    },
    
    // File filter: only allow images
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'), false);
      }
    },
    
    // Limit file size to 5MB
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB
    }
  });
};

// Export single upload instance
const upload = createMulterStorage();

module.exports = {
  upload,
  createMulterStorage
};

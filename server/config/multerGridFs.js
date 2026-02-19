const multer = require('multer');
const multerGridFsStorage = require('multer-gridfs-storage');
const mongoose = require('mongoose');

// Create storage engine for GridFS
const createGridFSStorage = (connection) => {
    const storage = new multerGridFsStorage({
        db: connection,  // Use the mongoose connection
        file: (req, file) => {
            return {
                // Bucket name
                bucketName: 'uploads',
                // Generate unique filename: timestamp + original name
                filename: `${Date.now()}-${file.originalname}`,
                // Optional: add metadata
                metadata: {
                    originalName: file.originalname,
                    mimeType: file.mimetype
                }
            };
        },
        // File filter - only allow images
        fileFilter: (req, file, cb) => {
            // Accept only image files
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

    return storage;
};

// Middleware to handle multer errors
const handleMulterError = (err, req, res, next) => {
    if (err) {
        // Handle file size error
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size exceeds 5MB limit' });
        }
        // Handle file type error
        if (err.message === 'Only image files are allowed!') {
            return res.status(400).json({ message: err.message });
        }
        // Handle other errors
        return res.status(400).json({ message: err.message });
    }
    next();
};


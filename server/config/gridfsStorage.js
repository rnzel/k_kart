const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

/**
 * Custom multer GridFS storage engine using native MongoDB driver
 */
class GridFSStorage {
    constructor(options) {
        this.options = options || {};
        this.bucketName = options.bucketName || 'uploads';
    }

    _getBucket() {
        if (!mongoose.connection.db) {
            throw new Error('Database not connected');
        }
        
        // Check if bucket already exists
        if (!mongoose.connection.db.buckets) {
            mongoose.connection.db.buckets = {};
        }
        
        if (!mongoose.connection.db.buckets[this.bucketName]) {
            mongoose.connection.db.buckets[this.bucketName] = new GridFSBucket(
                mongoose.connection.db,
                { bucketName: this.bucketName }
            );
        }
        
        return mongoose.connection.db.buckets[this.bucketName];
    }

    _handleFile(req, file, cb) {
        try {
            const bucket = this._getBucket();
            const filename = `${Date.now()}-${file.originalname}`;
            
            // Store file info for use in the callback
            let fileInfo = {
                filename: filename,
                originalName: file.originalname,
                mimetype: file.mimetype,
                size: 0,
                gridFSFileId: null
            };
            
            const uploadStream = bucket.openUploadStream(filename, {
                metadata: {
                    originalName: file.originalname,
                    mimeType: file.mimetype
                }
            });

            // Track file size as data comes in
            uploadStream.on('drain', () => {
                // Stream is draining
            });

            // Pipe the file stream to GridFS
            file.stream.pipe(uploadStream);

            uploadStream.on('error', (err) => {
                console.error('GridFS upload error:', err);
                cb(err);
            });

            uploadStream.on('finish', () => {
                // File uploaded successfully
                fileInfo.size = uploadStream.length;
                fileInfo.gridFSFileId = uploadStream.id;
                cb(null, fileInfo);
            });

        } catch (err) {
            console.error('GridFS storage error:', err);
            cb(err);
        }
    }

    _removeFile(req, file, cb) {
        try {
            const bucket = this._getBucket();
            
            if (file.gridFSFileId) {
                bucket.delete(file.gridFSFileId, (err) => {
                    if (err) {
                        cb(err);
                    } else {
                        cb(null);
                    }
                });
            } else {
                cb(null);
            }
        } catch (err) {
            cb(err);
        }
    }
}

/**
 * Factory function to create multer storage
 */
const createGridFSStorage = (options) => {
    return new GridFSStorage(options);
};

module.exports = { createGridFSStorage };

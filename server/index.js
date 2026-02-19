require('dotenv').config()

// server/index.js
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const multer = require('multer')

const authRoutes = require('./routes/authRoutes')
const shopRoutes = require('./routes/shopRoutes')
const productRoutes = require('./routes/productRoutes')
const { initGridFS, getGridFS, getGridFSBucket } = require('./config/gridfs')
const { createGridFSStorage } = require('./config/gridfsStorage')
const { GridFSBucket } = require('mongodb')

// Placeholder for upload middleware - will be initialized after DB connection
let shopUpload, productUpload

// Create upload middleware function using custom GridFS storage
const createUpload = () => {
    const storage = createGridFSStorage({ bucketName: 'uploads' })
    return multer({ storage })
}

// Export function to get upload middleware (to be used by routes)
global.getShopUpload = () => {
    if (!shopUpload) {
        throw new Error('Upload middleware not initialized yet. Wait for MongoDB connection.')
    }
    return shopUpload
}

global.getProductUpload = () => {
    if (!productUpload) {
        throw new Error('Upload middleware not initialized yet. Wait for MongoDB connection.')
    }
    return productUpload
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB')
        
        // Get the native MongoDB driver db instance
        const nativeDb = mongoose.connection.db
        
        // Initialize GridFS
        initGridFS(nativeDb)
        
        // Create upload middleware after DB connection
        shopUpload = createUpload()
        productUpload = createUpload()
        
        console.log('GridFS storage initialized')
    })
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err)
    })

// MongoDB connection error handler
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err)
})

// Define Express app
const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/shops', shopRoutes)
app.use('/api/products', productRoutes)

// Image streaming endpoint - serves images from GridFS using native GridFSBucket
app.get('/api/images/:filename', async (req, res) => {
    try {
        const db = mongoose.connection.db
        const bucket = new GridFSBucket(db, { bucketName: 'uploads' })
        
        const filename = req.params.filename
        
        // Find the file in GridFS
        const files = await db.collection('uploads.files').find({ filename }).toArray()
        
        if (!files || files.length === 0) {
            return res.status(404).json({ message: 'Image not found' })
        }
        
        const file = files[0]
        
        // Check if it's an image
        const contentType = file.contentType || file.metadata?.mimeType || ''
        if (!contentType.startsWith('image/')) {
            return res.status(400).json({ message: 'Not an image file' })
        }
        
        // Set content type
        res.set('Content-Type', contentType)
        res.set('Content-Disposition', `inline; filename="${file.filename}"`)
        
        // Create read stream using native GridFSBucket and pipe to response
        const downloadStream = bucket.openDownloadStreamByName(filename)
        
        downloadStream.on('error', (err) => {
            console.error('Error streaming file:', err)
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error streaming file' })
            }
        })
        
        downloadStream.pipe(res)
        
    } catch (err) {
        console.error('Error serving image:', err)
        res.status(500).json({ message: 'Error serving image' })
    }
})

// Start the server
app.listen(process.env.PORT, () => {
    console.log('Server is running on port', process.env.PORT)
})

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err)
    res.status(500).json({ message: 'Internal server error' })
})

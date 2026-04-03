require('dotenv').config()

const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const helmet = require('helmet')
const { createServer } = require('http')
const { Server } = require('socket.io')
// Note: express-rate-limit is used in authRoutes.js for login rate limiting only

// ============================================
// Environment Variable Validation
// ============================================
if (!process.env.MONGO_URI) {
  console.error('❌ ERROR: MONGO_URI environment variable is required')
  process.exit(1)
}
if (!process.env.JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET environment variable is required')
  process.exit(1)
}

// Import routes
const authRoutes = require('./routes/authRoutes')
const shopRoutes = require('./routes/shopRoutes')
const productRoutes = require('./routes/productRoutes')
const cartRoutes = require('./routes/cartRoutes')
const adminRoutes = require('./routes/adminRoutes')
const orderRoutes = require('./routes/orderRoutes')
const searchRoutes = require('./routes/searchRoutes')

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorHandler')

// Import GridFS utilities
const { initGridFSBucket, getGridFSBucket, isGridFSReady } = require('./config/gridfsBucket')

const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000

// ============================================
// Production CORS Configuration
// ============================================
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',              // Local dev
      'http://localhost:3000',              // Local test
      'https://k-kart-mauve.vercel.app',    // Your actual frontend
      'https://k-kart-c3ip.onrender.com'    // Your backend
    ]

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.warn(`CORS blocked unauthorized origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

// ============================================
// Security Headers with Helmet
// ============================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  crossOriginEmbedderPolicy: false,        // Allow cross-origin image streaming
  crossOriginResourcePolicy: false          // Allow cross-origin resource loading for images
}))

app.use(cors(corsOptions))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ============================================
// Image Streaming Route
// GET /api/images/:filename
// ============================================

// Allowed origins for CORS on image endpoints
const allowedImageOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://k-kart-mauve.vercel.app',
  'https://k-kart-c3ip.onrender.com'
]

// Helper function to set CORS headers for image responses
const setImageCorsHeaders = (req, res) => {
  const origin = req.headers.origin
  if (!origin || allowedImageOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length')
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
}

// Handle OPTIONS preflight requests for images
app.options('/api/images/:filename', (req, res) => {
  setImageCorsHeaders(req, res)
  res.sendStatus(204)
})

app.get('/api/images/:filename', async (req, res) => {
  try {
    // Set CORS headers for cross-origin image loading
    setImageCorsHeaders(req, res)

    // Wait for GridFS to be ready with retry logic
    const maxRetries = 3
    let retryCount = 0
    let bucket = null

    while (retryCount < maxRetries) {
      if (isGridFSReady()) {
        bucket = getGridFSBucket()
        break
      }
      await new Promise(resolve => setTimeout(resolve, 500))
      retryCount++
    }

    if (!bucket) {
      return res.status(503).json({
        message: 'Service temporarily unavailable. Please retry.',
        retryAfter: 1
      })
    }

    const filename = req.params.filename

    // Use mongoose.connection.db to access collections
    const db = mongoose.connection.db
    const filesCollection = db.collection('uploads.files')
    const file = await filesCollection.findOne({ filename })

    if (!file) {
      return res.status(404).json({ message: 'Image not found' })
    }

    const contentType = file.metadata?.mimeType || file.contentType || 'application/octet-stream'
    res.set('Content-Type', contentType)
    res.set('Content-Disposition', `inline; filename="${file.filename}"`)

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
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error serving image' })
    }
  }
})

// ============================================
// Routes
// ============================================
app.use('/api/auth', authRoutes)
app.use('/api/shops', shopRoutes)
app.use('/api/products', productRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/search', searchRoutes)

// ============================================
// Health Check Route
// ============================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    gridfs: isGridFSReady() ? 'ready' : 'not ready'
  })
})

// ============================================
// Root Route - API Status Message
// ============================================
app.get('/', (req, res) => {
  res.json({ message: 'KampusKart API is running!' })
})

// ============================================
// Static File Serving (Optional - for frontend in public folder)
// ============================================
const publicPath = path.join(__dirname, '..', 'public')
app.use(express.static(publicPath, { 
  fallthrough: true, // Continue to next middleware if file not found
  etag: true,
  lastModified: true,
  maxAge: '1d'
}))

// ============================================
// 404 Not Found Handler
// ============================================
app.use(notFound)

// ============================================
// Error Handling Middleware
// ============================================
app.use(errorHandler)

// ============================================
// Server Initialization
// ============================================
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')

    // Initialize GridFSBucket before starting the server
    console.log('Initializing GridFSBucket...')
    await initGridFSBucket()
    console.log('GridFSBucket initialized successfully')

    // Create HTTP server and Socket.IO server
    const httpServer = createServer(app)
    const io = new Server(httpServer, {
      cors: {
        origin: function (origin, callback) {
          const allowedOrigins = [
            'http://localhost:5173',              // Local dev
            'http://localhost:3000',              // Local test
            'https://k-kart-mauve.vercel.app',    // Your actual frontend
            'https://k-kart-c3ip.onrender.com'    // Your backend
          ]

          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
          } else {
            console.warn(`Socket.IO CORS blocked unauthorized origin: ${origin}`)
            callback(new Error('Not allowed by CORS'))
          }
        },
        credentials: true
      }
    })

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      console.log('User connected:', socket.id)

      // Join user room when authenticated
      socket.on('join-user-room', (userId) => {
        socket.join(`user:${userId}`)
        console.log(`User ${userId} joined room user:${userId}`)
      })

      // Join shop room for sellers
      socket.on('join-shop-room', (shopId) => {
        socket.join(`shop:${shopId}`)
        console.log(`Shop ${shopId} joined room shop:${shopId}`)
      })

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id)
      })
    })

    // Make io available to routes
    app.set('io', io)

    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`)
      console.log(`Socket.IO server is running on port ${PORT}`)
    })

  } catch (err) {
    console.error('Error connecting to MongoDB or initializing GridFS:', err)
    process.exit(1)
  }
}

startServer()
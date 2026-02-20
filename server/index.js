require('dotenv').config()

const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')

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

// Import GridFS utilities
const { initGridFSBucket, getGridFSBucket, isGridFSReady } = require('./config/gridfsBucket')

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
      'https://k-kart-7wpp.onrender.com'    // Your backend
    ]
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.warn(`CORS blocked unauthorized origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

app.use(cors(corsOptions))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ============================================
// Image Streaming Route
// GET /api/images/:filename
// ============================================
app.get('/api/images/:filename', async (req, res) => {
  try {
    if (!isGridFSReady()) {
      return res.status(503).json({ 
        message: 'Service temporarily unavailable. Please retry.' 
      })
    }

    const bucket = getGridFSBucket()
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
    res.status(500).json({ message: 'Error serving image' })
  }
})

// ============================================
// Routes
// ============================================
app.use('/api/auth', authRoutes)
app.use('/api/shops', shopRoutes)
app.use('/api/products', productRoutes)

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
// 404 Not Found Handler
// ============================================
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

// ============================================
// Error Handling Middleware
// ============================================
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({ message: 'Internal server error' })
})

// ============================================
// Server Initialization
// ============================================
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')

    const initializeAndStart = () => {
      console.log('Initializing GridFSBucket...')
      try {
        initGridFSBucket()
        app.listen(PORT, () => {
          console.log(`Server is running on port ${PORT}`)
        })
      } catch (err) {
        console.error('Failed to initialize GridFSBucket:', err)
        process.exit(1)
      }
    }

    if (mongoose.connection.readyState === 1) {
      console.log('Connection already open, initializing...')
      initializeAndStart()
    } else {
      mongoose.connection.once('open', () => {
        console.log('MongoDB connection open, initializing GridFSBucket...')
        initializeAndStart()
      })
    }

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err)
    })

  } catch (err) {
    console.error('Error connecting to MongoDB:', err)
    process.exit(1)
  }
}

startServer()

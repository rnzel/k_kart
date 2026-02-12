require('dotenv').config()

// server/index.js
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const authRoutes = require('./routes/authRoutes')

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB')
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

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Routes
app.use('/api/auth', authRoutes)

// Start the server
app.listen(process.env.PORT, () => {
  console.log('Server is running on port', process.env.PORT)
})

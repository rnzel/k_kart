const express = require('express')
const router = express.Router()
const rateLimit = require('express-rate-limit')
const User = require('../models/User')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

// ============================================
// Rate Limiter for Login Route
// ============================================
// 5 requests per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Register
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, studentIdNumber, studentIdPicture } = req.body
    
    const userData = {
      firstName,
      lastName,
      email,
      password,
      role: role || 'buyer'
    }
    
    if (role === 'seller') {
      userData.studentIdNumber = studentIdNumber
      userData.studentIdPicture = studentIdPicture
    }
    
    const user = await User.create(userData)

    const userResponse = user.toObject()
    delete userResponse.password
    res.status(201).json({ 
      message: 'User registered successfully',
      user: userResponse
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Check if email exists
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body
    const user = await User.findOne({ email })
    res.json({ exists: !!user })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Login - with rate limiting (5 requests per 15 minutes)
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body
    
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    
    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    
    res.json({ 
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select('-password')
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json(user)
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' })
  }
})

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const { firstName, lastName, email } = req.body

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ email, _id: { $ne: decoded.userId } })
    if (existingUser) {
      return res.status(400).json({ error: { message: 'Email already in use' } })
    }

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { firstName, lastName, email },
      { new: true }
    ).select('-password')

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ message: 'Profile updated successfully', user })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Change password
router.put('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const { currentPassword, newPassword } = req.body

    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      return res.status(401).json({ error: { message: 'Current password is incorrect' } })
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    await User.findByIdAndUpdate(decoded.userId, { password: hashedPassword })

    res.json({ message: 'Password changed successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

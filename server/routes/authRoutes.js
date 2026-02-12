const express = require('express')
const router = express.Router()
const User = require('../models/User')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

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

// Login
router.post('/login', async (req, res) => {
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
      { userId: user._id, role: user.role },
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

module.exports = router

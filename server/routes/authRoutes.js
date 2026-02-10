const express = require('express')
const router = express.Router()
const User = require('../models/User')

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
    res.status(201).json({ message: 'User created successfully', user })
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
    
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    
    res.json({ 
      message: 'Login successful',
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

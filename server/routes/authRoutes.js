const express = require('express')
const router = express.Router()
const rateLimit = require('express-rate-limit')
const User = require('../models/User')
const RefreshToken = require('../models/RefreshToken')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const RoleManagementService = require('../services/roleManagement')

// Import new security middleware
const { 
  validateUserRegistration, 
  validateUserLogin, 
  validateUserProfile, 
  validatePasswordChange,
  handleValidationErrors 
} = require('../middleware/inputValidation')
const { authenticateToken, requireAuth } = require('../middleware/auth')

// ============================================
// Token Helpers
// ============================================
const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id || user._id, 
      role: user.role, 
      isVerified: user.isVerified,
      sellerStatus: user.sellerStatus,
      email: user.email
    },
    process.env.JWT_SECRET,
     { expiresIn: '30m' } // Access token valid for 30 minutes
  )
}

const generateRefreshToken = async (user) => {
  const token = jwt.sign(
    { userId: user.id || user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  )
  
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  
  await RefreshToken.create({
    token,
    user: user.id || user._id,
    expiresAt
  })
  
  return token
}

// ============================================
// Rate Limiter for Login Route
// ============================================
// 5 requests per minute
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { 
    success: false,
    message: 'Too many login attempts. Please try again after a minute.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate Limiter for Registration Route
const registerLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { 
    success: false,
    message: 'Too many registration attempts. Please try again after a minute.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Register with enhanced security
router.post('/register', 
  registerLimiter,
  validateUserRegistration, 
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await RoleManagementService.registerUser(req.body);
      res.status(201).json(result);
    } catch (err) {
      console.error('Registration error:', err);
      res.status(err.statusCode || 500).json({ 
        success: false,
        message: err.message || 'Registration failed',
        ...(process.env.NODE_ENV === 'development' && { error: err })
      });
    }
  }
)

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
router.post('/login', 
  loginLimiter,
  validateUserLogin,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body
      
      const user = await User.findOne({ email })
      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        })
      }
      
      // Check if user account is deleted
      if (user.isDeleted) {
        return res.status(403).json({
          success: false,
          message: 'Account has been deactivated',
          code: 'ACCOUNT_DEACTIVATED'
        })
      }
      
      // Compare hashed password
      const isMatch = await bcrypt.compare(password, user.password)
      if (!isMatch) {
        return res.status(401).json({ 
          success: false,
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        })
      }
      
      // Generate tokens
      const accessToken = generateAccessToken(user)
      const refreshToken = await generateRefreshToken(user)
      
      res.json({ 
        success: true,
        message: 'Login successful',
        token: accessToken,
        refreshToken,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          sellerStatus: user.sellerStatus
        }
      })
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ 
        success: false,
        message: 'Login failed',
        ...(process.env.NODE_ENV === 'development' && { error: err })
      })
    }
  }
)

// Get current user profile with authentication
router.get('/me', 
  authenticateToken,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.userId).select('-password')
      
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        })
      }

      res.json({
        success: true,
        data: user
      })
    } catch (err) {
      console.error('Profile fetch error:', err);
      res.status(500).json({ 
        success: false,
        message: 'Failed to fetch profile',
        ...(process.env.NODE_ENV === 'development' && { error: err })
      })
    }
  }
)

// Update user profile with validation
router.put('/profile', 
  authenticateToken,
  validateUserProfile,
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await RoleManagementService.updateUserProfile(req.user.userId, req.body);
      res.json(result);
    } catch (err) {
      console.error('Profile update error:', err);
      res.status(err.statusCode || 500).json({ 
        success: false,
        message: err.message || 'Profile update failed',
        ...(process.env.NODE_ENV === 'development' && { error: err })
      })
    }
  }
)

// Change password with validation
router.put('/change-password', 
  authenticateToken,
  validatePasswordChange,
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await RoleManagementService.changePassword(req.user.userId, req.body.currentPassword, req.body.newPassword);
      res.json(result);
    } catch (err) {
      console.error('Password change error:', err);
      res.status(err.statusCode || 500).json({ 
        success: false,
        message: err.message || 'Password change failed',
        ...(process.env.NODE_ENV === 'development' && { error: err })
      })
    }
  }
)

// Refresh Token Endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body
    
    if (!refreshToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Refresh token is required' 
      })
    }
    
    // Check if token exists in DB
    const savedToken = await RefreshToken.findOne({ token: refreshToken })
    if (!savedToken) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid refresh token' 
      })
    }
    
    // Verify token
    let decoded
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
    } catch (err) {
      await RefreshToken.deleteOne({ token: refreshToken })
      return res.status(403).json({ 
        success: false, 
        message: 'Expired or invalid refresh token' 
      })
    }
    
    // Get user
    const user = await User.findById(decoded.userId)
    if (!user || user.isDeleted) {
      await RefreshToken.deleteOne({ token: refreshToken })
      return res.status(403).json({ 
        success: false, 
        message: 'User not found or deactivated' 
      })
    }
    
    // Implement Refresh Token Rotation
    // Delete old token
    await RefreshToken.deleteOne({ token: refreshToken })
    
    // Generate new tokens
    const newAccessToken = generateAccessToken(user)
    const newRefreshToken = await generateRefreshToken(user)
    
    res.json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken
    })
  } catch (err) {
    console.error('Refresh token error:', err)
    res.status(500).json({ 
      success: false, 
      message: 'Token refresh failed' 
    })
  }
})

// Logout Endpoint
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body
    
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken })
    }
    
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    })
  } catch (err) {
    console.error('Logout error:', err)
    res.status(500).json({ 
      success: false, 
      message: 'Logout failed' 
    })
  }
})

// Validate current password for real-time validation
router.post('/validate-password', 
  authenticateToken,
  async (req, res) => {
    try {
      const { currentPassword } = req.body;
      
      if (!currentPassword) {
        return res.status(400).json({ 
          success: false,
          message: 'Current password is required',
          code: 'MISSING_PASSWORD'
        });
      }
      
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // Check if user account is deleted
      if (user.isDeleted) {
        return res.status(403).json({
          success: false,
          message: 'Account has been deactivated',
          code: 'ACCOUNT_DEACTIVATED'
        });
      }
      
      // Compare hashed password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ 
          success: false,
          message: 'Current password is incorrect',
          code: 'INVALID_PASSWORD'
        });
      }
      
      res.json({
        success: true,
        message: 'Current password is valid'
      });
    } catch (err) {
      console.error('Password validation error:', err);
      res.status(500).json({ 
        success: false,
        message: 'Password validation failed',
        ...(process.env.NODE_ENV === 'development' && { error: err })
      });
    }
  }
)

module.exports = router

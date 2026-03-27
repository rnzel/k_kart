const jwt = require('jsonwebtoken')
const User = require('../models/User')

/**
 * Enhanced authentication middleware with improved security and role management
 */

// Enhanced middleware to verify JWT token with comprehensive security checks
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN
  
  // Check for token presence
  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Access token missing. Please log in to continue.' 
    })
  }

  try {
    // Verify token with strict validation
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'], // Specify allowed algorithms
      maxAge: '7d' // Token expiration check
    })
    
    // Fetch fresh user data to get current status
    const user = await User.findById(decoded.userId).select('-password -__v')
    
    if (!user) {
      return res.status(403).json({ 
        success: false,
        message: 'User account not found or has been deactivated.' 
      })
    }
    
    // Enhanced role and status validation
    const userAuthInfo = {
      userId: decoded.userId,
      role: user.role,
      isVerified: user.isVerified,
      sellerStatus: user.sellerStatus,
      email: user.email,
      fullName: `${user.firstName} ${user.lastName}`,
      isActive: !user.isDeleted,
      lastLogin: new Date()
    }
    
    // Additional security checks
    if (user.isDeleted) {
      return res.status(403).json({ 
        success: false,
        message: 'Your account has been deactivated. Please contact support.' 
      })
    }
    
    // Attach enhanced user info to request
    req.user = userAuthInfo
    
    // Log successful authentication (for monitoring)
    console.log(`Authenticated user: ${userAuthInfo.fullName} (${userAuthInfo.userId}) - Role: ${userAuthInfo.role}`)
    
    next()
  } catch (err) {
    console.error('Authentication error:', err.message)
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Your session has expired. Please log in again.' 
      })
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid authentication token. Please log in again.' 
      })
    }
    
    return res.status(403).json({ 
      success: false,
      message: 'Authentication failed. Please log in again.' 
    })
  }
}

// Middleware to verify user is authenticated (basic)
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required. Please log in to continue.' 
    })
  }
  next()
}

// Enhanced middleware to verify user is an approved seller
function requireSellerVerified(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required. Please log in to continue.' 
    })
  }
  
  // Check if user is seller
  if (req.user.role !== 'seller') {
    return res.status(403).json({ 
      success: false,
      message: 'Seller access required. Only verified sellers can access this resource.' 
    })
  }
  
  // Check seller status
  if (req.user.sellerStatus !== 'approved') {
    const statusMessages = {
      'pending': 'Your seller application is still under review. Please wait for admin approval.',
      'rejected': 'Your seller application was rejected. Please contact support for more information.',
      null: 'Your seller application is pending. Please complete the verification process.',
      undefined: 'Your seller application is pending. Please complete the verification process.'
    }
    
    return res.status(403).json({ 
      success: false,
      message: statusMessages[req.user.sellerStatus] || 'Your seller application is pending approval.',
      sellerStatus: req.user.sellerStatus
    })
  }
  
  next()
}

// Enhanced middleware to verify user is admin
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required. Please log in to continue.' 
    })
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false,
      message: 'Administrator access required. You do not have permission to access this resource.' 
    })
  }
  
  next()
}

// Enhanced middleware to allow buyers, pending sellers, and verified sellers
function requireBuyerOrVerifiedSeller(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required. Please log in to continue.' 
    })
  }
  
  // Block admin access to buyer/seller resources
  if (req.user.role === 'admin') {
    return res.status(403).json({ 
      success: false,
      message: 'Administrators cannot access buyer/seller resources. Please use the admin dashboard.' 
    })
  }
  
  // Allow all non-admin users (buyers and all types of sellers)
  // This includes:
  // - Buyers (role: 'buyer', sellerStatus: null/undefined)
  // - Pending sellers (role: 'buyer', sellerStatus: 'pending')
  // - Rejected sellers (role: 'buyer', sellerStatus: 'rejected')
  // - Approved sellers (role: 'seller', sellerStatus: 'approved')
  
  // Additional check for deleted accounts
  if (!req.user.isActive) {
    return res.status(403).json({ 
      success: false,
      message: 'Your account has been deactivated. Please contact support.' 
    })
  }
  
  next()
}

// New: Middleware for seller application management
function requireSellerApplicationAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required. Please log in to continue.' 
    })
  }
  
  // Only allow buyers to apply for seller status
  if (req.user.role !== 'buyer') {
    return res.status(403).json({ 
      success: false,
      message: 'You already have seller privileges or are an administrator.' 
    })
  }
  
  // Check if user already has a pending application
  if (req.user.sellerStatus === 'pending') {
    return res.status(403).json({ 
      success: false,
      message: 'You already have a pending seller application. Please wait for approval.' 
    })
  }
  
  // Check if user was previously rejected (allow re-application)
  // Note: You might want to add additional logic here based on business rules
  
  next()
}

// New: Middleware for shop management (owners only)
function requireShopOwner(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required. Please log in to continue.' 
    })
  }
  
  // Must be a verified seller
  if (req.user.role !== 'seller' || req.user.sellerStatus !== 'approved') {
    return res.status(403).json({ 
      success: false,
      message: 'Only verified sellers can manage shops.' 
    })
  }
  
  next()
}

// New: Middleware for order management based on user type
function requireOrderAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required. Please log in to continue.' 
    })
  }
  
  // Admins can access all orders
  if (req.user.role === 'admin') {
    return next()
  }
  
  // Sellers can only access their own orders
  if (req.user.role === 'seller') {
    if (req.user.sellerStatus !== 'approved') {
      return res.status(403).json({ 
        success: false,
        message: 'Only verified sellers can access orders.' 
      })
    }
    return next()
  }
  
  // Buyers can access their own orders
  if (req.user.role === 'buyer') {
    return next()
  }
  
  return res.status(403).json({ 
    success: false,
    message: 'You do not have permission to access orders.' 
  })
}

// New: Middleware for cart access
function requireCartAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required. Please log in to continue.' 
    })
  }
  
  // Admins cannot access carts
  if (req.user.role === 'admin') {
    return res.status(403).json({ 
      success: false,
      message: 'Administrators cannot access shopping carts.' 
    })
  }
  
  // All other users (buyers and sellers) can access carts
  next()
}

module.exports = { 
  authenticateToken, 
  auth: authenticateToken, 
  adminAuth: requireAdmin,
  requireAuth,
  requireSellerVerified,
  requireAdmin,
  requireBuyerOrVerifiedSeller,
  requireSellerApplicationAccess,
  requireShopOwner,
  requireOrderAccess,
  requireCartAccess
}

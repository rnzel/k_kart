const jwt = require('jsonwebtoken')
const User = require('../models/User')

// Middleware to verify JWT token
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access token missing' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Fetch fresh user data to get current sellerStatus
    const user = await User.findById(decoded.userId).select('-password')
    
    if (!user) {
      return res.status(403).json({ error: 'User not found' })
    }
    
    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      role: user.role,
      isVerified: user.isVerified,
      sellerStatus: user.sellerStatus
    }
    
    next()
  } catch (err) {
    return res.status(403).json({ error: 'Invalid access token' })
  }
}

// Middleware to verify user is authenticated (basic)
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  next()
}

// Middleware to verify user is an approved seller
function requireSellerVerified(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  
  if (req.user.role !== 'seller') {
    return res.status(403).json({ error: 'Seller access required' })
  }
  
  if (req.user.sellerStatus !== 'approved') {
    return res.status(403).json({ error: 'Your seller application is pending approval. Please wait for admin to approve your request.' })
  }
  
  next()
}

// Middleware to verify user is admin
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  
  next()
}

// Middleware to allow buyers, pending sellers, and verified sellers (for marketplace, cart, etc.)
function requireBuyerOrVerifiedSeller(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  
  if (req.user.role === 'admin') {
    return res.status(403).json({ error: 'Admin cannot access this resource' })
  }
  
  // Allow:
  // - Buyers (role: 'buyer', no sellerStatus)
  // - Pending sellers (role: 'buyer', sellerStatus: 'pending')
  // - Rejected sellers (role: 'buyer', sellerStatus: 'rejected')
  // - Approved sellers (role: 'seller', sellerStatus: 'approved')
  
  // Block unapproved sellers
  if (req.user.role === 'seller' && req.user.sellerStatus !== 'approved') {
    return res.status(403).json({ error: 'Your seller application is pending approval.' })
  }
  
  next()
}

module.exports = { 
  authenticateToken, 
  auth: authenticateToken, 
  adminAuth: requireAdmin,
  requireAuth,
  requireSellerVerified,
  requireAdmin,
  requireBuyerOrVerifiedSeller
}

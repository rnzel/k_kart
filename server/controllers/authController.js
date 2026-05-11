const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const RoleManagementService = require('../services/roleManagement');

// Generate access token
const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      role: user.role, 
      isVerified: user.isVerified,
      sellerStatus: user.sellerStatus,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: '30m' } // 30 minutes access token
  );
};

// Generate refresh token
const generateRefreshToken = () => {
  return jwt.sign(
    { random: Math.random().toString(36).substring(2) },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // 7 days refresh token
  );
};

// Save refresh token to database
const saveRefreshToken = async (userId, token) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
  
  const refreshToken = new RefreshToken({
    token,
    userId,
    expiresAt
  });
  
  await refreshToken.save();
  return refreshToken;
};

// Login controller
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
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
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    
    // Save refresh token to database
    await saveRefreshToken(user.id, refreshToken);
    
    res.json({ 
      success: true,
      message: 'Login successful',
      accessToken,
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
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Login failed',
      ...(process.env.NODE_ENV === 'development' && { error: err })
    });
  }
};

// Refresh token controller
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Refresh token is required'
      });
    }
    
    // Find refresh token in database
    const refreshTokenDoc = await RefreshToken.findOne({ 
      token, 
      revoked: false 
    });
    
    if (!refreshTokenDoc) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid or revoked refresh token'
      });
    }
    
    // Check if token is expired
    if (refreshTokenDoc.isExpired()) {
      // Revoke expired token
      refreshTokenDoc.revoked = true;
      await refreshTokenDoc.save();
      return res.status(401).json({ 
        success: false,
        message: 'Refresh token has expired'
      });
    }
    
    // Verify token
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    // Get user
    const user = await User.findById(refreshTokenDoc.userId).select('-password');
    if (!user || user.isDeleted) {
      // Revoke token if user not found or deleted
      refreshTokenDoc.revoked = true;
      await refreshTokenDoc.save();
      return res.status(401).json({ 
        success: false,
        message: 'User not found or account deactivated'
      });
    }
    
    // Generate new access token
    const newAccessToken = generateAccessToken(user);
    
    // Rotate refresh token: revoke old one and create new one
    refreshTokenDoc.revoked = true;
    await refreshTokenDoc.save();
    
    const newRefreshToken = generateRefreshToken();
    await saveRefreshToken(user.id, newRefreshToken);
    
    res.json({ 
      success: true,
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Token refresh failed'
    });
  }
};

// Logout controller
const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    
    if (token) {
      // Revoke refresh token if provided
      await RefreshToken.updateOne(
        { token: token, revoked: false },
        { $set: { revoked: true } }
      );
    }
    
    // Optionally, revoke all refresh tokens for user (more secure)
    // await RefreshToken.updateMany(
    //   { userId: req.user?.userId, revoked: false },
    //   { $set: { revoked: true } }
    // );
    
    res.json({ 
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Logout failed'
    });
  }
};

module.exports = {
  login,
  refreshToken,
  logout
};
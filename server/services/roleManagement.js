const User = require('../models/User');
const AppError = require('../middleware/errorHandler').AppError;

/**
 * Role Management Service
 * Handles user role transitions, seller verification, and access control
 */

class RoleManagementService {
  
  /**
   * Register a new user with proper role handling
   */
  static async registerUser(userData) {
    try {
      const { firstName, lastName, email, password, role = 'buyer', studentIdPicture } = userData;

      // Validate role
      if (!['buyer', 'seller'].includes(role)) {
        throw new AppError('Invalid role specified', 400, 'INVALID_ROLE');
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
      }

      // Prepare user data
      const userRole = role === 'seller' ? 'buyer' : role; // Sellers start as buyers
      const sellerStatus = role === 'seller' ? 'pending' : null;

      const newUser = new User({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: userRole,
        sellerStatus: sellerStatus,
        studentIdPicture: role === 'seller' ? studentIdPicture : undefined,
        applicationDate: role === 'seller' ? new Date() : undefined
      });

      await newUser.save();

      // Return user data without password
      const userResponse = newUser.toObject();
      delete userResponse.password;

      return {
        success: true,
        message: role === 'seller' 
          ? 'Seller application submitted successfully. Please wait for admin approval.'
          : 'User registered successfully',
        user: userResponse
      };

    } catch (error) {
      if (error.code === 11000) {
        throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
      }
      throw error;
    }
  }

  /**
   * Apply for seller status
   */
  static async applyForSeller(userId, idImage) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Check if user is already a seller
      if (user.role === 'seller') {
        throw new AppError('You already have seller privileges', 400, 'ALREADY_SELLER');
      }

      // Check if user already has a pending application
      if (user.sellerStatus === 'pending') {
        throw new AppError('You already have a pending seller application', 400, 'APPLICATION_PENDING');
      }

      // Update user to pending seller status
      user.role = 'buyer'; // Keep as buyer until approved
      user.sellerStatus = 'pending';
      user.idImage = idImage;
      user.applicationDate = new Date();
      user.rejectionReason = undefined;
      user.rejectionNote = undefined;

      await user.save();

      return {
        success: true,
        message: 'Seller application submitted successfully. Please wait for admin approval.',
        user: {
          id: user._id,
          role: user.role,
          sellerStatus: user.sellerStatus,
          applicationDate: user.applicationDate
        }
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's seller application status
   */
  static async getSellerApplicationStatus(userId) {
    try {
      const user = await User.findById(userId).select('role sellerStatus applicationDate rejectionReason rejectionNote');
      
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      return {
        success: true,
        data: {
          role: user.role,
          sellerStatus: user.sellerStatus,
          applicationDate: user.applicationDate,
          rejectionReason: user.rejectionReason,
          rejectionNote: user.rejectionNote,
          canApply: user.role === 'buyer' && user.sellerStatus !== 'pending'
        }
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Admin: Review seller application
   */
  static async reviewSellerApplication(adminId, userId, status, rejectionReason = '', rejectionNote = '') {
    try {
      const admin = await User.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        throw new AppError('Unauthorized: Admin access required', 403, 'UNAUTHORIZED');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Validate status
      if (!['approved', 'rejected'].includes(status)) {
        throw new AppError('Invalid status', 400, 'INVALID_STATUS');
      }

      // Check current status
      if (user.sellerStatus !== 'pending') {
        throw new AppError('User does not have a pending application', 400, 'NO_PENDING_APPLICATION');
      }

      if (status === 'approved') {
        // Approve seller application
        user.role = 'seller';
        user.sellerStatus = 'approved';
        user.isVerified = true;
        user.rejectionReason = undefined;
        user.rejectionNote = undefined;
      } else {
        // Reject seller application
        user.role = 'buyer'; // Keep as buyer
        user.sellerStatus = 'rejected';
        user.rejectionReason = rejectionReason || 'Application rejected';
        user.rejectionNote = rejectionNote;
      }

      await user.save();

      return {
        success: true,
        message: status === 'approved' 
          ? 'Seller application approved successfully'
          : 'Seller application rejected',
        user: {
          id: user._id,
          role: user.role,
          sellerStatus: user.sellerStatus,
          rejectionReason: user.rejectionReason,
          rejectionNote: user.rejectionNote
        }
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Admin: Get all seller applications with pagination
   */
  static async getSellerApplications(status = null, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const query = { sellerStatus: { $in: ['pending', 'rejected'] } };

      if (status) {
        query.sellerStatus = status;
      }

      const applications = await User.find(query)
        .select('firstName lastName email role sellerStatus applicationDate rejectionReason rejectionNote')
        .sort({ applicationDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments(query);

      return {
        success: true,
        data: applications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Admin: Get user details for verification
   */
  static async getUserForVerification(userId) {
    try {
      const user = await User.findById(userId).select('firstName lastName email role sellerStatus idImage applicationDate rejectionReason rejectionNote');
      
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      return {
        success: true,
        data: user
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user profile with role validation
   */
  static async updateUserProfile(userId, updateData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Prevent role changes by users
      const { role, sellerStatus, ...allowedUpdates } = updateData;

      // Check if email is being changed and if it's unique
      if (updateData.email && updateData.email.toLowerCase() !== user.email) {
        const existingUser = await User.findOne({ 
          email: updateData.email.toLowerCase(),
          _id: { $ne: userId }
        });
        if (existingUser) {
          throw new AppError('Email already in use', 409, 'EMAIL_EXISTS');
        }
      }

      // Update allowed fields
      Object.assign(user, allowedUpdates);
      await user.save();

      // Return user data without password
      const userResponse = user.toObject();
      delete userResponse.password;

      return {
        success: true,
        message: 'Profile updated successfully',
        user: userResponse
      };

    } catch (error) {
      if (error.code === 11000) {
        throw new AppError('Email already in use', 409, 'EMAIL_EXISTS');
      }
      throw error;
    }
  }

  /**
   * Change user password with validation
   */
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Check if user account is deleted
      if (user.isDeleted) {
        throw new AppError('Account has been deactivated', 403, 'ACCOUNT_DEACTIVATED');
      }

      // Trim passwords to handle whitespace issues
      const trimmedCurrentPassword = currentPassword ? currentPassword.trim() : '';
      const trimmedNewPassword = newPassword ? newPassword.trim() : '';

      // Validate passwords are not empty
      if (!trimmedCurrentPassword) {
        throw new AppError('Current password is required', 400, 'MISSING_CURRENT_PASSWORD');
      }

      if (!trimmedNewPassword) {
        throw new AppError('New password is required', 400, 'MISSING_NEW_PASSWORD');
      }

      // Verify current password
      const isMatch = await user.comparePassword(trimmedCurrentPassword);
      if (!isMatch) {
        throw new AppError('Current password do not match your password', 400, 'INVALID_PASSWORD');
      }

      // Check if new password is different from current password
      if (trimmedCurrentPassword === trimmedNewPassword) {
        throw new AppError('New password must be different from current password', 400, 'SAME_PASSWORD');
      }

      // Validate new password meets requirements (same as registration)
      if (trimmedNewPassword.length < 6) {
        throw new AppError('Password must be at least 6 characters long', 400, 'INVALID_PASSWORD_FORMAT');
      }

      // Check password contains at least one letter and one number
      if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(trimmedNewPassword)) {
        throw new AppError('Password must contain at least one letter and one number', 400, 'INVALID_PASSWORD_FORMAT');
      }

      // Update password - this will trigger the pre-save middleware to hash it
      user.password = trimmedNewPassword;
      await user.save();

      return {
        success: true,
        message: 'Password changed successfully'
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Admin: Delete user account
   */
  static async deleteUser(adminId, userId) {
    try {
      const admin = await User.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        throw new AppError('Unauthorized: Admin access required', 403, 'UNAUTHORIZED');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Soft delete by marking as deleted
      user.isDeleted = true;
      user.deletedAt = new Date();
      await user.save();

      return {
        success: true,
        message: 'User account deactivated successfully'
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Admin: Get all users with pagination and filtering
   */
  static async getAllUsers(page = 1, limit = 10, role = null, search = null) {
    try {
      const skip = (page - 1) * limit;
      const query = { isDeleted: { $ne: true } };

      if (role) {
        query.role = role;
      }

      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const users = await User.find(query)
        .select('firstName lastName email role sellerStatus isVerified dateRegistered applicationDate')
        .sort({ dateRegistered: -1 })
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments(query);

      return {
        success: true,
        data: users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Check user permissions for specific actions
   */
  static checkPermissions(user, action, resource = null) {
    const permissions = {
      // Buyer permissions
      'buyer': [
        'view_products',
        'view_shops', 
        'add_to_cart',
        'view_cart',
        'checkout',
        'view_orders',
        'cancel_order',
        'apply_seller'
      ],
      
      // Seller permissions
      'seller': [
        'view_products',
        'view_shops',
        'add_to_cart',
        'view_cart',
        'checkout',
        'view_orders',
        'cancel_order',
        'manage_own_shop',
        'manage_own_products',
        'view_seller_orders',
        'update_order_status'
      ],
      
      // Admin permissions
      'admin': [
        'view_products',
        'view_shops',
        'manage_all_products',
        'manage_all_shops',
        'view_all_orders',
        'manage_users',
        'review_applications',
        'delete_users'
      ]
    };

    if (!user || user.isDeleted) {
      return false;
    }

    const userPermissions = permissions[user.role] || [];
    
    // Special checks for seller status
    if (user.role === 'seller' && user.sellerStatus !== 'approved') {
      // Pending/rejected sellers have limited permissions
      return ['view_products', 'view_shops', 'add_to_cart', 'view_cart', 'checkout', 'view_orders', 'cancel_order'].includes(action);
    }

    return userPermissions.includes(action);
  }

  /**
   * Get user role summary
   */
  static async getUserRoleSummary(userId) {
    try {
      const user = await User.findById(userId).select('role sellerStatus isVerified email firstName lastName');
      
      if (!user) {
        return null;
      }

      return {
        id: user._id,
        email: user.email,
        fullName: `${user.firstName} ${user.lastName}`,
        role: user.role,
        sellerStatus: user.sellerStatus,
        isVerified: user.isVerified,
        canAccessMarketplace: user.role !== 'admin',
        canManageShop: user.role === 'seller' && user.sellerStatus === 'approved',
        canViewAdmin: user.role === 'admin'
      };

    } catch (error) {
      throw error;
    }
  }
}

module.exports = RoleManagementService;
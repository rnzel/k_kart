# KampusKart Security Guide

## Overview

This document outlines the security measures implemented in the KampusKart system and provides guidelines for maintaining security best practices.

## Security Features Implemented

### 1. Input Validation and Sanitization

**Location**: `server/middleware/inputValidation.js`

**Features**:
- Comprehensive input validation using express-validator
- Automatic sanitization of user inputs
- File type and size validation for uploads
- SQL injection and XSS prevention
- Email and phone number format validation

**Usage**:
```javascript
const { validateUserRegistration, handleValidationErrors } = require('./middleware/inputValidation');

app.post('/api/auth/register', 
  validateUserRegistration, 
  handleValidationErrors, 
  authController.register
);
```

### 2. Enhanced Authentication

**Location**: `server/middleware/auth.js`

**Features**:
- JWT token validation with strict security checks
- Role-based access control (RBAC)
- Session management with proper expiration
- Enhanced error messages for security
- User status validation (deleted accounts)

**Security Measures**:
- Token algorithm specification (HS256 only)
- Token expiration validation
- User account status checks
- Comprehensive logging for monitoring

### 3. File Upload Security

**Location**: `server/middleware/fileUpload.js`

**Features**:
- File type validation (only images allowed)
- File size limits per file type
- Secure filename generation
- Dangerous pattern detection
- Automatic cleanup of failed uploads

**Security Measures**:
- MIME type validation
- File extension validation
- Null byte injection prevention
- Directory traversal prevention
- Secure filename sanitization

### 4. Error Handling

**Location**: `server/middleware/errorHandler.js`

**Features**:
- Security-aware error responses
- Information disclosure prevention
- Structured error responses
- Custom error classes for different scenarios
- Request context logging

**Security Measures**:
- Sensitive information redaction
- Environment-specific error details
- Structured error responses
- Security-sensitive error detection

### 5. Role Management

**Location**: `server/services/roleManagement.js`

**Features**:
- Secure role transitions
- Seller application workflow
- Permission-based access control
- Admin-only operations
- User status management

**Security Measures**:
- Role validation
- Application status tracking
- Permission checking
- Admin authorization required

### 6. Data Integrity

**Location**: `server/services/dataIntegrity.js`

**Features**:
- Stock management with reservations
- Order validation and status transitions
- Data consistency checks
- Automatic cleanup of expired reservations
- Transaction-based operations

**Security Measures**:
- Stock reservation system
- Order status validation
- Data consistency monitoring
- Automatic cleanup processes

### 7. Performance Optimization

**Location**: `server/services/performance.js`

**Features**:
- Query optimization
- Caching system with TTL
- Database index optimization
- Performance monitoring
- Memory usage tracking

**Security Measures**:
- Cache size limits
- Automatic cache cleanup
- Query optimization to prevent DoS
- Performance monitoring for anomalies

## Security Best Practices

### 1. Password Security

- Minimum 6 characters required
- Must contain letters and numbers
- Passwords are hashed using bcrypt with salt
- No password reset functionality (add if needed)

### 2. JWT Security

- Tokens expire in 7 days
- Only HS256 algorithm allowed
- Token validation includes expiration checks
- User status verified on each request

### 3. File Upload Security

- Only image files allowed (JPEG, PNG, GIF, WebP)
- File size limits:
  - Profile pictures: 2MB
  - Product images: 5MB
  - Shop logos: 1MB
  - ID pictures: 3MB
- Secure filename generation
- Automatic cleanup of failed uploads

### 4. Database Security

- Input validation prevents injection attacks
- Proper indexing for performance
- Soft delete pattern for data retention
- Transaction support for critical operations

### 5. API Security

- Rate limiting on login (5 attempts per 15 minutes)
- CORS configuration for allowed origins
- Input validation on all endpoints
- Proper error handling without information disclosure

## Security Headers

The application should implement the following security headers:

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## Environment Variables Security

Ensure the following environment variables are properly set:

```env
# Required
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key

# Optional
NODE_ENV=production
PORT=3000
```

**Security Notes**:
- JWT_SECRET should be a long, random string
- Never commit environment variables to version control
- Use different secrets for different environments
- Regularly rotate JWT secrets

## Monitoring and Logging

### Security Events to Monitor

1. **Authentication Failures**
   - Failed login attempts
   - Invalid tokens
   - Expired sessions

2. **Authorization Violations**
   - Access to unauthorized resources
   - Role manipulation attempts
   - Privilege escalation attempts

3. **Input Validation Failures**
   - Malformed requests
   - Invalid data formats
   - Suspicious input patterns

4. **File Upload Issues**
   - Invalid file types
   - Oversized files
   - Suspicious filenames

### Logging Best Practices

```javascript
// Log security events
console.warn('Security event:', {
  type: 'AUTH_FAILURE',
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  timestamp: new Date().toISOString(),
  details: 'Failed login attempt'
});

// Log data integrity issues
console.error('Data integrity issue:', {
  type: 'NEGATIVE_STOCK',
  productId: productId,
  currentStock: currentStock,
  timestamp: new Date().toISOString()
});
```

## Regular Security Tasks

### 1. Update Dependencies

```bash
# Check for vulnerabilities
npm audit

# Update packages
npm update

# Review changelogs for security fixes
```

### 2. Monitor Logs

- Review authentication logs daily
- Check for unusual patterns
- Monitor error rates
- Track performance metrics

### 3. Database Maintenance

```javascript
// Run data integrity checks
const DataIntegrityService = require('./services/dataIntegrity');
await DataIntegrityService.checkDataConsistency();

// Clean up expired reservations
await DataIntegrityService.cleanupExpiredReservations();
```

### 4. Cache Management

```javascript
// Monitor cache performance
const PerformanceService = require('./services/performance');
const metrics = await PerformanceService.getPerformanceMetrics();

// Clear cache if needed
PerformanceService.clearCache();
```

## Incident Response

### 1. Suspicious Activity

If you detect suspicious activity:

1. **Log the incident** with full details
2. **Block the IP address** if necessary
3. **Review affected accounts**
4. **Notify administrators**
5. **Document the incident**

### 2. Data Breach

In case of a data breach:

1. **Isolate affected systems**
2. **Preserve evidence**
3. **Notify relevant authorities**
4. **Communicate with users**
5. **Implement fixes**
6. **Review security measures**

### 3. System Compromise

If the system is compromised:

1. **Disconnect from network**
2. **Preserve system state**
3. **Engage security experts**
4. **Restore from clean backups**
5. **Implement additional security**
6. **Conduct post-incident review**

## Security Testing

### 1. Input Validation Testing

Test all endpoints with:
- Malformed data
- SQL injection attempts
- XSS payloads
- Large payloads
- Invalid file uploads

### 2. Authentication Testing

Test:
- Token expiration
- Invalid tokens
- Role manipulation
- Session hijacking
- Brute force attacks

### 3. Authorization Testing

Test:
- Access to unauthorized resources
- Privilege escalation
- Role-based access
- Admin-only operations

### 4. Performance Testing

Test:
- Load handling
- Cache performance
- Database query performance
- Memory usage under load

## Security Checklist

- [ ] All input is validated and sanitized
- [ ] File uploads are properly secured
- [ ] Authentication is robust
- [ ] Authorization is properly implemented
- [ ] Error messages don't leak information
- [ ] Dependencies are up to date
- [ ] Environment variables are secure
- [ ] Logs are monitored
- [ ] Security headers are implemented
- [ ] Regular security audits are performed
- [ ] Incident response plan is documented
- [ ] Team is trained on security best practices

## Contact

For security issues or questions:

- Review the codebase for security implementations
- Check the logs for security events
- Test the security measures
- Document any security concerns

Remember: Security is an ongoing process, not a one-time implementation. Regular review and updates are essential to maintain a secure system.
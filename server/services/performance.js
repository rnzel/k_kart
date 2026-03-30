const mongoose = require('mongoose');

/**
 * Performance monitoring service for the Product API
 * Tracks response times, error rates, and system health
 */
class PerformanceService {
  constructor() {
    this.metrics = {
      requests: new Map(),
      errors: new Map(),
      responseTimes: [],
      fileUploads: []
    };
    
    this.health = {
      gridFSReady: false,
      databaseConnected: false,
      lastCheck: null
    };
  }

  /**
   * Middleware to track request performance
   */
  trackRequest(req, res, next) {
    const startTime = Date.now();
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    
    // Store start time
    req.startTime = startTime;
    req.endpoint = endpoint;
    
    // Track response
    const originalSend = res.send;
    res.send = function(data) {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Record metrics
      this.recordRequest(endpoint, responseTime, statusCode);
      this.recordResponseTime(responseTime);
      
      // Log slow requests
      if (responseTime > 2000) {
        console.warn(`Slow request detected: ${endpoint} took ${responseTime}ms`);
      }
      
      originalSend.call(this, data);
    }.bind(this);
    
    next();
  }

  /**
   * Record a request metric
   */
  recordRequest(endpoint, responseTime, statusCode) {
    if (!this.metrics.requests.has(endpoint)) {
      this.metrics.requests.set(endpoint, {
        count: 0,
        totalResponseTime: 0,
        errors: 0,
        lastAccess: null
      });
    }
    
    const metric = this.metrics.requests.get(endpoint);
    metric.count++;
    metric.totalResponseTime += responseTime;
    metric.lastAccess = new Date();
    
    if (statusCode >= 400) {
      metric.errors++;
    }
  }

  /**
   * Record response time for statistical analysis
   */
  recordResponseTime(responseTime) {
    this.metrics.responseTimes.push({
      time: responseTime,
      timestamp: new Date()
    });
    
    // Keep only last 1000 entries
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes = this.metrics.responseTimes.slice(-1000);
    }
  }

  /**
   * Record file upload metrics
   */
  recordFileUpload(filename, fileSize, responseTime, success) {
    this.metrics.fileUploads.push({
      filename,
      fileSize,
      responseTime,
      success,
      timestamp: new Date()
    });
    
    // Keep only last 500 entries
    if (this.metrics.fileUploads.length > 500) {
      this.metrics.fileUploads = this.metrics.fileUploads.slice(-500);
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // Calculate average response times
    const recentResponseTimes = this.metrics.responseTimes
      .filter(entry => entry.timestamp.getTime() > oneHourAgo)
      .map(entry => entry.time);
    
    const avgResponseTime = recentResponseTimes.length > 0 
      ? recentResponseTimes.reduce((a, b) => a + b, 0) / recentResponseTimes.length 
      : 0;
    
    // Calculate error rates
    const endpointMetrics = {};
    for (const [endpoint, metric] of this.metrics.requests) {
      const errorRate = metric.count > 0 ? (metric.errors / metric.count) * 100 : 0;
      endpointMetrics[endpoint] = {
        count: metric.count,
        errors: metric.errors,
        errorRate: errorRate.toFixed(2),
        avgResponseTime: metric.totalResponseTime / metric.count
      };
    }
    
    // File upload statistics
    const recentUploads = this.metrics.fileUploads
      .filter(entry => entry.timestamp.getTime() > oneHourAgo);
    
    const uploadStats = {
      total: recentUploads.length,
      successful: recentUploads.filter(u => u.success).length,
      failed: recentUploads.filter(u => !u.success).length,
      avgResponseTime: recentUploads.length > 0 
        ? recentUploads.reduce((a, b) => a + b.responseTime, 0) / recentUploads.length 
        : 0
    };

    return {
      systemHealth: this.health,
      endpointMetrics,
      responseTime: {
        avg: avgResponseTime.toFixed(2),
        min: Math.min(...recentResponseTimes),
        max: Math.max(...recentResponseTimes),
        p95: this.calculatePercentile(recentResponseTimes, 95)
      },
      fileUploads: uploadStats,
      timestamp: new Date()
    };
  }

  /**
   * Calculate percentile
   */
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Check system health
   */
  async checkHealth() {
    try {
      // Check database connection
      this.health.databaseConnected = mongoose.connection.readyState === 1;
      
      // Check GridFS readiness
      try {
        const { isGridFSReady } = require('../config/gridfsBucket');
        this.health.gridFSReady = isGridFSReady();
      } catch (err) {
        this.health.gridFSReady = false;
      }
      
      this.health.lastCheck = new Date();
      
      return {
        status: this.health.databaseConnected && this.health.gridFSReady ? 'healthy' : 'degraded',
        ...this.health
      };
    } catch (err) {
      console.error('Health check failed:', err);
      return {
        status: 'error',
        error: err.message,
        ...this.health
      };
    }
  }

  /**
   * Get slow endpoints (over 1 second average response time)
   */
  getSlowEndpoints() {
    const slowEndpoints = [];
    
    for (const [endpoint, metric] of this.metrics.requests) {
      const avgResponseTime = metric.totalResponseTime / metric.count;
      if (avgResponseTime > 1000) {
        slowEndpoints.push({
          endpoint,
          avgResponseTime: avgResponseTime.toFixed(2),
          count: metric.count,
          errors: metric.errors
        });
      }
    }
    
    return slowEndpoints.sort((a, b) => b.avgResponseTime - a.avgResponseTime);
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics() {
    this.metrics = {
      requests: new Map(),
      errors: new Map(),
      responseTimes: [],
      fileUploads: []
    };
  }

  /**
   * Log performance summary
   */
  logSummary() {
    const metrics = this.getMetrics();
    
    console.log('\n=== Performance Summary ===');
    console.log(`System Status: ${metrics.systemHealth.status}`);
    console.log(`Database Connected: ${metrics.systemHealth.databaseConnected}`);
    console.log(`GridFS Ready: ${metrics.systemHealth.gridFSReady}`);
    console.log(`Average Response Time: ${metrics.responseTime.avg}ms`);
    console.log(`95th Percentile: ${metrics.responseTime.p95}ms`);
    console.log(`File Upload Success Rate: ${metrics.fileUploads.total > 0 ? 
      ((metrics.fileUploads.successful / metrics.fileUploads.total) * 100).toFixed(2) : 0}%`);
    
    const slowEndpoints = this.getSlowEndpoints();
    if (slowEndpoints.length > 0) {
      console.log('\nSlow Endpoints:');
      slowEndpoints.forEach(ep => {
        console.log(`  ${ep.endpoint}: ${ep.avgResponseTime}ms (${ep.count} requests)`);
      });
    }
    console.log('==========================\n');
  }
}

// Create singleton instance
const performanceService = new PerformanceService();

module.exports = performanceService;
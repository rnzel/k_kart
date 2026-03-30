const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

let gfsBucket = null;
let isInitialized = false;
let initializationError = null;

const BUCKET_NAME = 'uploads';

/**
 * Initialize GridFSBucket after mongoose connection is open
 * Call this in mongoose.connection.once('open') callback
 * Enhanced with better error handling and async support
 */
const initGridFSBucket = async () => {
  try {
    if (isInitialized && gfsBucket) {
      console.log('GridFSBucket already initialized');
      return gfsBucket;
    }

    // Wait for mongoose connection if not ready
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve, reject) => {
        mongoose.connection.once('connected', resolve);
        mongoose.connection.once('error', reject);
        // Timeout after 10 seconds
        setTimeout(() => reject(new Error('Database connection timeout')), 10000);
      });
    }

    if (!mongoose.connection.db) {
      throw new Error('Database not connected. Call initGridFSBucket after mongoose connection is established.');
    }

    gfsBucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: BUCKET_NAME
    });

    isInitialized = true;
    initializationError = null;
    console.log(`GridFSBucket initialized with bucket: ${BUCKET_NAME}`);

    return gfsBucket;
  } catch (err) {
    console.error('Error initializing GridFSBucket:', err);
    initializationError = err;
    isInitialized = false;
    throw err;
  }
};

/**
 * Get the GridFSBucket instance
 * Throws clear error if not initialized (cold start handling)
 */
const getGridFSBucket = () => {
  if (!isInitialized || !gfsBucket) {
    if (initializationError) {
      throw new Error(
        `GridFSBucket not ready: ${initializationError.message}. ` +
        'This may be a cold start. Ensure mongoose.connection.once("open") has fired before accessing GridFS.'
      );
    }
    throw new Error(
      'GridFSBucket not initialized. This may be a cold start. ' +
      'Ensure mongoose.connection.once("open") has fired before accessing GridFS.'
    );
  }

  return gfsBucket;
};

/**
 * Check if GridFSBucket is ready
 * Useful for health checks and conditional logic
 */
const isGridFSReady = () => {
  return isInitialized && gfsBucket !== null && initializationError === null;
};

/**
 * Get bucket name
 */
const getBucketName = () => BUCKET_NAME;

/**
 * Get detailed GridFS status for debugging and monitoring
 */
const getGridFSStatus = () => {
  return {
    isReady: isGridFSReady(),
    isInitialized: isInitialized,
    hasError: initializationError !== null,
    error: initializationError?.message || null,
    bucketName: BUCKET_NAME,
    mongooseReadyState: mongoose.connection.readyState
  };
};

/**
 * Force re-initialization of GridFS (useful for error recovery)
 */
const reinitGridFSBucket = async () => {
  try {
    // Reset state
    isInitialized = false;
    initializationError = null;
    gfsBucket = null;
    
    // Wait a moment before retrying
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to reinitialize
    return await initGridFSBucket();
  } catch (err) {
    console.error('Error during GridFS re-initialization:', err);
    throw err;
  }
};

module.exports = {
  initGridFSBucket,
  getGridFSBucket,
  isGridFSReady,
  getBucketName,
  getGridFSStatus,
  reinitGridFSBucket,
  BUCKET_NAME
};

const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

let gfsBucket = null;
let isInitialized = false;

const BUCKET_NAME = 'uploads';

/**
 * Initialize GridFSBucket after mongoose connection is open
 * Call this in mongoose.connection.once('open') callback
 */
const initGridFSBucket = () => {
  if (isInitialized && gfsBucket) {
    console.log('GridFSBucket already initialized');
    return gfsBucket;
  }

  if (!mongoose.connection.db) {
    throw new Error('Database not connected. Call initGridFSBucket after mongoose connection is established.');
  }

  gfsBucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: BUCKET_NAME
  });

  isInitialized = true;
  console.log(`GridFSBucket initialized with bucket: ${BUCKET_NAME}`);

  return gfsBucket;
};

/**
 * Get the GridFSBucket instance
 * Throws clear error if not initialized (cold start handling)
 */
const getGridFSBucket = () => {
  if (!isInitialized || !gfsBucket) {
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
  return isInitialized && gfsBucket !== null;
};

/**
 * Get bucket name
 */
const getBucketName = () => BUCKET_NAME;

module.exports = {
  initGridFSBucket,
  getGridFSBucket,
  isGridFSReady,
  getBucketName,
  BUCKET_NAME
};

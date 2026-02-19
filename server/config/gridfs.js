const mongoose = require('mongoose');
const Grid = require('gridfs-stream');

let gfs;

const initGridFS = (db) => {
    // Initialize GridFS with the mongoose connection
    gfs = Grid(db, mongoose.mongo);
    
    // Set the bucket name to 'uploads'
    gfs.bucketName = 'uploads';
    
    console.log('GridFS initialized with bucket: uploads');
    
    return gfs;
};

const getGridFS = () => {
    if (!gfs) {
        throw new Error('GridFS not initialized. Call initGridFS after mongoose connection.');
    }
    return gfs;
};

const getGridFSBucket = () => {
    if (!gfs) {
        throw new Error('GridFS not initialized. Call initGridFS after mongoose connection.');
    }
    return gfs.bucket;
};

module.exports = {
    initGridFS,
    getGridFS,
    getGridFSBucket
};

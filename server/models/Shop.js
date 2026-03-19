const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema({
    shopName: { 
        type: String, 
        required: true, 
        maxlength: 50,
        index: true
    },
    shopDescription: { type: String, required: true, maxlength: 500 },
    shopLogo: { type: String },  // Stores filename from GridFS
    shopContact: { 
        type: String, 
        required: true,
        match: [/(?:\+63|0)\d{10}$/, 'Invalid Philippine phone number format. Use +63XXXXXXXXXX or 09XXXXXXXXX'],
        index: true
    },
    shopEmail: { 
        type: String,
        match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
        index: true
    },
    shopLocation: { 
        type: String, 
        required: true,
        index: true
    },
    owner: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true,
        index: true
    },
    isDeleted: { 
        type: Boolean, 
        default: false,
        index: true
    }
});

module.exports = mongoose.model("Shop", shopSchema);

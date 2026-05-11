const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const BCRYPT_ROUNDS = Math.max(10, Number(process.env.BCRYPT_ROUNDS || 10))

const userSchema = new mongoose.Schema({
  firstName: { 
    type: String, 
    required: true,
    index: true
  },
  lastName: { 
    type: String, 
    required: true,
    index: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    index: true
  },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ["buyer", "seller", "admin"], 
    default: "buyer",
    index: true
  },
  dateRegistered: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  emailVerifiedAt: { type: Date, default: null },
  studentIdPicture: { type: String },
  // Seller verification fields
  isVerified: { 
    type: Boolean, 
    default: false,
    index: true
  },
  sellerStatus: { 
    type: String, 
    enum: ["pending", "approved", "rejected", null], 
    default: null,
    index: true
  },
  idImage: { type: String }, // ID image for seller verification
  applicationDate: { type: Date },
  rejectionReason: { type: String }, // Predefined reason for rejection
  rejectionNote: { type: String } // Optional custom note for rejection
}, { 
  timestamps: true,
  // Compound index for role and sellerStatus queries
  index: { role: 1, sellerStatus: 1 }
})

// Pre-save middleware to hash password
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return
  }

  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS)
})

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

module.exports = mongoose.model("User", userSchema)

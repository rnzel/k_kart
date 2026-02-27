const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["buyer", "seller", "admin"], default: "buyer" },
  dateRegistered: { type: Date, default: Date.now },
  emailVerifiedAt: { type: Date, default: null },
  studentIdPicture: { type: String },
  // Seller verification fields
  isVerified: { type: Boolean, default: false },
  sellerStatus: { 
    type: String, 
    enum: ["pending", "approved", "rejected", null], 
    default: null 
  },
  idImage: { type: String }, // ID image for seller verification
  applicationDate: { type: Date }
}, { timestamps: true })

// Pre-save middleware to hash password
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return
  }
  
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

module.exports = mongoose.model("User", userSchema)

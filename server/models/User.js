const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["buyer", "seller", "admin"], default: "buyer" },
  dateRegistered: { type: Date, default: Date.now },
  emailVerifiedAt: { type: Date, default: null },
  // Seller-specific fields
  studentIdNumber: { type: String },
  studentIdPicture: { type: String },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true })

module.exports = mongoose.model("User", userSchema)
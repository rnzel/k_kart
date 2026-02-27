require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../models/User')

// Reset password to this value
const NEW_PASSWORD = 'admin123'

const resetPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB')

    // Find admin user
    const admin = await User.findOne({ email: 'admin@kampuskart.com' })
    
    if (!admin) {
      console.log('❌ Admin user not found!')
      await mongoose.disconnect()
      return
    }

    console.log(`Found admin user: ${admin.email}`)
    console.log(`Current role: ${admin.role}`)

    // Hash the new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt)

    // Update password
    admin.password = hashedPassword
    await admin.save()

    console.log('✅ Password reset successful!')
    console.log(`   Email: ${admin.email}`)
    console.log(`   Password: ${NEW_PASSWORD}`)

    await mongoose.disconnect()
    console.log('👋 Disconnected from MongoDB')
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

resetPassword()

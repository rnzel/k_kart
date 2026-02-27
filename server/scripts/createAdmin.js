require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../models/User')

// Admin user data - CHANGE THESE VALUES
const adminData = {
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@kampuskart.com',
  password: 'admin123',
  role: 'admin'
}

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    console.log('MONGO_URI:', process.env.MONGO_URI)
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB')

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email })
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!')
      console.log(`   Email: ${existingAdmin.email}`)
      console.log(`   Role: ${existingAdmin.role}`)
      
      // Update existing user to admin role
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin'
        await existingAdmin.save()
        console.log('✅ Updated existing user to admin role')
      }
      
      await mongoose.disconnect()
      console.log('👋 Disconnected from MongoDB')
      return
    }

    // Create new admin user
    const admin = await User.create(adminData)
    console.log('✅ Admin user created successfully!')
    console.log(`   Email: ${admin.email}`)
    console.log(`   Role: ${admin.role}`)
    console.log(`   Password: ${adminData.password}`)
    console.log('')
    console.log('🔐 IMPORTANT: Change this password after first login!')

    await mongoose.disconnect()
    console.log('👋 Disconnected from MongoDB')
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

createAdmin()

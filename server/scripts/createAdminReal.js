require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../models/User')

// Admin credentials - using an email NOT already in the database
const adminData = {
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@kampuskart.com',
  password: 'admin123',
  role: 'admin'
}

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB')

    // Check if email already exists
    const existingUser = await User.findOne({ email: adminData.email })
    
    if (existingUser) {
      console.log(`⚠️  User with email ${adminData.email} already exists!`)
      console.log(`   Current role: ${existingUser.role}`)
      
      // Update to admin
      existingUser.role = 'admin'
      await existingUser.save()
      console.log('✅ Updated user to admin role')
      
      await mongoose.disconnect()
      return
    }

    // Create new admin user
    const admin = await User.create(adminData)
    
    console.log('✅ Admin user created successfully!')
    console.log(`   Email: ${admin.email}`)
    console.log(`   Role: ${admin.role}`)
    console.log(`   Password: ${adminData.password}`)
    console.log(`   ID: ${admin._id}`)

    await mongoose.disconnect()
    console.log('👋 Disconnected from MongoDB')
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

createAdmin()

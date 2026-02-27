require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const mongoose = require('mongoose')
const User = require('../models/User')

const listUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB\n')

    const users = await User.find({}).select('-password')
    
    console.log(`Total users: ${users.length}\n`)
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`)
      console.log(`   Name: ${user.firstName} ${user.lastName}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   ID: ${user._id}`)
      console.log('')
    })

    // Check specifically for admin
    const admin = await User.findOne({ email: 'admin@kampuskart.com' })
    if (admin) {
      console.log('✅ Admin user EXISTS in database')
      console.log(`   Email: ${admin.email}`)
      console.log(`   Role: ${admin.role}`)
    } else {
      console.log('❌ Admin user NOT FOUND in database')
    }

    await mongoose.disconnect()
    console.log('\n👋 Disconnected from MongoDB')
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

listUsers()

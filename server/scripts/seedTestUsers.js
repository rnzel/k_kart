const mongoose = require('mongoose');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function seedTestUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27014/kampuskart');
    console.log('Connected to MongoDB');

    const usersCount = 100;
    const password = 'TestPassword123!';
    const credentials = [['email', 'password']];
    const userDocs = [];

    // Check if test users already exist to avoid duplicates
    const existingTestUsers = await User.find({ email: /testuser.*@example\.com/ });
    if (existingTestUsers.length > 0) {
      console.log(`Found ${existingTestUsers.length} existing test users. Deleting them...`);
      await User.deleteMany({ email: /testuser.*@example\.com/ });
    }

    console.log(`Generating ${usersCount} test users...`);

    for (let i = 1; i <= usersCount; i++) {
      const email = `testuser${i}@example.com`;
      userDocs.push({
        firstName: 'Test',
        lastName: `User${i}`,
        email: email,
        password: password, // Will be hashed by pre-save middleware
        role: 'buyer',
        isVerified: true
      });
      credentials.push([email, password]);
    }

    // Insert users one by one to trigger pre-save middleware for hashing
    for (const userDoc of userDocs) {
      await User.create(userDoc);
    }

    console.log(`Successfully created ${usersCount} test users.`);

    // Write CSV file
    const csvContent = credentials.map(row => row.join(',')).join('\n');
    const csvPath = path.join(__dirname, '../../user-credentials.csv');
    fs.writeFileSync(csvPath, csvContent);
    console.log(`Created credentials file at: ${csvPath}`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding test users:', error);
    process.exit(1);
  }
}

seedTestUsers();

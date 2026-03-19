const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Check products
    const products = await mongoose.connection.db.collection('products').find().toArray();
    console.log('Products found:', products.length);
    console.log('Products:', JSON.stringify(products, null, 2));
    
    // Check shops
    const shops = await mongoose.connection.db.collection('shops').find().toArray();
    console.log('Shops found:', shops.length);
    console.log('Shops:', JSON.stringify(shops, null, 2));
    
    mongoose.disconnect();
  })
  .catch(err => console.error('Error:', err));
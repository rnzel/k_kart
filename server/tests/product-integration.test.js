const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const User = require('../models/User');
const { getGridFSBucket } = require('../config/gridfsBucket');

describe('Product API Integration Tests', () => {
  let authToken;
  let sellerId;
  let shopId;
  let productId;

  beforeAll(async () => {
    // Wait for GridFS to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  beforeEach(async () => {
    // Clean up database
    await Product.deleteMany({});
    await Shop.deleteMany({});
    await User.deleteMany({});

    // Create test user
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'seller'
      });

    sellerId = userResponse.body.data.userId;
    authToken = userResponse.body.data.token;

    // Create test shop
    const shopResponse = await request(app)
      .post('/api/shops')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        shopName: 'Test Shop',
        shopDescription: 'Test shop description',
        shopLocation: 'Test Location',
        shopContact: '1234567890'
      });

    shopId = shopResponse.body.data._id;
  });

  afterEach(async () => {
    // Clean up after each test
    await Product.deleteMany({});
    await Shop.deleteMany({});
    await User.deleteMany({});
  });

  describe('POST /api/products', () => {
    it('should create a product successfully', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .field('productName', 'Test Product')
        .field('productDescription', 'Test product description')
        .field('productPrice', '100.00')
        .field('productStock', '10')
        .field('featuredImageIndex', '0');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.productName).toBe('Test Product');
      expect(response.body.data.productPrice).toBe(100);
      expect(response.body.data.productStock).toBe(10);
      expect(response.body.data.shop).toBe(shopId);
      
      productId = response.body.data._id;
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .field('productDescription', 'Test description');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate price and stock ranges', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .field('productName', 'Test Product')
        .field('productPrice', '-100')
        .field('productStock', '-5');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle file upload validation', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .field('productName', 'Test Product')
        .field('productPrice', '100')
        .attach('productImages', Buffer.from('fake file content'), 'test.txt');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Only image files are allowed');
    });
  });

  describe('GET /api/products/my-products', () => {
    beforeEach(async () => {
      // Create test product
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .field('productName', 'Test Product')
        .field('productPrice', '100');
    });

    it('should retrieve products for authenticated seller', async () => {
      const response = await request(app)
        .get('/api/products/my-products')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].productName).toBe('Test Product');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/products/my-products');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/products/update-product/:id', () => {
    beforeEach(async () => {
      // Create test product
      const productResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .field('productName', 'Original Product')
        .field('productPrice', '100');

      productId = productResponse.body.data._id;
    });

    it('should update product successfully', async () => {
      const response = await request(app)
        .put(`/api/products/update-product/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .field('productName', 'Updated Product')
        .field('productPrice', '150')
        .field('productStock', '20');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.productName).toBe('Updated Product');
      expect(response.body.data.productPrice).toBe(150);
      expect(response.body.data.productStock).toBe(20);
    });

    it('should validate product updates', async () => {
      const response = await request(app)
        .put(`/api/products/update-product/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .field('productPrice', '-50');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle unauthorized access', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'otheruser',
          email: 'other@example.com',
          password: 'password123',
          role: 'seller'
        });

      const otherToken = otherUserResponse.body.data.token;

      const response = await request(app)
        .put(`/api/products/update-product/${productId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .field('productName', 'Hacked Product');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/products/delete-product/:id', () => {
    beforeEach(async () => {
      // Create test product
      const productResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .field('productName', 'Product to Delete')
        .field('productPrice', '100');

      productId = productResponse.body.data._id;
    });

    it('should delete product successfully', async () => {
      const response = await request(app)
        .delete(`/api/products/delete-product/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify product is deleted
      const deletedProduct = await Product.findById(productId);
      expect(deletedProduct).toBeNull();
    });

    it('should handle unauthorized deletion', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'otheruser',
          email: 'other@example.com',
          password: 'password123',
          role: 'seller'
        });

      const otherToken = otherUserResponse.body.data.token;

      const response = await request(app)
        .delete(`/api/products/delete-product/${productId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/products', () => {
    beforeEach(async () => {
      // Create multiple products
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .field('productName', 'Product 1')
        .field('productPrice', '100');

      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .field('productName', 'Product 2')
        .field('productPrice', '200');
    });

    it('should retrieve all products with pagination', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(2);
    });

    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=1');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.total).toBe(2);
      expect(response.body.pagination.totalPages).toBe(2);
    });
  });

  describe('GET /api/products/:id', () => {
    beforeEach(async () => {
      const productResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .field('productName', 'Test Product')
        .field('productPrice', '100');

      productId = productResponse.body.data._id;
    });

    it('should retrieve product by ID', async () => {
      const response = await request(app)
        .get(`/api/products/${productId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.productName).toBe('Test Product');
      expect(response.body.data.shop.shopName).toBe('Test Shop');
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/products/507f1f77bcf86cd799439011');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('File Upload Performance', () => {
    it('should handle multiple concurrent uploads', async () => {
      const startTime = Date.now();
      
      const uploadPromises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/products')
          .set('Authorization', `Bearer ${authToken}`)
          .field('productName', `Product ${i}`)
          .field('productPrice', '100')
          .attach('productImages', Buffer.from('fake image content'), `test${i}.jpg`)
      );

      const responses = await Promise.all(uploadPromises);
      const endTime = Date.now();

      // All uploads should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Should complete within reasonable time (less than 30 seconds)
      expect(endTime - startTime).toBeLessThan(30000);
    }, 30000);

    it('should handle large file rejection gracefully', async () => {
      // Create a large file buffer (6MB)
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .field('productName', 'Large Product')
        .field('productPrice', '100')
        .attach('productImages', largeBuffer, 'large.jpg');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('File too large');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Temporarily close mongoose connection
      await mongoose.connection.close();

      const response = await request(app)
        .get('/api/products');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);

      // Reconnect for cleanup
      await mongoose.connect(process.env.MONGODB_URI);
    });

    it('should handle malformed requests', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });
});

module.exports = {
  // Export test utilities for other test files
  createTestUser: async (app, userData = {}) => {
    const defaultData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'seller'
    };
    
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...defaultData, ...userData });
    
    return response.body.data;
  },
  
  createTestShop: async (app, authToken, shopData = {}) => {
    const defaultData = {
      shopName: 'Test Shop',
      shopDescription: 'Test shop description',
      shopLocation: 'Test Location',
      shopContact: '1234567890'
    };
    
    const response = await request(app)
      .post('/api/shops')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ...defaultData, ...shopData });
    
    return response.body.data;
  }
};
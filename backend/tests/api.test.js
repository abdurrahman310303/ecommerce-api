const request = require('supertest');
const app = require('../server');

describe('E-Commerce API Tests', () => {
  let authToken;
  let userId;
  let productId;

  test('Health check endpoint', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Server is running');
  });

  test('Register new user', async () => {
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@test.com',
      password: 'Test123!',
      confirmPassword: 'Test123!'
    };

    const res = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(userData.email);
    authToken = res.body.data.token;
    userId = res.body.data.user._id;
  });

  test('Login user', async () => {
    const loginData = {
      email: 'john.doe@test.com',
      password: 'Test123!'
    };

    const res = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(loginData.email);
  });

  test('Get products', async () => {
    const res = await request(app)
      .get('/api/products')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.products)).toBe(true);
  });

  test('Create product (admin)', async () => {
    const productData = {
      name: 'Test Product',
      description: 'This is a test product',
      price: 99.99,
      category: 'Electronics',
      inventory: 50,
      brand: 'TestBrand'
    };

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send(productData)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.product.name).toBe(productData.name);
    productId = res.body.data.product._id;
  });

  test('Add to cart', async () => {
    const cartData = {
      productId: productId,
      quantity: 2
    };

    const res = await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${authToken}`)
      .send(cartData)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  test('Get cart', async () => {
    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.cart.items.length).toBeGreaterThan(0);
  });

  test('Search products', async () => {
    const res = await request(app)
      .get('/api/search?q=test')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.products)).toBe(true);
  });
});

module.exports = app;

const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
require('dotenv').config();

const seedData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce');
    console.log('Connected to MongoDB');

    console.log('Updating admin user...');
    await User.updateOne(
      { email: 'admin@test.com' },
      { role: 'admin' }
    );
    console.log('Admin user updated');

    console.log('Creating categories...');
    const categories = [
      { name: 'Electronics', description: 'Electronic devices and gadgets' },
      { name: 'Clothing', description: 'Fashion and apparel' },
      { name: 'Books', description: 'Books and literature' },
      { name: 'Sports', description: 'Sports and fitness equipment' }
    ];

    for (const categoryData of categories) {
      const existing = await Category.findOne({ name: categoryData.name });
      if (!existing) {
        await Category.create(categoryData);
        console.log(`Category ${categoryData.name} created`);
      }
    }

    console.log('Creating products...');
    const electronicsCategory = await Category.findOne({ name: 'Electronics' });
    const clothingCategory = await Category.findOne({ name: 'Clothing' });

    const products = [
      {
        name: 'MacBook Pro 16"',
        description: 'Powerful laptop for professionals',
        price: 2499.99,
        category: electronicsCategory._id,
        brand: 'Apple',
        quantity: 25,
        images: [{
          public_id: 'laptop1',
          url: '/images/laptop1.jpg',
          alt: 'MacBook Pro 16 inch'
        }],
        specifications: {
          processor: 'M2 Pro',
          memory: '16GB',
          storage: '512GB SSD'
        }
      },
      {
        name: 'iPhone 15 Pro',
        description: 'Latest smartphone with advanced features',
        price: 999.99,
        category: electronicsCategory._id,
        brand: 'Apple',
        quantity: 50,
        images: [{
          public_id: 'phone1',
          url: '/images/phone1.jpg',
          alt: 'iPhone 15 Pro'
        }]
      },
      {
        name: 'Premium T-Shirt',
        description: 'Comfortable cotton t-shirt',
        price: 29.99,
        category: clothingCategory._id,
        brand: 'FashionCo',
        quantity: 100,
        images: [{
          public_id: 'tshirt1',
          url: '/images/tshirt1.jpg',
          alt: 'Premium T-Shirt'
        }],
        sizes: ['S', 'M', 'L', 'XL']
      }
    ];

    for (const productData of products) {
      const existing = await Product.findOne({ name: productData.name });
      if (!existing) {
        await Product.create(productData);
        console.log(`Product ${productData.name} created`);
      }
    }

    console.log('Seed data created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();

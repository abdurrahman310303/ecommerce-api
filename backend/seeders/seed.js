const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for seeding');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const seedUsers = async () => {
  try {
    await User.deleteMany();

    const adminPassword = await bcrypt.hash('admin123', 12);
    const userPassword = await bcrypt.hash('user123', 12);

    const users = [
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@ecommerce.com',
        password: adminPassword,
        role: 'admin',
        isVerified: true
      },
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: userPassword,
        role: 'user',
        isVerified: true
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: userPassword,
        role: 'user',
        isVerified: true
      }
    ];

    await User.insertMany(users);
    console.log('Users seeded successfully');
  } catch (error) {
    console.error('Error seeding users:', error);
  }
};

const seedCategories = async () => {
  try {
    await Category.deleteMany();

    const categories = [
      {
        name: 'Electronics',
        description: 'Electronic devices and gadgets',
        slug: 'electronics'
      },
      {
        name: 'Clothing',
        description: 'Fashion and apparel',
        slug: 'clothing'
      },
      {
        name: 'Books',
        description: 'Books and literature',
        slug: 'books'
      },
      {
        name: 'Home & Garden',
        description: 'Home improvement and garden supplies',
        slug: 'home-garden'
      },
      {
        name: 'Sports',
        description: 'Sports equipment and gear',
        slug: 'sports'
      }
    ];

    const createdCategories = await Category.insertMany(categories);
    console.log('Categories seeded successfully');
    return createdCategories;
  } catch (error) {
    console.error('Error seeding categories:', error);
  }
};

const seedProducts = async (categories) => {
  try {
    await Product.deleteMany();

    const products = [
      {
        name: 'Wireless Bluetooth Headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        price: 99.99,
        category: categories[0]._id,
        brand: 'AudioTech',
        quantity: 50,
        images: [{
          url: 'https://via.placeholder.com/400x400?text=Headphones',
          alt: 'Wireless Headphones'
        }],
        isFeatured: true,
        tags: ['wireless', 'bluetooth', 'audio', 'headphones']
      },
      {
        name: 'Cotton T-Shirt',
        description: 'Comfortable 100% cotton t-shirt available in multiple colors',
        price: 19.99,
        category: categories[1]._id,
        brand: 'ComfortWear',
        quantity: 100,
        images: [{
          url: 'https://via.placeholder.com/400x400?text=T-Shirt',
          alt: 'Cotton T-Shirt'
        }],
        tags: ['cotton', 'tshirt', 'clothing', 'casual']
      },
      {
        name: 'Programming Book Collection',
        description: 'Complete guide to modern programming languages',
        price: 49.99,
        category: categories[2]._id,
        brand: 'TechBooks',
        quantity: 25,
        images: [{
          url: 'https://via.placeholder.com/400x400?text=Programming+Book',
          alt: 'Programming Book'
        }],
        tags: ['programming', 'book', 'education', 'technology']
      },
      {
        name: 'Garden Tool Set',
        description: 'Complete set of garden tools for home gardening',
        price: 79.99,
        category: categories[3]._id,
        brand: 'GreenThumb',
        quantity: 30,
        images: [{
          url: 'https://via.placeholder.com/400x400?text=Garden+Tools',
          alt: 'Garden Tool Set'
        }],
        tags: ['garden', 'tools', 'home', 'outdoor']
      },
      {
        name: 'Professional Basketball',
        description: 'Official size basketball for indoor and outdoor play',
        price: 29.99,
        category: categories[4]._id,
        brand: 'SportsPro',
        quantity: 40,
        images: [{
          url: 'https://via.placeholder.com/400x400?text=Basketball',
          alt: 'Professional Basketball'
        }],
        isFeatured: true,
        tags: ['basketball', 'sports', 'outdoor', 'fitness']
      }
    ];

    await Product.insertMany(products);
    console.log('Products seeded successfully');
  } catch (error) {
    console.error('Error seeding products:', error);
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();
    
    await seedUsers();
    const categories = await seedCategories();
    await seedProducts(categories);
    
    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, seedUsers, seedCategories, seedProducts };

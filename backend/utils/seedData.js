const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { generateSKU } = require('../utils/helpers');

const seedUsers = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      const admin = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@ecommerce.com',
        password: 'admin123',
        role: 'admin',
        isVerified: true
      });
      
      await admin.save();
      console.log('Admin user created');
    }

    const vendorExists = await User.findOne({ role: 'vendor' });
    
    if (!vendorExists) {
      const vendor = new User({
        firstName: 'Vendor',
        lastName: 'User',
        email: 'vendor@ecommerce.com',
        password: 'vendor123',
        role: 'vendor',
        isVerified: true
      });
      
      await vendor.save();
      console.log('Vendor user created');
    }

    const customerExists = await User.findOne({ role: 'user' });
    
    if (!customerExists) {
      const customer = new User({
        firstName: 'John',
        lastName: 'Doe',
        email: 'customer@ecommerce.com',
        password: 'customer123',
        role: 'user',
        isVerified: true,
        addresses: [{
          type: 'home',
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
          isDefault: true
        }]
      });
      
      await customer.save();
      console.log('Customer user created');
    }
  } catch (error) {
    console.error('Error seeding users:', error);
  }
};

const seedCategories = async () => {
  try {
    const categoriesCount = await Category.countDocuments();
    
    if (categoriesCount === 0) {
      const categories = [
        {
          name: 'Electronics',
          description: 'Electronic devices and gadgets',
          slug: 'electronics',
          isActive: true,
          sortOrder: 1
        },
        {
          name: 'Clothing',
          description: 'Fashion and apparel',
          slug: 'clothing',
          isActive: true,
          sortOrder: 2
        },
        {
          name: 'Books',
          description: 'Books and educational materials',
          slug: 'books',
          isActive: true,
          sortOrder: 3
        },
        {
          name: 'Home & Garden',
          description: 'Home improvement and garden supplies',
          slug: 'home-garden',
          isActive: true,
          sortOrder: 4
        },
        {
          name: 'Sports',
          description: 'Sports equipment and accessories',
          slug: 'sports',
          isActive: true,
          sortOrder: 5
        }
      ];

      await Category.insertMany(categories);
      console.log('Categories seeded successfully');

      const electronicsCategory = await Category.findOne({ slug: 'electronics' });
      const clothingCategory = await Category.findOne({ slug: 'clothing' });

      const subcategories = [
        {
          name: 'Smartphones',
          description: 'Mobile phones and accessories',
          slug: 'smartphones',
          parent: electronicsCategory._id,
          isActive: true,
          sortOrder: 1
        },
        {
          name: 'Laptops',
          description: 'Portable computers',
          slug: 'laptops',
          parent: electronicsCategory._id,
          isActive: true,
          sortOrder: 2
        },
        {
          name: "Men's Clothing",
          description: 'Clothing for men',
          slug: 'mens-clothing',
          parent: clothingCategory._id,
          isActive: true,
          sortOrder: 1
        },
        {
          name: "Women's Clothing",
          description: 'Clothing for women',
          slug: 'womens-clothing',
          parent: clothingCategory._id,
          isActive: true,
          sortOrder: 2
        }
      ];

      const createdSubcategories = await Category.insertMany(subcategories);
      
      await Category.findByIdAndUpdate(electronicsCategory._id, {
        $push: { children: { $each: [createdSubcategories[0]._id, createdSubcategories[1]._id] } }
      });
      
      await Category.findByIdAndUpdate(clothingCategory._id, {
        $push: { children: { $each: [createdSubcategories[2]._id, createdSubcategories[3]._id] } }
      });

      console.log('Subcategories seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding categories:', error);
  }
};

const seedProducts = async () => {
  try {
    const productsCount = await Product.countDocuments();
    
    if (productsCount === 0) {
      const categories = await Category.find();
      const vendor = await User.findOne({ role: 'vendor' });
      
      if (!vendor || categories.length === 0) {
        console.log('Cannot seed products: vendor or categories not found');
        return;
      }

      const smartphoneCategory = categories.find(cat => cat.slug === 'smartphones');
      const laptopCategory = categories.find(cat => cat.slug === 'laptops');
      const mensClothingCategory = categories.find(cat => cat.slug === 'mens-clothing');
      const booksCategory = categories.find(cat => cat.slug === 'books');

      const products = [
        {
          name: 'iPhone 14 Pro',
          description: 'Latest Apple smartphone with advanced camera system and A16 Bionic chip.',
          price: 999.99,
          comparePrice: 1099.99,
          quantity: 50,
          category: smartphoneCategory?._id || categories[0]._id,
          brand: 'Apple',
          sku: generateSKU('iPhone 14 Pro', 'Electronics'),
          images: [
            { url: 'https://example.com/iphone14pro.jpg', alt: 'iPhone 14 Pro' }
          ],
          tags: ['smartphone', 'apple', 'ios', 'camera'],
          specifications: [
            { name: 'Screen Size', value: '6.1 inches' },
            { name: 'Storage', value: '128GB' },
            { name: 'RAM', value: '6GB' },
            { name: 'Camera', value: '48MP + 12MP + 12MP' }
          ],
          vendor: vendor._id,
          isActive: true,
          isFeatured: true
        },
        {
          name: 'MacBook Pro 13"',
          description: 'Powerful laptop with M2 chip, perfect for professional work.',
          price: 1299.99,
          comparePrice: 1399.99,
          quantity: 25,
          category: laptopCategory?._id || categories[0]._id,
          brand: 'Apple',
          sku: generateSKU('MacBook Pro 13', 'Electronics'),
          images: [
            { url: 'https://example.com/macbookpro13.jpg', alt: 'MacBook Pro 13' }
          ],
          tags: ['laptop', 'apple', 'macbook', 'm2'],
          specifications: [
            { name: 'Processor', value: 'Apple M2 chip' },
            { name: 'RAM', value: '8GB' },
            { name: 'Storage', value: '256GB SSD' },
            { name: 'Display', value: '13.3-inch Retina' }
          ],
          vendor: vendor._id,
          isActive: true,
          isFeatured: true
        },
        {
          name: 'Classic T-Shirt',
          description: 'Comfortable cotton t-shirt for everyday wear.',
          price: 29.99,
          comparePrice: 39.99,
          quantity: 100,
          category: mensClothingCategory?._id || categories[1]._id,
          brand: 'BasicWear',
          sku: generateSKU('Classic T-Shirt', 'Clothing'),
          images: [
            { url: 'https://example.com/tshirt.jpg', alt: 'Classic T-Shirt' }
          ],
          tags: ['t-shirt', 'cotton', 'casual', 'mens'],
          variants: [
            { name: 'Size', values: ['S', 'M', 'L', 'XL'] },
            { name: 'Color', values: ['Black', 'White', 'Navy', 'Gray'] }
          ],
          vendor: vendor._id,
          isActive: true
        },
        {
          name: 'JavaScript: The Good Parts',
          description: 'Essential guide to JavaScript programming best practices.',
          price: 24.99,
          quantity: 75,
          category: booksCategory?._id || categories[2]._id,
          brand: 'O\'Reilly Media',
          sku: generateSKU('JavaScript Book', 'Books'),
          images: [
            { url: 'https://example.com/jsbook.jpg', alt: 'JavaScript Book' }
          ],
          tags: ['book', 'javascript', 'programming', 'web development'],
          specifications: [
            { name: 'Pages', value: '176' },
            { name: 'Author', value: 'Douglas Crockford' },
            { name: 'Publisher', value: 'O\'Reilly Media' },
            { name: 'Language', value: 'English' }
          ],
          vendor: vendor._id,
          isActive: true
        }
      ];

      await Product.insertMany(products);
      console.log('Products seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding products:', error);
  }
};

const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');
    await seedUsers();
    await seedCategories();
    await seedProducts();
    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

module.exports = {
  seedDatabase,
  seedUsers,
  seedCategories,
  seedProducts
};

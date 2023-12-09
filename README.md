# E-Commerce API

A comprehensive e-commerce backend API built with Node.js, Express, and MongoDB.

## Features

- User authentication and authorization
- Product management with categories
- Shopping cart functionality
- Order processing and tracking
- Review and rating system
- Wishlist management
- Coupon and discount system
- Admin dashboard
- Analytics and reporting
- Email notifications
- Payment integration with Stripe
- Image upload and management
- Advanced search and filtering
- Recommendation engine
- Customer segmentation
- Backup and restore system

## Technology Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Stripe for payments
- Multer for file uploads
- Nodemailer for emails
- bcryptjs for password hashing

## Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies: npm install
4. Set up environment variables
5. Start the server: npm start

## Environment Variables

Create a .env file in the backend directory:

```
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30
STRIPE_SECRET_KEY=your_stripe_secret_key
EMAIL_HOST=your_email_host
EMAIL_PORT=your_email_port
EMAIL_USERNAME=your_email_username
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=your_email_from
```

## API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - User login
- GET /api/auth/logout - User logout
- GET /api/auth/me - Get current user
- PUT /api/auth/updatedetails - Update user details
- PUT /api/auth/updatepassword - Update password

### Products
- GET /api/products - Get all products
- GET /api/products/:id - Get single product
- POST /api/products - Create product (Admin)
- PUT /api/products/:id - Update product (Admin)
- DELETE /api/products/:id - Delete product (Admin)

### Orders
- GET /api/orders - Get user orders
- GET /api/orders/:id - Get single order
- POST /api/orders - Create order
- PUT /api/orders/:id - Update order status (Admin)

### Cart
- GET /api/cart - Get user cart
- POST /api/cart - Add item to cart
- PUT /api/cart/:id - Update cart item
- DELETE /api/cart/:id - Remove item from cart

### Categories
- GET /api/categories - Get all categories
- POST /api/categories - Create category (Admin)
- PUT /api/categories/:id - Update category (Admin)
- DELETE /api/categories/:id - Delete category (Admin)

### Reviews
- GET /api/reviews - Get reviews
- POST /api/reviews - Create review
- PUT /api/reviews/:id - Update review
- DELETE /api/reviews/:id - Delete review

### Admin
- GET /api/admin/users - Get all users
- GET /api/admin/stats - Get dashboard stats
- GET /api/admin/reports - Generate reports

## License

This project is licensed under the MIT License.

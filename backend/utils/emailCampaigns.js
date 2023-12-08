const nodemailer = require('nodemailer');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { segmentCustomers, getChurnRiskScore } = require('./customerSegmentation');

const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

const sendAbandonedCartEmail = async (userId, cartItems) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.email) return;

    const transporter = createTransporter();
    
    const itemsHtml = cartItems.map(item => `
      <div style="display: flex; align-items: center; margin-bottom: 15px; padding: 15px; border: 1px solid #eee;">
        <img src="${item.product.images[0]?.url || '/placeholder.jpg'}" alt="${item.product.name}" 
             style="width: 80px; height: 80px; object-fit: cover; margin-right: 15px;">
        <div>
          <h4 style="margin: 0 0 5px 0;">${item.product.name}</h4>
          <p style="margin: 0; color: #666;">Quantity: ${item.quantity}</p>
          <p style="margin: 5px 0 0 0; font-weight: bold; color: #333;">$${(item.product.price * item.quantity).toFixed(2)}</p>
        </div>
      </div>
    `).join('');

    const totalValue = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    await transporter.sendMail({
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: user.email,
      subject: "Don't forget about your cart!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${user.firstName}!</h2>
          <p>You left some great items in your cart. Complete your purchase before they're gone!</p>
          
          <div style="margin: 20px 0;">
            ${itemsHtml}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 18px; font-weight: bold;">Total: $${totalValue.toFixed(2)}</p>
            <a href="${process.env.CLIENT_URL}/cart" 
               style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Complete Purchase
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">This offer is valid for a limited time. Don't miss out!</p>
        </div>
      `
    });

    console.log(`Abandoned cart email sent to ${user.email}`);
  } catch (error) {
    console.error('Error sending abandoned cart email:', error);
  }
};

const sendWinBackCampaign = async () => {
  try {
    const segments = await segmentCustomers();
    const atRiskCustomers = segments.at_risk_customers;

    for (const customer of atRiskCustomers) {
      const churnRisk = await getChurnRiskScore(customer.userId);
      
      if (churnRisk.riskLevel === 'high') {
        await sendWinBackEmail(customer);
      }
    }

    console.log(`Win-back campaign sent to ${atRiskCustomers.length} customers`);
  } catch (error) {
    console.error('Error in win-back campaign:', error);
  }
};

const sendWinBackEmail = async (customer) => {
  try {
    const transporter = createTransporter();
    
    const recentProducts = await Product.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('category', 'name');

    const productsHtml = recentProducts.map(product => `
      <div style="text-align: center; margin: 20px;">
        <img src="${product.images[0]?.url || '/placeholder.jpg'}" alt="${product.name}"
             style="width: 150px; height: 150px; object-fit: cover;">
        <h4>${product.name}</h4>
        <p style="color: #007bff; font-weight: bold;">$${product.price}</p>
      </div>
    `).join('');

    await transporter.sendMail({
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: customer.email,
      subject: "We miss you! Here's 20% off your next order",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>We miss you, ${customer.firstName}!</h2>
          <p>It's been a while since your last order. Come back and see what's new!</p>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
            <h3 style="color: #007bff;">Special Offer Just for You!</h3>
            <p style="font-size: 24px; font-weight: bold; color: #28a745;">20% OFF</p>
            <p>Use code: <strong>WELCOME20</strong></p>
          </div>
          
          <h3>Check out our latest products:</h3>
          <div style="display: flex; justify-content: space-around;">
            ${productsHtml}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/products" 
               style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
              Shop Now
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">This offer expires in 7 days. Don't miss out!</p>
        </div>
      `
    });
  } catch (error) {
    console.error('Error sending win-back email:', error);
  }
};

const sendPersonalizedRecommendations = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.email) return;

    const userOrders = await Order.find({ userId })
      .populate('items.productId')
      .sort({ createdAt: -1 })
      .limit(5);

    if (userOrders.length === 0) return;

    const purchasedCategories = new Set();
    userOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.productSnapshot && item.productSnapshot.category) {
          purchasedCategories.add(item.productSnapshot.category);
        }
      });
    });

    const recommendedProducts = await Product.find({
      category: { $in: Array.from(purchasedCategories) },
      isActive: true,
      quantity: { $gt: 0 }
    })
    .sort({ rating: -1, createdAt: -1 })
    .limit(4)
    .populate('category', 'name');

    if (recommendedProducts.length === 0) return;

    const transporter = createTransporter();
    
    const productsHtml = recommendedProducts.map(product => `
      <div style="text-align: center; margin: 15px; flex: 1;">
        <img src="${product.images[0]?.url || '/placeholder.jpg'}" alt="${product.name}"
             style="width: 120px; height: 120px; object-fit: cover;">
        <h4 style="margin: 10px 0 5px 0;">${product.name}</h4>
        <p style="color: #666; margin: 0;">${product.category.name}</p>
        <p style="color: #007bff; font-weight: bold; margin: 5px 0;">$${product.price}</p>
      </div>
    `).join('');

    await transporter.sendMail({
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: user.email,
      subject: "Products you might love!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${user.firstName}!</h2>
          <p>Based on your recent purchases, we think you'll love these products:</p>
          
          <div style="display: flex; flex-wrap: wrap; justify-content: space-around; margin: 20px 0;">
            ${productsHtml}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/products" 
               style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
              Explore More
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">Happy shopping!</p>
        </div>
      `
    });

    console.log(`Personalized recommendations sent to ${user.email}`);
  } catch (error) {
    console.error('Error sending personalized recommendations:', error);
  }
};

const sendBirthdayOffer = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.email || !user.dateOfBirth) return;

    const today = new Date();
    const birthday = new Date(user.dateOfBirth);
    
    if (today.getMonth() !== birthday.getMonth() || today.getDate() !== birthday.getDate()) {
      return;
    }

    const transporter = createTransporter();
    
    await transporter.sendMail({
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: user.email,
      subject: `Happy Birthday ${user.firstName}! 🎉`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
          <h1 style="color: #ff6b6b;">🎉 Happy Birthday ${user.firstName}! 🎉</h1>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin: 20px 0;">
            <h2>Special Birthday Gift for You!</h2>
            <p style="font-size: 28px; font-weight: bold;">25% OFF</p>
            <p>Use code: <strong>BIRTHDAY25</strong></p>
            <p style="font-size: 14px;">Valid for 7 days from today</p>
          </div>
          
          <p style="font-size: 18px;">Treat yourself to something special on your big day!</p>
          
          <div style="margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/products" 
               style="background: #ff6b6b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-size: 16px;">
              Start Shopping
            </a>
          </div>
          
          <p style="color: #666;">Have a wonderful birthday celebration! 🎂</p>
        </div>
      `
    });

    console.log(`Birthday offer sent to ${user.email}`);
  } catch (error) {
    console.error('Error sending birthday offer:', error);
  }
};

module.exports = {
  sendAbandonedCartEmail,
  sendWinBackCampaign,
  sendPersonalizedRecommendations,
  sendBirthdayOffer
};

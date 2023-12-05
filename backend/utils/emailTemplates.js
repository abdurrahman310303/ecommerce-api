const nodemailer = require('nodemailer');

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

const sendWelcomeEmail = async (user) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: user.email,
    subject: 'Welcome to Our E-Commerce Store!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome ${user.firstName}!</h2>
        <p>Thank you for joining our e-commerce platform. We're excited to have you on board!</p>
        <p>You can now:</p>
        <ul>
          <li>Browse thousands of products</li>
          <li>Add items to your wishlist</li>
          <li>Enjoy fast and secure checkout</li>
          <li>Track your orders in real-time</li>
        </ul>
        <p>Happy shopping!</p>
        <p>Best regards,<br>The E-Commerce Team</p>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};

const sendOrderConfirmation = async (user, order) => {
  const transporter = createTransporter();
  
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.productSnapshot?.name || 'Product'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const mailOptions = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: user.email,
    subject: `Order Confirmation - ${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Confirmation</h2>
        <p>Hi ${user.firstName},</p>
        <p>Thank you for your order! Here are the details:</p>
        
        <div style="background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3>Order #${order.orderNumber}</h3>
          <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          <p><strong>Total Amount:</strong> $${order.totalPrice.toFixed(2)}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="background: #f9f9f9; padding: 15px; margin: 20px 0;">
          <p><strong>Shipping Address:</strong></p>
          <p>${order.shippingAddress.firstName} ${order.shippingAddress.lastName}<br>
          ${order.shippingAddress.street}<br>
          ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}<br>
          ${order.shippingAddress.country}</p>
        </div>

        <p>We'll send you another email when your order ships.</p>
        <p>Thanks for shopping with us!</p>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};

const sendOrderStatusUpdate = async (user, order, status) => {
  const transporter = createTransporter();
  
  let statusMessage = '';
  let subject = '';

  switch (status) {
    case 'confirmed':
      subject = 'Order Confirmed';
      statusMessage = 'Your order has been confirmed and is being prepared.';
      break;
    case 'processing':
      subject = 'Order Processing';
      statusMessage = 'Your order is currently being processed.';
      break;
    case 'shipped':
      subject = 'Order Shipped';
      statusMessage = `Your order has been shipped! ${order.shippingInfo?.trackingNumber ? `Tracking number: ${order.shippingInfo.trackingNumber}` : ''}`;
      break;
    case 'delivered':
      subject = 'Order Delivered';
      statusMessage = 'Your order has been delivered. We hope you enjoy your purchase!';
      break;
    default:
      subject = 'Order Update';
      statusMessage = `Your order status has been updated to: ${status}`;
  }

  const mailOptions = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: user.email,
    subject: `${subject} - ${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${subject}</h2>
        <p>Hi ${user.firstName},</p>
        <p>${statusMessage}</p>
        
        <div style="background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3>Order #${order.orderNumber}</h3>
          <p><strong>Status:</strong> ${status.charAt(0).toUpperCase() + status.slice(1)}</p>
          <p><strong>Total Amount:</strong> $${order.totalPrice.toFixed(2)}</p>
        </div>

        <p>You can track your order status by logging into your account.</p>
        <p>Thank you for shopping with us!</p>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};

const sendPasswordResetEmail = async (user, resetToken) => {
  const transporter = createTransporter();
  
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  const mailOptions = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: user.email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${user.firstName},</p>
        <p>You requested to reset your password. Click the button below to reset it:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        
        <p><strong>This link will expire in 10 minutes.</strong></p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = {
  sendWelcomeEmail,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendPasswordResetEmail
};

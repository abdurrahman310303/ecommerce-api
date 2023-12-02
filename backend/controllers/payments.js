const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');

exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = 'usd', orderId } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: {
        userId: req.user.id,
        orderId: orderId || ''
      }
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          'paymentInfo.paymentStatus': 'paid',
          'paymentInfo.transactionId': paymentIntentId,
          'paymentInfo.paidAt': new Date()
        });
      }

      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        paymentIntent
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment not successful'
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.refundPayment = async (req, res) => {
  try {
    const { paymentIntentId, amount } = req.body;

    const refundData = {
      payment_intent: paymentIntentId
    };

    if (amount) {
      refundData.amount = Math.round(amount * 100);
    }

    const refund = await stripe.refunds.create(refundData);

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      refund
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.createPaypalOrder = async (req, res) => {
  try {
    const { amount, currency = 'USD' } = req.body;

    res.status(200).json({
      success: true,
      message: 'PayPal integration would be implemented here',
      orderData: {
        amount,
        currency,
        userId: req.user.id
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.capturePaypalOrder = async (req, res) => {
  try {
    const { orderID } = req.body;

    res.status(200).json({
      success: true,
      message: 'PayPal capture would be implemented here',
      orderID
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const payments = await Order.find({
      user: req.user.id,
      'paymentInfo.paymentStatus': { $in: ['paid', 'refunded', 'partially_refunded'] }
    })
      .select('orderNumber totalPrice paymentInfo createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments({
      user: req.user.id,
      'paymentInfo.paymentStatus': { $in: ['paid', 'refunded', 'partially_refunded'] }
    });

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      payments
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

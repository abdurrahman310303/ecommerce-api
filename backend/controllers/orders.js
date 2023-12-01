const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

exports.createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      billingAddress,
      paymentInfo,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      coupon
    } = req.body;

    const orderItems = [];
    
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product}`
        });
      }

      if (product.trackQuantity && product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`
        });
      }

      orderItems.push({
        product: item.product,
        quantity: item.quantity,
        price: product.price,
        variant: item.variant,
        productSnapshot: {
          name: product.name,
          image: product.images[0]?.url,
          sku: product.sku
        }
      });

      if (product.trackQuantity) {
        product.quantity -= item.quantity;
        await product.save();
      }
    }

    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentInfo,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      coupon
    });

    await Cart.findOneAndDelete({ user: req.user.id });

    const populatedOrder = await Order.findById(order._id)
      .populate('items.product', 'name images')
      .populate('user', 'firstName lastName email');

    res.status(201).json({
      success: true,
      order: populatedOrder
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (req.user.role !== 'admin') {
      query.user = req.user.id;
    }

    if (req.query.status) {
      query.orderStatus = req.query.status;
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('items.product', 'name images')
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      orders
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name images')
      .populate('user', 'firstName lastName email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order'
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.statusHistory.push({
      status: order.orderStatus,
      date: new Date(),
      note: `Status changed from ${order.orderStatus} to ${status}`
    });

    order.orderStatus = status;

    if (status === 'shipped') {
      order.shippingInfo.shippedAt = new Date();
    } else if (status === 'delivered') {
      order.deliveredAt = new Date();
      order.paymentInfo.paymentStatus = 'paid';
      order.paymentInfo.paidAt = new Date();
    }

    if (note) {
      order.notes = note;
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    if (['shipped', 'delivered'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order that has been shipped or delivered'
      });
    }

    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product && product.trackQuantity) {
        product.quantity += item.quantity;
        await product.save();
      }
    }

    order.orderStatus = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      date: new Date(),
      note: 'Order cancelled by user'
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getOrderStats = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalPrice' }
        }
      }
    ]);

    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      {
        $match: { orderStatus: { $in: ['delivered', 'shipped'] } }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalPrice' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        statusBreakdown: stats
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

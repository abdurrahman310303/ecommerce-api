const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const Cart = require('../models/Cart');

exports.getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id })
      .populate('items.product', 'name price images quantity isActive');

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        wishlist: {
          items: [],
          totalItems: 0
        }
      });
    }

    const validItems = wishlist.items.filter(item => 
      item.product && item.product.isActive
    );

    if (validItems.length !== wishlist.items.length) {
      wishlist.items = validItems;
      await wishlist.save();
    }

    res.status(200).json({
      success: true,
      wishlist
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.addToWishlist = async (req, res) => {
  try {
    const productId = req.params.productId;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      wishlist = new Wishlist({
        user: req.user.id,
        items: []
      });
    }

    const existingItem = wishlist.items.find(
      item => item.product.toString() === productId
    );

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    wishlist.items.push({ product: productId });
    await wishlist.save();

    await wishlist.populate('items.product', 'name price images quantity isActive');

    res.status(200).json({
      success: true,
      message: 'Product added to wishlist',
      wishlist
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const productId = req.params.productId;

    const wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    wishlist.items = wishlist.items.filter(
      item => item.product.toString() !== productId
    );

    await wishlist.save();
    await wishlist.populate('items.product', 'name price images quantity isActive');

    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist',
      wishlist
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.clearWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    wishlist.items = [];
    wishlist.totalItems = 0;
    await wishlist.save();

    res.status(200).json({
      success: true,
      message: 'Wishlist cleared',
      wishlist
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.moveToCart = async (req, res) => {
  try {
    const productId = req.params.productId;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.trackQuantity && product.quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Product out of stock'
      });
    }

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    const existingCartItem = cart.items.find(
      item => item.product.toString() === productId
    );

    if (existingCartItem) {
      existingCartItem.quantity += 1;
    } else {
      cart.items.push({
        product: productId,
        quantity: 1
      });
    }

    await cart.save();

    const wishlist = await Wishlist.findOne({ user: req.user.id });
    if (wishlist) {
      wishlist.items = wishlist.items.filter(
        item => item.product.toString() !== productId
      );
      await wishlist.save();
    }

    res.status(200).json({
      success: true,
      message: 'Product moved to cart successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

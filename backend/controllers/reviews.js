const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');

exports.createReview = async (req, res) => {
  try {
    const { productId, rating, title, comment } = req.body;

    const existingReview = await Review.findOne({
      product: productId,
      user: req.user.id
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const hasPurchased = await Order.findOne({
      user: req.user.id,
      'items.product': productId,
      orderStatus: 'delivered'
    });

    const review = await Review.create({
      product: productId,
      user: req.user.id,
      rating,
      title,
      comment,
      isVerifiedPurchase: !!hasPurchased
    });

    const reviews = await Review.find({ product: productId, isApproved: true });
    const totalRating = reviews.reduce((acc, item) => item.rating + acc, 0);
    const averageRating = totalRating / reviews.length;

    await Product.findByIdAndUpdate(productId, {
      'ratings.average': averageRating,
      'ratings.count': reviews.length,
      $push: { reviews: review._id }
    });

    const populatedReview = await Review.findById(review._id)
      .populate('user', 'firstName lastName avatar');

    res.status(201).json({
      success: true,
      review: populatedReview
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getProductReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const query = {
      product: req.params.productId,
      isApproved: true
    };

    if (req.query.rating) {
      query.rating = parseInt(req.query.rating);
    }

    const total = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .populate('user', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const ratingBreakdown = await Review.aggregate([
      { $match: { product: require('mongoose').Types.ObjectId(req.params.productId), isApproved: true } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      reviews,
      ratingBreakdown
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getUserReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Review.countDocuments({ user: req.user.id });
    const reviews = await Review.find({ user: req.user.id })
      .populate('product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      reviews
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }

    const updatedReview = await Review.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('user', 'firstName lastName avatar');

    if (req.body.rating) {
      const reviews = await Review.find({ product: review.product, isApproved: true });
      const totalRating = reviews.reduce((acc, item) => item.rating + acc, 0);
      const averageRating = totalRating / reviews.length;

      await Product.findByIdAndUpdate(review.product, {
        'ratings.average': averageRating
      });
    }

    res.status(200).json({
      success: true,
      review: updatedReview
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    await Review.findByIdAndDelete(req.params.id);

    await Product.findByIdAndUpdate(review.product, {
      $pull: { reviews: review._id }
    });

    const reviews = await Review.find({ product: review.product, isApproved: true });
    const averageRating = reviews.length > 0 
      ? reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length 
      : 0;

    await Product.findByIdAndUpdate(review.product, {
      'ratings.average': averageRating,
      'ratings.count': reviews.length
    });

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.voteReview = async (req, res) => {
  try {
    const { helpful } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const hasVoted = review.votedBy.includes(req.user.id);

    if (hasVoted) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted on this review'
      });
    }

    if (helpful) {
      review.helpfulVotes += 1;
    }

    review.votedBy.push(req.user.id);
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Vote recorded successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.replyToReview = async (req, res) => {
  try {
    const { message } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.replies.push({
      user: req.user.id,
      message
    });

    await review.save();

    const populatedReview = await Review.findById(review._id)
      .populate('user', 'firstName lastName avatar')
      .populate('replies.user', 'firstName lastName avatar');

    res.status(200).json({
      success: true,
      message: 'Reply added successfully',
      review: populatedReview
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

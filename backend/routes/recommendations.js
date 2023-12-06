const express = require('express');
const {
  getRecommendationsForUser,
  getProductSimilarities,
  getFrequentlyBoughtTogether,
  getTrendingProducts
} = require('../utils/recommendations');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/user', protect, async (req, res) => {
  try {
    const recommendations = await getRecommendationsForUser(req.user._id, 10);
    
    res.status(200).json({
      success: true,
      count: recommendations.length,
      data: { recommendations }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/similar/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 5;
    
    const similarProducts = await getProductSimilarities(productId, limit);
    
    res.status(200).json({
      success: true,
      count: similarProducts.length,
      data: { products: similarProducts }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/bought-together/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 3;
    
    const relatedProducts = await getFrequentlyBoughtTogether(productId, limit);
    
    res.status(200).json({
      success: true,
      count: relatedProducts.length,
      data: { products: relatedProducts }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/trending', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const limit = parseInt(req.query.limit) || 10;
    
    const trendingProducts = await getTrendingProducts(days, limit);
    
    res.status(200).json({
      success: true,
      count: trendingProducts.length,
      data: { products: trendingProducts }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

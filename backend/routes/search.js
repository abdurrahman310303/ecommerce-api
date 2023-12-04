const express = require('express');
const {
  globalSearch,
  getSearchSuggestions,
  getPopularSearches
} = require('../controllers/search');

const router = express.Router();

router.get('/', globalSearch);
router.get('/suggestions', getSearchSuggestions);
router.get('/popular', getPopularSearches);

module.exports = router;

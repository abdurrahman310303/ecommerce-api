const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const extractedErrors = {};
    errors.array().map(err => extractedErrors[err.param] = err.msg);

    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: extractedErrors
    });
  }

  next();
};

module.exports = validate;

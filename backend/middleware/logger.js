const logger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logMessage = `${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${req.ip}`;
    
    if (res.statusCode >= 400) {
      console.error(logMessage);
    } else {
      console.log(logMessage);
    }
  });
  
  next();
};

module.exports = logger;

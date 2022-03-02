var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get("/debug-sentry", function(req, res, next) {
  throw new Error("My first Sentry error!");
});

module.exports = router;

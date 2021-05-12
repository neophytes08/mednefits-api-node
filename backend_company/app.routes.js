const express = require('express');
const router = express.Router();
const authRouter = require('./routes/auth.route');
const companyRouter = require('./routes/company.route');

router.use('/auth', authRouter);
router.use('/hr', companyRouter);

module.exports = router
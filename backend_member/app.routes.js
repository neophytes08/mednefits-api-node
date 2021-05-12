const express = require('express');
const router = express.Router();
const authRouter = require('./routes/auth.route');
const employeeRouter = require('./routes/employee.route');
const activityRouter = require('./routes/activity.route');
const transactionRouter = require('./routes/transaction.route');

router.use('/auth', authRouter);
router.use('/employees', employeeRouter);
router.use('/employees', activityRouter);
router.use('/employees', transactionRouter);

module.exports = router
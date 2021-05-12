const express = require('express');
const router = express.Router();
const APPPATH = require('app-root-path');
const transactionController = require(`${APPPATH}/server/components/transactions/transaction.controller`);

// get employee in-network transactions
// router.get('/get_in_network_transactions', function(req, res, next) {
//   try {
//     transactionController.getInNetworkTransactions(req, res, next);
//   } catch (error) {
//     console.warn(error)
//   }
// });

module.exports = router;

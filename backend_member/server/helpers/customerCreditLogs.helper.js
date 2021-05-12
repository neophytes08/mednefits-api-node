const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const { map } = require('p-iteration');
const moment = require('moment');

const createCustomerCreditLogs = async (data) =>
{
    let walletHistoryResult = await mongoose.insertOne("medi_customer_wallet_history", data);
    return walletHistoryResult;
}

module.exports = {
    createCustomerCreditLogs
}
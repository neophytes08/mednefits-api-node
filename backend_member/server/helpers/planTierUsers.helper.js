const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const { map } = require('p-iteration');
const moment = require('moment');

const createData = async (data) => {
    await mongoose.insertOne(
        "medi_customer_plan_tier_users", 
        await mongoose.getPrimaryID("medi_customer_plan_tier_users", data)
    );
    
}

module.exports = {
    createData
}
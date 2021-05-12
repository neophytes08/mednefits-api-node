const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const { map } = require('p-iteration');
const moment = require('moment');

const createUserPlanHistory = async (data) => {
    
    let insertResult = await mongoose.insertOne(
        "medi_member_plan_history", data);
    
    return insertResult
}

module.exports = {
    createUserPlanHistory
}
require('express-async-errors');
const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const { map } = require('p-iteration');
const moment = require('moment');

const createUserPlanType = async (planTypeData) => {
    let planHistoryResult = await mongoose.insertOne(
        "medi_member_plan_history", 
        await mongoose.getPrimaryID("medi_member_plan_history", {planTypeData})
    );
    return planHistoryResult;
}

module.exports = {
    createUserPlanType
}
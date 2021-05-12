const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const { map } = require('p-iteration');
const moment = require('moment');

const increamentMemberEnrolledHeadCount = (plantierID) => {
    let walletResult = await mongoose.update("medi_customer_plan_tiers", 
        {"plan_tier_id": plantierID},
        {$inc:{"employee_enrolled_count": 1}}
    );
}

module.exports = {
    increamentMemberEnrolledHeadCount
}
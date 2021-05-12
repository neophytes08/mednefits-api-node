const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const { map } = require('p-iteration');
const moment = require('moment');

const increamentMemberEnrolledHeadCount = async (plantierID) => {
    let walletResult = await mongoose.update("medi_customer_plan_tiers", 
        {"plan_tier_id": plantierID},
        {$inc:{"employee_enrolled_count": 1}}
    );

    return walletResult;
}

const updateEnrollementStatus = async (dependentTempID) =>
{
    let result = await mongoose.update("medi_dependent_temp_enrollment", 
        {"dependent_temp_id": dependentTempID},
        {"enrolled_status": 1}
    );
    
    return result;
}

module.exports = {
    increamentMemberEnrolledHeadCount,
    updateEnrollementStatus
}
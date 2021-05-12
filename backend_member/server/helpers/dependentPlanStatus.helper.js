const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const { map } = require('p-iteration');
const moment = require('moment');

const incrementEnrolledDependents = async (customerPlanID) => {
    let walletResult = await mongoose.update("medi_customer_plan_tiers", 
        
            {"customer_plan_id": customerPlanID},
            {$inc:{"total_enrolled_dependents": 1}}
        
    );
}

module.exports = {
    incrementEnrolledDependents
}
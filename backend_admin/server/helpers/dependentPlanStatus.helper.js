const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const { map } = require('p-iteration');
const moment = require('moment');

const incrementEnrolledDependents = async (customerPlanID) => {
    let walletResult = await mongoose.update("medi_dependent_plan_status", 
        
            {"customer_plan_id": customerPlanID},
            {$inc:{"dependent_enrolled_count": 1}}
        
    );
}

module.exports = {
    incrementEnrolledDependents
}
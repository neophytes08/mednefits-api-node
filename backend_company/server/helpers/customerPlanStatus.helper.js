const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const { map } = require('p-iteration');
const moment = require('moment');

const addjustCustomerStatus = async (field, planID, type, number) =>
{
	console.warn('(parseFloat(number) * (type == "increment" ? 1 :-1))')
	console.warn((parseFloat(number) * (type == "increment" ? 1 :-1)))
    let adjustmentsResult = await mongoose.update("medi_customer_plan_status", 
    	{"customer_plan_id":  planID},
        {$inc:{employee_enrolled_count: (parseFloat(number) * (type == "increment" ? 1 :-1))}}
    );

    console.warn(adjustmentsResult)

    return adjustmentsResult;
}

module.exports = {
    addjustCustomerStatus
}
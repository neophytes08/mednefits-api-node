require('express-async-errors');
require('dotenv').config();
// const APPPATH = require('app-root-path');
// const config = require(`${APPPATH}/config/config`);
// const sha256 = require('sha256');
// const moment = require('moment');
// const { map } = require('p-iteration');
// const ucfirst = require('ucfirst');
// const format=require('format-number');
const companyModel = require('./company.model');
const mongoose = require('mongoose');


const getHRSession = async (req, res, next) => {

    let data = req.query;
    if(!data.customer_id) {
        return res.status(400).json({ status: false, message: 'Customer ID is required' })
    }

    let customerID = parseInt(data.customer_id);
    let accessibility = false;

    let settings = await companyModel.getOne('medi_customer_purchase', {
        customer_id: customerID
    });

    let hrAccount = await companyModel.getOne('medi_customer_hr_accounts', {
        customer_id: customerID
    });
    
    if(!settings)
    {
        return res.json({
            status: false,
            message: "Customer purchase not found."
        });
    }

    if(parseInt(settings.qr) == 1 && parseInt(settings.wallet) == 1)
    {
        accessibility = true;
    }

    return res.json({
        'hr_dashboard_id': hrAccount.hr_account_id,
        'customer_id': customerID,
        'qr_payment': settings.qr == 1 ? true : false,
        'wallet': settings.wallet == 1 ? true : false,
        'accessibility': accessibility,
        'signed_in': true
    });
}

const checkPlan = async (req, res, next) => {

    let data = req.query;
    if(!data.customer_id) {
        return res.status(400).json({ status: false, message: 'Customer ID is required' })
    }
    let customerID = parseInt(data.customer_id);
    let isPaid = false;
    let checks = false;
    
    let plan = await companyModel.aggregation('medi_customer_plans',
        [
            {$match: {customer_id: customerID}},
            {$sort:{created_at: -1}},
            {$limit:1}
        ]
    );


    if(plan.length == 0)
    {
        return res.json({
            status: false,
            message: "No customer plan."
        })
    }

    plan = plan[0];

    let activePlan = await companyModel.getOne('medi_customer_active_plans', {customer_plan_id: plan.customer_plan_id});
    let account = await companyModel.getOne('medi_customer_purchase', {customer_id: customerID});

    if(!activePlan)
    {
        return res.json({
            status: false,
            message: "Active plan not found."
        })
    }
    
    let invoice = await companyModel.getOne('medi_active_plan_invoices', { customer_active_plan_id: activePlan.customer_active_plan_id })
    if(invoice && invoice.isPaid == 1)
    {
        isPaid = true;
    }
    
    console.log('customerID', customerID)
    let numberOfEmployees = await companyModel.countCollection("medi_company_members", {customer_id: customerID});

    if(isPaid && numberOfEmployees > 0)
    {
        checks = true;
    }
    
    let dependents = await companyModel.countCollection("medi_dependent_plans", {customer_plan_id: plan.customer_plan_id});
  
    return res.json({
        status: true,
        data: {
            paid: isPaid, 
            employee_status: numberOfEmployees > 0 ? true : false, 
            cheque: true, 
            agree_status: account.agree_status == 1 ? true : false, 
            checks: checks, 
            plan: activePlan,
            dependent_status: dependents > 0 ? true : false
        }
    });
}

module.exports = {
    getHRSession,
    checkPlan
}
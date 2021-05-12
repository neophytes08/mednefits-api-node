require('express-async-errors');
require('dotenv').config();
const fs = require('fs');
const APPPATH = require('app-root-path');
// const APPPATH = require('app-root-path');
// const config = require(`${APPPATH}/config/config`);
// const sha256 = require('sha256');
const moment = require('moment');
const { map } = require('p-iteration');
// const ucfirst = require('ucfirst');
// const format=require('format-number');
const companyModel = require('./company.model');
const validate = require('./company.validator');
const stringHelper = require(`${APPPATH}/server/helpers/string.helper`);
const global_helper = require(`${APPPATH}/server/helpers/global.helper.js`);
// const carePlanJson = async (req, res, next) => {
//     let jobs = fs.readFileSync(`${APPPATH}/public/json/care_plan/job.json`);
//     return res.json({
//         status: true,
//         data: jobs
//     })
// }

// const getHRSession = async (req, res, next) => {

//     let data = req.body;
//     let customerID = data.customer_id || null;
//     let accessibility = 0;

//     if(!customerID)
//     {
//         return res.json({
//             status: false,
//             message: "Customer ID not exist."
//         });
//     }

//     let settings = await companyModel.getOne('medi_customer_purchase', {
//         customer_id: customerID
//     });

//     let hrAccount = await companyModel.getOne('medi_customer_hr_accounts', {
//         customer_id: customerID
//     });
    
//     if((Object.keys(settings || {})).length <= 0)
//     {
//         return res.json({
//             status: false,
//             message: "Customer purchase not found."
//         });
//     }

//     if(parseInt(settings.qr) == 1 && parseInt(settings.wallet) == 1)
//     {
//         accessibility = 1;
//     }

//     return res.json({
//         'hr_dashboard_id': hrAccount.hr_account_id,
//         'customer_buy_start_id': customerID,
//         'qr_payment': settings.qr,
//         'wallet': settings.wallet,
//         'accessibility': accessibility,
//         'signed_in': true
//     });
// }

// const checkPlan = async (req, res, next) => {

//     let data = req.body;
//     let customerID = data.customer_id;
//     let isPaid = false;
//     let checks = false;
    
//     let plan = await companyModel.aggregation('medi_customer_plans',
//         [
//             {$match: {customer_id: customerID}},
//             {$sort:{created_at: -1}},
//             {$limit:1}
//         ]
//     );

//     plan = plan[0];

//     if((Object.keys(plan || {})) <= 0)
//     {
//         return res.json({
//             status: false,
//             message: "No customer plan."
//         })
//     }


//     let activePlan = await companyModel.getOne('medi_customer_active_plans', {customer_plan_id: plan.customer_plan_id});
//     let account = await companyModel.getOne('medi_customer_purchase', {customer_id: customerID});

//     if((Object.keys(activePlan || {})) <= 0)
//     {
//         return res.json({
//             status: false,
//             message: "Active plan not found."
//         })
//     }

//     if((Object.keys(account || {})) <= 0)
//     {
//         return res.json({
//             status: false,
//             message: "Customer purchase not found."
//         })
//     }

//     if((Object.keys(activePlan || {})) > 0)
//     {
//         if(activePlan.paid && activePlan.paid == "true")
//         {
//             isPaid = true;
//         }
//     }

//     let numberOfEmployees = await companyModel.countCollection("medi_company_members", {customer_id: customerID});
   
//     if(isPaid && numberOfEmployees > 0)
//     {
//         checks = true;
//     }
    
//     let dependents = await companyModel.countCollection("medi_dependent_plans", {customer_plan_id: plan.customer_plan_id});
  
//     return res.json({
//         status: true,
//         data: {
//             paid: isPaid, 
//             employee_count: numberOfEmployees, 
//             cheque: true, 
//             agree_status: account.agree_status, 
//             checks: checks, 
//             plan: activePlan,
//             dependent_status: dependents > 0 ? true : false
//         }
//     });
// }



// const companyActivePlans = async (req, body, next) =>
// {
//     let data = req.body;
//     let customerID = data.customer_id;
    
//     let plan = await companyModel.aggregation('medi_customer_plans',
//         [
//             {$match: {customer_id: customerID}},
//             {$sort:{created_at: -1}},
//             {$limit:1}
//         ]
//     );
//     plan = plan[0];

//     if((Object.keys(plan || {})) <= 0)
//     {
//         return res.json({
//             status: false,
//             message: "No customer plan."
//         })
//     }

//     let activePlan = await companyModel.getMany('medi_customer_active_plans', {customer_plan_id: plan.customer_plan_id});

//     if(activePlan.length > 0)
//     {
//         let totalMedicalAllocation = 0;
//         let totalWellnessAllocation = 0;
//         let invoice = null;
//         let calculatedPricesEndDate = null;
//         let endPlanDate = null;
//         let duration = null;
//         let planExtension  = null;
//         let calendar = null;
//         let calendarType = null;
//         let firstPlan = null;
//         await map(activePlan, async active => {
//             totalMedicalAllocation = 0;
//             totalWellnessAllocation = 0;
//             calculatedPricesEndDate = null;
//             endPlanDate = null;
//             duration = null;

//             invoice = await companyModel.getOne("medi_active_plan_invoices", {customer_active_plan_id: active.customer_active_plan_id});
//             // $total_medical_allocation = 0;
//             // $total_wellness_allocation = 0;
//             // $invoice = DB::table('corporate_invoice')
//             // ->where('customer_active_plan_id', $active->customer_active_plan_id)
//             // ->first();
    
//             if(parseInt(active.new_head_count) == 0)
//             {
//                 if((Object.keys(active || {})).length > 0)
//                 {
//                     if(active.duration != "")
//                     {
//                         calendar = (active.duration).split(" ");
//                         calendarType = "years";
        
//                         if(calendar[1] == "month" || calendar[1] == "months")
//                         {
//                             calendarType = "months";
//                         }
//                         else if(calendar[1] == "day" || calendar[1] == "days")
//                         {
//                             calendarType = "days";
//                         }
//                         endPlanDate = moment(new Date(active.plan_start)).add(calendar[0], calendarType).format("YYYY-MM-DD");
//                     }
//                     else
//                     {
//                         endPlanDate = moment(new Date(active.plan_start)).add(1, "years").format("YYYY-MM-DD");
//                     }
//                 }
//                 else
//                 {
//                     if(activePlan.duration != "")
//                     {
//                         calendar = (plan.duration).split(" ");
//                         calendarType = "years";
            
//                         if(calendar[1] == "month" || calendar[1] == "months")
//                         {
//                             calendarType = "months";
//                         }
//                         else if(calendar[1] == "day" || calendar[1] == "days")
//                         {
//                             calendarType = "days";
//                         }
//                         endPlanDate = moment(new Date(plan.plan_start)).add(calendar[0], calendarType).format("YYYY-MM-DD");
//                     }
//                     else
//                     {
//                         endPlanDate = moment(new Date(plan.plan_start)).add(1, "years").format("YYYY-MM-DD");
//                     }
//                 }

//                 calculatedPricesEndDate = endPlanDate;
//             }
//             else
//             {
//                 firstPlan = await companyModel.getOne("medi_customer_active_plans", {customer_plan_id: active.customer_plan_id});
               
//                 if(parseInt(firstPlan.plan_extention_enable) == 1)
//                 {
//                     planExtension = await companyModel.getOne("medi_active_plan_extensions", {customer_active_plan_id: firstPlan.customer_active_plan_id});
//                     duration = planExtension.duration;
//                 }
//                 else
//                 {
//                     duration = firstPlan.duration;
//                 }

//                 if(duration != "")
//                 {
//                     calendar = (duration).split(" ");
//                     calendarType = "years";
        
//                     if(calendar[1] == "month" || calendar[1] == "months")
//                     {
//                         calendarType = "months";
//                     }
//                     else if(calendar[1] == "day" || calendar[1] == "days")
//                     {
//                         calendarType = "days";
//                     }
//                     endPlanDate = moment(new Date(plan.plan_start)).add(calendar[0], calendarType).format("YYYY-MM-DD");
//                 }
//                 else
//                 {
//                     endPlanDate = moment(new Date(plan.plan_start)).add(1, "years").format("YYYY-MM-DD");
//                 }

//                 if(active.account_type != "trial_plan")
//                 {
//                     calendar = (active.duration).split(" ");
//                     calendarType = "years";
            
//                     if(calendar[1] == "month" || calendar[1] == "months")
//                     {
//                         calendarType = "months";
//                     }
//                     else if(calendar[1] == "day" || calendar[1] == "days")
//                     {
//                         calendarType = "days";
//                     }
//                     endPlanDate = moment(new Date(plan.plan_start)).add(calendar[0], calendarType).format("YYYY-MM-DD");
                    
//                     calculatedPricesEndDate =  endPlanDate;
//                 }
//                 else
//                 {
//                     calculatedPricesEndDate = endPlanDate;
//                 }
//             }
    
//             active.plan_amount = await calculateInvoicePlanPriceCompany(invoice.employees, invoice.individual_price, active.plan_start, calculatedPricesEndDate) * invoice.employees;
//             active.employees = invoice.employees;
//             // $active->plan_amount = number_format(self::calculateInvoicePlanPriceCompany($invoice->employees, $invoice->individual_price, $active->plan_start, $calculated_prices_end_date) * $invoice->employees, 2);
//             // $active->employees = $invoice->employees;
          
//             // // get depost
//             let deposits = await companyModel.getMany("medi_customer_spending_deposit_credits", {customer_active_plan_id: active.customer_active_plan_id});
//             // $deposits = DB::table("spending_deposit_credits")
//             // ->where("customer_active_plan_id", $active->customer_active_plan_id)
//             // ->get();
//             let totalDepositMedical = 0;
//             let totalDepositWellness = 0;
//             let percentMedical = null;
//             let percentWellness = null;
//             let totalMedical = 0;
//             let totalWellness = 0;


//             await map(deposits, deposit => {
//                 if(parseFloat(deposit.medical_credits) > 0 && parseFloat(deposit.welness_credits) > 0)
//                 {
//                     percentMedical = parseFloat(deposit.medical_percent);
//                     percentWellness = parseFloat(deposit.wellness_percent);

//                     totalMedical = parseFloat(deposit.medical_credits);
//                     totalDepositMedical = totalDepositMedical + (totalMedical * parseFloat(deposit.welness_credits));
                
//                     totalWellness = parseFloat(deposit.wellness_credits);
//                     totalDepositWellness = totalDepositWellness + (totalWellness * parseFloat(percentWellness));
//                 }
//                 else if(parseFloat(deposit.medical_credits) > 0)
//                 {
//                     percentMedical = parseFloat(deposit.medical_percent);
//                     totalMedical = parseFloat(deposit.medical_credits);
//                     totalDepositMedical = totalDepositMedical + (totalMedical * parseFloat(deposit.welness_credits));

//                 }
//                 else if(parseFloat(deposit.welness_credits) > 0)
//                 {
//                     percentWellness = parseFloat(deposit.wellness_percent);
//                     totalWellness = parseFloat(deposit.wellness_credits);
//                     totalDepositWellness = totalDepositWellness + (totalWellness * parseFloat(percentWellness));
//                 }
//             });
    
//             active.total_deposit_medical = totalDepositMedical;
//             active.total_deposit_wellness = totalDepositWellness;
//             // $active->total_deposit_medical = number_format($total_deposit_medical, 2);
//             // $active->total_deposit_wellness = number_format($total_deposit_wellness, 2);
//             // // get allocated amount for medical
//             let totalAllocations = await companyModel.aggregation("medi_customer_wallet_history", [
//                 {
//                     $match : {
//                         customer_active_plan_id: active.customer_active_plan_id,
//                         type:  'admin_added_credits'
//                     }
//                 },
//                 {   
//                     $group: { 
//                         _id: null, 
//                         total_allocated_amount_medical: {
//                             $sum:{
//                                 $cond: { 
//                                     if: {$eq:["$medi_customer_wallet_history.wallet_type","medical"]}, 
//                                     then: "$medi_wallet_history.credit",
//                                     else: "0"
//                                 }
//                             }
//                         },
//                         total_allocated_amount_wellness: { 
//                             $sum: {
//                                 $cond: { 
//                                     if: { $eq:["$medi_customer_wallet_history.wallet_type","wellness"]}, 
//                                     then: "$medi_customer_wallet_history.credit",
//                                     else: "0"
//                                 } 
//                             }
//                         },
//                     } 
//                 },
//                 {   $project: { 
//                         totalMWAllocation: { 
//                             $subtract: ["$total_allocated_amount_medical","$total_allocated_amount_wellness"]
//                         } 
//                     } 
//                 }
//             ]);

//             let totalAllocatedAmountMedical = totalAllocations[0].total_allocated_amount_medical;
//             let totalAllocatedAmountWellness = totalAllocations[0].total_allocated_amount_wellness;
//             // $total_allocated_amount_medical = DB::table('customer_credit_logs')->whereNotNull('customer_active_plan_id')->where('customer_active_plan_id', $active->customer_active_plan_id)->where('logs', 'admin_added_credits')->sum('credit');
//             // $total_allocated_amount_wellness = DB::table('customer_wellness_credits_logs')->whereNotNull('customer_active_plan_id')->where('customer_active_plan_id', $active->customer_active_plan_id)->where('logs', 'admin_added_credits')->sum('credit');
    
//             active.total_allocated_amount_medical = totalAllocatedAmountMedical;
//             active.total_allocated_amount_wellness = totalAllocatedAmountWellness;
//             // $active->total_allocated_amount_medical = number_format($total_allocated_amount_medical, 2);
//             // $active->total_allocated_amount_wellness = number_format($total_allocated_amount_wellness, 2);
    
//             // $active->total_allocated_amount_medical = number_format($total_allocated_amount_medical, 2);
//             // $active->total_allocated_amount_wellness = number_format($total_allocated_amount_wellness, 2);
    
//             // // check for dependents
//             active.dependents = await companyModel.countCollection("medi_dependent_plans", {customer_active_plan_id: active.customer_active_plan_id});
//             // $active->dependents = DB::table('dependent_plans')
//             // ->where('customer_active_plan_id', $active->customer_active_plan_id)
//             // ->count();
    
//             let extension = await companyModel.getOne("medi_active_plan_extensions", {customer_active_plan_id: active.customer_active_plan_id});
//             // // get plan extention if any
//             // $extension = DB::table('plan_extensions')->where('customer_active_plan_id', $active->customer_active_plan_id)->first();
    
//             if((Object.keys(extension || {})).length > 0)
//             {
//                 let planExtensionPlanInvoice = await companyModel.getOne("medi_active_plan_extension_invoices",{active_plan_extensions_id: extension.active_plan_extensions_id});
            
//                 if((Object.keys(planExtensionPlanInvoice || {})).length > 0)
//                 {
//                     //         $invoice_extention = DB::table('corporate_invoice')
//                     //         ->where('corporate_invoice_id', $plan_extension_plan_invoice->invoice_id)
//                     //         ->first();
            
//                     //         if($invoice_extention) {
//                     //             $extension->amount = number_format($invoice_extention->employees * $invoice_extention->individual_price, 2);
//                     //         } else {
//                     //             $extension->amount = number_format($active->employees * $extension->individual_price, 2);
//                     //         }
            
//                     //         $invoice = DB::table('corporate_invoice')
//                     //         ->where('corporate_invoice_id', $plan_extension_plan_invoice->invoice_id)
//                     //         ->first();
            
//                     //         if($invoice) {
//                     //             $extension->employees = $invoice->employees;
//                     //         } else {
//                     //             $extension->employees = $active->employees;
//                     //         }
//                 }
//                 else
//                 {
//                     extension.employees = active.employees;
//                     extension.amount = parseFloat(active.employees) * parseFloat(extension.individual_price);
//                 }

//                 active.plan_extension = extension;
//             }
//         });
//     }

//     return res.json({
//         status: true, 
//         data: activePlan
//     });
// }

// const calculateInvoicePlanPriceCompany = (numberOfEmployees, defaultPrice, start, end) =>
// {
//     // $diff = date_diff(new \DateTime(date('Y-m-d', strtotime($start))), new \DateTime(date('Y-m-d', strtotime($end))));
//     // $days = $diff->format('%a');

//     // $total_days = date("z", mktime(0,0,0,12,31,date('Y'))) + 1;
//     // $remaining_days = $days;

//     // $cost_plan_and_days = ($default_price / $total_days);
//     // return $cost_plan_and_days * $remaining_days;
// }

const getCompanyCompanyInformation = async(req, res, next) => {
    if(!req.query.customer_id) {
        return res.status(400).json({ status: true, message: 'Customer ID is required.' });
    }

    let customerID = parseInt(req.query.customer_id);

    let purchase = await companyModel.getOne("medi_customer_purchase", { customer_id: customerID });

    if(!purchase) {
        return res.status(404).json({
            status: false,
            message: "Customer does not exist",
        });
    }

    let customer_billing_contacts = await companyModel.getOne("medi_customer_billing_contact", { customer_id: customerID });
    let customer_business_informations = await companyModel.getOne("medi_customer_business_information", { customer_id: customerID });

    return res.json({ status: true, customer: purchase, information: customer_business_informations, billing: customer_billing_contacts })
}

const updateCompanyBusinessContact = async (req, res, next) => {
    if(!req.body.customer_id) {
        return res.status(400).json({ status: true, message: 'Customer ID is required.' });
    }

    let customerID = parseInt(req.body.customer_id);

    let purchase = await companyModel.getOne("medi_customer_purchase", { customer_id: customerID });

    if(!purchase) {
        return res.status(404).json({
            status: false,
            message: "Customer does not exist",
        });
    }

    isValid = await validate.joiValidate(req.body, validate.updateBusinessContact, true)
    
    if(typeof isValid != 'boolean')
    {
        return res.status(400).json({
            status: false,
            message: isValid.details[0].message
        })
    }

    let data = req.body;
    delete data.customer_id;
    delete data.admin_id;

    if(data.billing_recipient) {
        data.billing_recipient = data.billing_recipient ? 1 : 0;
    }

    if(data.send_email_billing) {
        data.send_email_billing = data.send_email_billing ? 1 : 0;
    }

    if(data.send_email_communication) {
        data.send_email_communication = data.send_email_communication ? 1 : 0;
    }

    let contact = await stringHelper.nestedToDotNotation(data, 'contact');
    let result = await companyModel.updateOne('medi_customer_business_information', { customer_id: customerID }, contact )
    
    if(result) {
        return res.json({ status: true, message: 'Company Business Contact updated.' });
    }

    return res.json({ status: false, message: 'Failed to update data.' });
}

const updateCompanyBillingContact = async (req, res, next) => {
    if(!req.body.customer_id) {
        return res.status(400).json({ status: true, message: 'Customer ID is required.' });
    }

    let customerID = parseInt(req.body.customer_id);

    let purchase = await companyModel.getOne("medi_customer_purchase", { customer_id: customerID });

    if(!purchase) {
        return res.status(404).json({
            status: false,
            message: "Customer does not exist",
        });
    }

    isValid = await validate.joiValidate(req.body, validate.updateBillingContact, true)
    
    if(typeof isValid != 'boolean')
    {
        return res.status(400).json({
            status: false,
            message: isValid.details[0].message
        })
    }

    let data = req.body;
    delete data.customer_id;
    delete data.admin_id;

    console.log('data', data);
    if(data.bill_send_email_billing) {
        data.bill_send_email_billing = data.bill_send_email_billing ? 1 : 0;
    }

    if(data.bill_send_email_communication) {
        data.bill_send_email_communication = data.bill_send_email_communication ? 1 : 0;
    }

    // data.updated_at = moment().format('YYYY-MM-DD HH:mm:ss');
    let result = await companyModel.updateOne('medi_customer_billing_contact', { customer_id: customerID }, data )
    console.log('result', result)
    if(result) {
        return res.json({ status: true, message: 'Company Billing Contact updated.' });
    }

    return res.json({ status: false, message: 'Failed to update data.' });
}


module.exports = {
    // notification,
    // getHRSession,
    // checkPlan,
    // carePlanJson,
    // companyActivePlans,
    getCompanyCompanyInformation,
    updateCompanyBusinessContact,
    updateCompanyBillingContact
}
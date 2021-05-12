require('express-async-errors');
require('dotenv').config();
const APPPATH = require('app-root-path');
const PlanHelper = require(`${APPPATH}/server/helpers/plan.helper.js`);
const SpendingInvoiceLibrary = require(`${APPPATH}/server/helpers/spendingInvoice.helper.js`);
// const config = require(`${APPPATH}/config/config`);
// const sha256 = require('sha256');
const moment = require('moment');
const { map } = require('p-iteration');
const format = require('format-number');
// const ucfirst = require('ucfirst');
const ucwords = require('ucwords');
const companyModel = require('./company.model');
const mongoose = require('mongoose');
const _ = require('underscore');

const _checkBalanceMedicalWellness = async(customerCreditReset, walletType, customerID) => {
    console.log('customerID', typeof customerID)
    let joinResult = null;
    if(customerCreditReset.length > 0)
    {
        console.log('reset');
        customerCreditReset = customerCreditReset[0];
        let reset_date = moment(customerCreditReset.date_resetted).format("YYYY-MM-DD HH:mm:ss");
        console.log('reset_date', reset_date)
        joinResult = await companyModel.aggregation("medi_customer_wallets", [
            {   $lookup:{
                    from: "medi_customer_wallet_histories",
                    localField : "customer_wallet_id",
                    foreignField : "customer_wallet_id",
                    as : "medi_customer_wallet_histories"
                },
            },
            {   $unwind: "$medi_customer_wallet_histories" },
            {   $match: { $and: [
                        {"medi_customer_wallet_histories.wallet_type": (walletType == "medical" ? "medical" : "wellness")},
                        {"medi_customer_wallet_histories.type": {
                            $in: ["admin_added_credits","admin_deducted_credits"]
                        }},
                        // {"customer_id": customerID},
                        {"medi_customer_wallet_histories.created_at": { $gt: reset_date}}
                    ] }
            },
            {   $group: { 
                    _id: null, 
                    admin_added_credits: {
                        $sum:{
                            $cond: { 
                                if: {$eq:["$medi_customer_wallet_histories.type","admin_added_credits"]}, 
                                then: "$medi_customer_wallet_histories.credit",
                                else: "0"
                            }
                        }
                    },
                    admin_deducted_credits: { 
                        $sum: {
                            $cond: { 
                                if: { $eq:["$medi_customer_wallet_histories.type","admin_deducted_credits"]}, 
                                then: "$medi_customer_wallet_histories.credit",
                                else: "0"
                            } 
                        }
                    },
                } 
            },
            {   $project: { 
                    totalMWAllocation: { 
                        $subtract: ["$admin_added_credits", "$admin_deducted_credits"]
                    } 
                } 
            }
        ]);
    }
    else
    {
        joinResult = await companyModel.aggregation("medi_customer_wallets", [
            {   $lookup:{
                    from: "medi_customer_wallet_histories",
                    localField : "customer_wallet_id",
                    foreignField : "customer_wallet_id",
                    as : "medi_customer_wallet_histories"
                },
            },
            {   $unwind: "$medi_customer_wallet_histories" },
            {   $match: { $and: [
                        {"medi_customer_wallet_histories.wallet_type": (walletType == "medical" ? "medical" : "wellness")},
                        {"medi_customer_wallet_histories.type": {
                            $in: ["admin_added_credits","admin_deducted_credits"]
                        }},
                        {"customer_id": customerID}
                    ] }
            },
            {   $group: { 
                    _id: null,
                    total: {
                        $sum:{
                            $cond: { 
                                if: {$eq:["$medi_customer_wallet_histories.type","admin_added_credits"]}, 
                                then: "$medi_customer_wallet_histories.credit",
                                else: "0"
                            }
                        }
                    },
                    total1: { 
                        $sum: {
                            $cond: { 
                                if: { $eq:["$medi_customer_wallet_histories.type","admin_deducted_credits"]}, 
                                then: "$medi_customer_wallet_histories.credit",
                                else: "0"
                            } 
                        }
                    },
                } 
            },
            {   $project: { 
                    totalMWAllocation: { 
                        $subtract: ["$total","$total1"]
                    } 
                } 
            }
        ]);
    }

    if(joinResult.length > 0) {
        return joinResult[0].totalMWAllocation;
    }
    return 0;
}

const hrStatus = async (customerID) => {
    let settings = await companyModel.getOne("medi_customer_purchase", { customer_id: customerID });
    let accessibility = 0;
    if(parseInt(settings.qr) == 1 && parseInt(settings.wallet) == 1)
    {
        accessibility = 1;
    }

    return {
        hr_dashboard_id: 0,
        customer_id: customerID,
        qr_payment: settings.qr,
        wallet: settings.wallet,
        accessibility: accessibility
    }
}

const checkBalance = async (req, res, next) => {

    let data = req.query;
    // let customer_id = data.customer_id;
    let customerID = parseInt(data.customer_id);
    let totalAllocationWellness = null;
    let deletedEmployeeAllocationWellness = 0;
    let totalDeductionCreditsWellness = 0;
    let checkAccessibility = await hrStatus(customerID);
    let medWellBalance = 0;
    let allocated = 0;
    let getAllocationSpent = 0;
    let getAllocationSpentWellness = 0;
    let totalWellnessBalance = 0;
    let totalDeductionCredits = 0;
    let deletedEmployeeAllocation = 0;
    let allocatedWellness = 0;
    let totalMedicalAllocation = 0;
    let credits = 0;
    let totalMedicalAllocated = 0;
    let creditsWellness = 0;
    let totalWellnessAllocated = 0;
    let totalAllocationMedical = 0;

    if(checkAccessibility.accessibility == 1)
    {
        let customerCreditResetMedical = await companyModel.aggregation('medi_wallet_resets',
            [
                {$match: {
                    id: customerID,
                    spending_type: 'medical',
                    user_type: 'company'
                }},
                {$sort:{created_at: -1}},
                {$limit:1}
            ]
        );

        totalAllocationMedical = await _checkBalanceMedicalWellness(customerCreditResetMedical, "medical", customerID);
        let customerCreditResetWellness = await companyModel.aggregation('medi_wallet_resets',
            [
                {$match: {
                    id: customerID,
                    spending_type: 'wellness',
                    user_type: 'company'
                }},
                {$sort:{created_at: -1}},
                {$limit:1}
            ]
        );


        totalAllocationWellness = await _checkBalanceMedicalWellness(customerCreditResetWellness, "wellness", customerID);
        let userAllocated = await PlanHelper.getCorporateUserByAllocated(customerID);
        // console.log('userAllocated', userAllocated)
        // return res.json(totalAllocationMedical)
        await map(userAllocated, async user => {
            let user_id = user;
            getAllocation = 0;
            deductedAllocation = 0;
            eClaimSpent = 0;
            inNetworkTempSpent = 0;
            creditsBack = 0;
            getAllocationWellness = 0;
            deductedAllocationWellness = 0;
            eClaimSpentWellness = 0;
            inNetworkTempSpentWellness = 0;
            creditsBackWellness = 0;

            wallet = await companyModel.aggregation("medi_member_wallet", [
                {$match: {member_id: user_id}},
                {$sort:{created_at: -1}},
                {$limit:1}
            ]);
            wallet = wallet[0];

            medicalWallet = await PlanHelper.memberAllocatedCredits(wallet.member_wallet_id, user_id, "medical");
            // return res.json(medicalWallet)
            getAllocationSpent += medicalWallet.getAllocationSpent;
            allocated += medicalWallet.allocation;
            totalDeductionCredits += medicalWallet.totalDeductionCredits;
            deletedEmployeeAllocation += medicalWallet.deletedEmployeeAllocation;
            medWellBalance += medicalWallet.medWellBalance;
            
            wellnessWallet = await PlanHelper.memberAllocatedCredits(wallet.member_wallet_id, user_id, "wellness");
            getAllocationSpentWellness += wellnessWallet.getAllocationSpent;
            allocatedWellness += wellnessWallet.allocation;
            totalDeductionCreditsWellness += wellnessWallet.totalDeductionCredits;
            deletedEmployeeAllocationWellness += wellnessWallet.deletedEmployeeAllocation;
            totalWellnessBalance += wellnessWallet.medWellBalance;  
        });

        let companyCredits = await companyModel.getOne("medi_customer_wallets", {customer_id: customerID});
        let totalMedicalAllocated = allocated - deletedEmployeeAllocation;
        let totalWellnessAllocated = allocatedWellness - deletedEmployeeAllocationWellness;

        credits = totalAllocationMedical - totalMedicalAllocated;
        creditsWellness = totalAllocationWellness - totalWellnessAllocated;

        if(companyCredits > 0 && (companyCredits.medical_balance || null) != credits)
        {
            await companyModel.updateMany("medi_customer_wallets",{customer_id: customerID }, {medical_balance: credits});
        }

        if(companyCredits > 0 && (companyCredits.wellness_balance || null) != creditsWellness)
        {
            await companyModel.updateMany("medi_customer_wallets",{customer_id: customerID }, {wellness_balance: creditsWellness});
        }

    }

    return res.status(200).json({
        'total_medical_company_allocation': totalAllocationMedical,
        'total_medical_company_unallocation': credits,
        'total_medical_employee_allocated': totalMedicalAllocated,
        'total_medical_employee_spent': getAllocationSpent,
        'total_medical_employee_balance': medWellBalance,
        'total_medical_wellness_allocation': totalAllocationWellness,
        'total_medical_wellness_unallocation': creditsWellness,
        'total_wellness_employee_allocated': totalWellnessAllocated,
        'total_wellness_employee_spent': getAllocationSpentWellness,
        'total_wellness_employee_balance': totalWellnessBalance,
        'customer_id': customerID
    });
}

const enrollmentProgress = async (req, res, next) => {

    let data = req.query;
    if(!data.customer_id) {
        return res.status(400).json({ status: false, message: 'Customer ID is required' })
    }

    let customerID = parseInt(data.customer_id);
    let plan = await companyModel.aggregation('medi_customer_plans',
        [
            {$match: {customer_id: customerID}},
            {$sort:{created_at: -1}},
            {$limit:1}
        ]
    );
    
    plan = plan[0];

    let activePlans = await companyModel.getMany("medi_customer_active_plans", {customer_plan_id: plan.customer_plan_id});
    let planStatus = await companyModel.getOne("medi_customer_plan_status", {customer_plan_id: plan.customer_plan_id});
    let inProgress = parseFloat(planStatus.employee_head_count) - parseFloat(planStatus.employee_enrolled_count);
    // let endPlan = moment(new Date(plan.plan_start)).subtract(5, "days").format("YYYY-MMMM-DD");
    
    return res.json({
        status: true,
        data: {
            in_progress: inProgress,
            completed: planStatus.employee_enrolled_count,
            active_plans: activePlans,
            total_employees: planStatus.employee_head_count,
            // plan_end_date: endPlan,
            account_type: plan.account_type
        }
    });
}

const taskList = async (req, res, next) => {

    let data = req.query;
    let customerID = parseInt(data.customer_id);
    let totalEmployees = 0;
    let tasks = new Array();
    let endPlanDate = null;

    let plan = await companyModel.aggregation('medi_customer_plans',
        [
            {$match: {customer_id: customerID}},
            {$sort:{created_at: -1}},
            {$limit:1}
        ]
    );
    plan = plan[0];
    console.log('plan', plan)
    let planStatus = await companyModel.getOne("medi_customer_plan_status", {customer_plan_id: plan.customer_plan_id});
    // check plan expiration

    let activePlan = await companyModel.getOne('medi_customer_active_plans', {customer_plan_id: plan.customer_plan_id});
    // return res.json(activePlan);

    if((Object.keys(activePlan)).length > 0 && parseInt((activePlan.plan_extention_enable || 0)) == 1)
    {
        let planExtension = await companyModel.getOne("medi_active_plan_extensions", {customer_active_plan_id: activePlan.customer_active_plan_id});
       
        if((Object.keys(planExtension || {})).length > 0)
        {
            if(planExtension.duration != "")
            {
                let calendar = (planExtension.duration).split(" ");
                let calendarType = "years";

                if(calendar[1] == "month" || calendar[1] == "months")
                {
                    calendarType = "months";
                }
                else if(calendar[1] == "day" || calendar[1] == "days")
                {
                    calendarType = "days";
                }
                endPlanDate = moment(new Date(planExtension.plan_start)).add(calendar[0], calendarType).format("YYYY-MM-DD");
            }
            else
            {
                endPlanDate = moment(new Date(planExtension.plan_start)).add(1, "years").format("YYYY-MM-DD");
            }
        }
        else
        {
            if(activePlan.duration != "")
            {
                let calendar = (plan.duration).split(" ");
                let calendarType = "years";
    
                if(calendar[1] == "month" || calendar[1] == "months")
                {
                    calendarType = "months";
                }
                else if(calendar[1] == "day" || calendar[1] == "days")
                {
                    calendarType = "days";
                }
                endPlanDate = moment(new Date(plan.plan_start)).add(calendar[0], calendarType).format("YYYY-MM-DD");
            }
            else
            {
                endPlanDate = moment(new Date(plan.plan_start)).add(1, "years").format("YYYY-MM-DD");
            }
        }

    }else{
        if(activePlan.duration != "")
        {
            let calendar = (activePlan.duration).split(" ");
            let calendarType = "years";

            if(calendar[1] == "month" || calendar[1] == "months")
            {
                calendarType = "months";
            }
            else if(calendar[1] == "day" || calendar[1] == "days")
            {
                calendarType = "days";
            }
            endPlanDate = moment(new Date(plan.plan_start)).add(calendar[0], calendarType).format("YYYY-MM-DD");
        }
        else
        {
            endPlanDate = moment(new Date(plan.plan_start)).add(1, "years").format("YYYY-MM-DD");
        }
    }
    
    let date = moment(new Date(endPlanDate)).subtract(1,'months').format("YYYY-MM-DD");

    if(moment(new Date()).diff(date,'days') >= 0)
    {
        // return res.json({
        //     status: true,
        //     type: 'expiring_plan',
        //     message: 'Your Care Plan will expire in ' + moment(new Date(endPlanDate)).format("MMMM DD, YYYY") + '. Please renew your Care Plan before the said date.'
        // });
        tasks.push({
            status: true,
            type: 'expiring_plan',
            message: 'Your Care Plan will expire in ' + moment(new Date(endPlanDate)).format("MMMM DD, YYYY") + '. Please renew your Care Plan before the said date.'
        });
    }

    let inProgress = parseFloat(planStatus.employee_head_count) - parseFloat(planStatus.employee_enrolled_count);

    tasks.push({
        status: true,
        type: 'pending_enrollment_employee',
        total_employees: inProgress
    });

    let dependentPlanStatus = await companyModel.aggregation("medi_dependent_plan_status",[
        {$match: {customer_plan_id: plan.customer_plan_id}},
        {$sort:{created_at: -1}},
        {$limit:1}
    ]);
    dependentPlanStatus = dependentPlanStatus[0];

    if((Object.keys(dependentPlanStatus || {})).length > 0)
    {
        tasks.push({
            status: true,
            type: 'pending_enrollment_dependent',
            total_employees: parseFloat(dependentPlanStatus.dependent_head_count) - parseFloat(dependentPlanStatus.dependent_enrolled_count)
        });
    }

    activePlan = await companyModel.getMany("medi_active_plan_invoices", {isPaid: 0, customer_id: customerID});
    totalEmployees = 0;
    let spendingData = new Array();

    let dependents = null;
    await map(activePlan, async planData => {
        dependents = await companyModel.getMany("medi_dependent_plans", { customer_active_plan_id: planData.customer_active_plan_id });
        dependents = (dependents).map(function(el){
            return el.total_dependents;
        }).reduce(function(acc, val) { return acc + val; }, 0)

        tasks.push({
            total_employees: planData.employees,
            total_dependents: dependents,
            invoice_due: moment(new Date(planData.invoice_due_date)).format("YYYY-MM-DD"),
            type: 'pending_activation'
        });
    });

    return res.json({
        status: true,
        data: tasks
    })
    
}

const details = async (req, res, next) => {

    let data = req.query;
    if(!data.customer_id) {
        return res.status(400).json({ status: false, message: 'Customer ID is required' })
    }

    let customerID = data.customer_id;
    let company = await companyModel.getOne('medi_customer_business_information', {customer_id: customerID});

    return res.json({
        status: true,
        data: company
    });
}

const getHRSession = async (req, res, next) => {

    let data = req.body;
    let customerID = data.customer_id || null;
    let accessibility = 0;

    if(!customerID)
    {
        return res.json({
            status: false,
            message: "Customer ID not exist."
        });
    }

    let settings = await companyModel.getOne('medi_customer_purchase', {
        customer_id: customerID
    });

    let hrAccount = await companyModel.getOne('medi_customer_hr_accounts', {
        customer_id: customerID
    });
    
    if((Object.keys(settings || {})).length <= 0)
    {
        return res.json({
            status: false,
            message: "Customer purchase not found."
        });
    }

    if(parseInt(settings.qr) == 1 && parseInt(settings.wallet) == 1)
    {
        accessibility = 1;
    }

    return res.json({
        'hr_dashboard_id': hrAccount.hr_account_id,
        'customer_buy_start_id': customerID,
        'qr_payment': settings.qr,
        'wallet': settings.wallet,
        'accessibility': accessibility,
        'signed_in': true
    });
}

const notification = async (req, res, next) => {

}

const getPlanStatus = async (req, res, next) => {

    let data = req.query;
    let customerID = parseInt(data.customer_id);
    let result = await PlanHelper.getPlanExpiration(customerID, res);
    result['status'] = true;
    
    return res.json(result);

}

const getDependentStatus = async (req, res, next) => {

    let data = req.query;
    let customerID = parseInt(data.customer_id);
    
    let plan = await companyModel.aggregation('medi_customer_plans',
        [
            {$match: {customer_id: customerID}},
            {$sort:{created_at: -1}},
            {$limit:1}
        ]
    ); 
    plan = plan[0]
    console.log('plan', plan)
    if(plan)
    {
        let dependents = await companyModel.aggregation("medi_dependent_plan_status",
            [
                {$match: {customer_plan_id: plan.customer_plan_id}},
                {$sort:{created_at: -1}},
                {$limit:1}
            ]
        );
        dependents = dependents[0];

        if(dependents)
        {
            return res.json({
                status: true, 
                total_number_of_seats: dependents.dependent_head_count, 
                occupied_seats: dependents.dependent_enrolled_count, 
                vacant_seats: dependents.dependent_head_count - dependents.dependent_enrolled_count
            });
        }
    }

    return res.json({
        status: false
    });
}

const getIntroOverview = async (req, res, next) => {

    let data = req.query;
    if(!data.customer_id) {
        return res.status(400).json({ status: false, message: 'Customer ID is required' })
    }
    let customerID = parseInt(data.customer_id);
    let dataInfos = new Object();
    let endPlanDate = new Date();

    let company = await companyModel.getOne("medi_customer_business_information", {
        customer_id: customerID
    });

    if(!company)
    {
        return res.json({
            status: false,
            message: "Company has no Business Information."
        });
    }

    dataInfos.company_name = ucwords(company.company_name);
    dataInfos.contact_name = ucwords(`${company.contact.first_name} ${company.contact.last_name}`);

    let plan = await companyModel.aggregation('medi_customer_plans',
        [
            {$match: {customer_id: customerID}},
            {$sort:{created_at: -1}},
            {$limit:1}
        ]
    ); 
    plan = plan[0];
    if(!plan)
    {
        return res.json({
            status: false,
            message: "No customer plan."
        });
    }

    let employees = await companyModel.getOne("medi_customer_plan_status", {
        customer_plan_id: plan.customer_plan_id
    });

    let dependents = await companyModel.aggregation('medi_dependent_plan_status',
        [
            {$match: {customer_plan_id: plan.customer_plan_id}},
            {$sort:{created_at: -1}},
            {$limit:1}
        ]
    ); 
    dependents = dependents[0];
    console.log('employees', employees)
    console.log('dependents', dependents)
    if(dependents)
    {
        dataInfos.total_enrolled = parseInt(employees.employee_enrolled_count) + parseInt(dependents.dependent_enrolled_count);
        dataInfos.dependents = true;
    }
    else
    {
        dataInfos.total_enrolled = parseFloat(employees.employee_enrolled_count);
        dataInfos.dependents = false;
    }

    dataInfos.plan_start = moment(new Date(plan.plan_start)).format("YYYY-MM-DD");
    
    let activePlan = await companyModel.getOne("medi_customer_active_plans", {customer_plan_id: plan.customer_plan_id});
    
    if(parseInt(activePlan.plan_extenstion_enable) == 1)
    {
        let planExtension = await companyModel.getOne("medi_active_plan_extensions", {
            customer_active_plan_id: activePlan.customer_active_plan_id
        });

        if(planExtension)
        {
            if(planExtension.duration != "")
            {
                let calendar = (planExtension.duration).split(" ");
                let calendarType = "years";
                calendar = calendar[0];
                
                if(calendar == "month" || calendar == "months")
                {
                    calendarType = "months";
                }
                else if(calendar == "day" || calendar == "days")
                {
                    calendarType == "days";
                }
                endPlanDate = moment(new Date(planExtension.plan_start)).add(calendar[1], calendarType).format("YYYY-MM-DD");
            }
            else
            {
                endPlanDate = moment(new Date(plan.plan_start)).add(1,'years').format("YYYY-MM-DD");
            }
        }
        else
        {
            if(activePlan.duration != "")
            {
                let calendar = (activePlan.duration).split(" ");
                let calendarType = "years";
                calendar = calendar[0];
                
                if(calendar == "month" || calendar == "months")
                {
                    calendarType = "months";
                }
                else if(calendar == "day" || calendar == "days")
                {
                    calendarType == "days";
                }
                endPlanDate = moment(new Date(activePlan.plan_start)).add(calendar[1], calendarType).format("YYYY-MM-DD");
            }
            else
            {
                endPlanDate = moment(new Date(plan.plan_start)).add(1,'years').format("YYYY-MM-DD");
            }
        }
    }
    else
    {

        if(activePlan.duration != "")
        {
            let calendar = (activePlan.duration).split(" ");
            let calendarType = "years";
            calendar = calendar[0];
            
            if(calendar == "month" || calendar == "months")
            {
                calendarType = "months";
            }
            else if(calendar == "day" || calendar == "days")
            {
                calendarType == "days";
            }

            endPlanDate = moment(new Date(plan.plan_start)).add(calendar[1], calendarType).format("YYYY-MM-DD");
        }
        else
        {
            endPlanDate = moment(new Date(plan.plan_start)).add(1,'years').format("YYYY-MM-DD");
        }
    }

    dataInfos.plan_end = moment(new Date(endPlanDate)).subtract(1, 'days').format("YYYY-MM-DD");

    return res.json({
        status: true,
        data: dataInfos
    });
    
}

const getCurrentSpendingTotalDue = async (req, res, next) => {

    let data = req.query;
    if(!data.customer_id) {
        return res.status(400).json({ status: false, message: 'Customer ID is required' })
    }
    let customerID = parseInt(data.customer_id);
    let totalDue = 0;
    let dataDue = null;
    let statement = null;

    let spendings = await companyModel.getMany("medi_customer_spending_invoices", {
        customer_id: customerID 
    });

    // return res.json(spendings);

    await map(spendings, async element => {
        statement = await SpendingInvoiceLibrary.getInvoiceSpending( element.customer_spending_invoice_id, false );
        console.log('statement', statement);
        console.log('statement.total_consultation', statement.total_consultation)
        console.log('statement.total_in_network_amount', statement.total_in_network_amount)
        if(parseFloat(statement.total_in_network_amount) > 0 || parseFloat(statement.total_consultation) > 0)
        {
            totalDue = totalDue + parseFloat(statement.total_in_network_amount) + parseFloat(statement.total_consultation);
        }
    });

    console.log('totalDue', totalDue)
    dataDue = spendings[spendings.length -1];
    if(dataDue)
    {
        console.log('here')
        return res.json({
            status: true,
            spending_total_due: totalDue,
            due_date: moment(new Date(dataDue.invoice_due_date)).format("YYYY-MM-DD")
        });
    }
    else
    {
        return res.json({
            status: true,
            spending_total_due: format(parseFloat(totalDue), {noSeparator: true})
        });
    }
}

const getCurrentPlanTotalDue = async (req, res, next) => {
    // not yet
    let data = req.query;
    let endPlanDate = "";
    let totalDue = 0;
    let customerID = parseInt(data.customer_id);

    let plans = await companyModel.getMany('medi_customer_plans', {customer_id: customerID});
    
    if(plans.length > 0)
    {
        await map(plans, async planElement => {
            let spendingActivePlans = await companyModel.getMany("medi_customer_active_plans", { customer_plan_id: planElement.customer_plan_id });

            if(spendingActivePlans.length > 0)
            {
                await map(spendingActivePlans, async spendingActivePlansElement => {
                    let invoices = await companyModel.getMany("medi_active_plan_invoices", { customer_active_plan_id: spendingActivePlansElement.customer_active_plan_id, isPaid: 0 });

                    if(invoices.length > 0)
                    {
                        await map(invoices, async invoicesElement => {
                            console.log('invoicesElement', invoicesElement)
                            let amount = 0;

                            if(parseInt(invoicesElement.plan_extention_enable) != 1)
                            {
                                if(spendingActivePlansElement.new_head_count == 0)
                                {
                                    amount = parseFloat(invoicesElement.individual_price) * parseFloat(invoicesElement.employees);
                                } else {
                                    let firstPlan = await companyModel.getOne("medi_customer_active_plans", { customer_active_plan_id: invoicesElement.customer_active_plan_id })
                                    plan = await companyModel.getOne("medi_customer_plans", { customer_plan_id: firstPlan.customer_plan_id })
                                    // return res.json(plan);
                                    
                                    if(firstPlan.duration != "")
                                    {
                                        let calendar = (firstPlan.duration).split(" ");
                                        let typeOfMonth = "years";

                                        if(calendar[1] == "day" || calendar[1] == "days")
                                        {
                                            typeOfMonth = "days";
                                        }else if(calendar[1] == "month" || calendar[1] == "months")
                                        {
                                            typeOfMonth = "months";
                                        }

                                        endPlanDate = moment(firstPlan.plan_start).add(calendar[0], typeOfMonth).format("YYYY-MM-DD")
                                    }
                                    else
                                    {
                                        endPlanDate = moment(new Date()).add(1, "years").format("YYYY-MM-DD")
                                    }

                                    let calculatedPrices = await PlanHelper.calculateInvoicePlanPrice(invoicesElement.individual_price, spendingActivePlansElement.plan_start, endPlanDate);
                                    amount = invoicesElement.employees * calculatedPrices;
                                }
                            } else {

                            }
                            totalDue = totalDue + amount;
                        })
                    }
                    
                    
                })
            }
        })
    }

    return res.json({
        status: true,
        total_due: totalDue
    });
        
}

module.exports = {
    getPlanStatus,
    getCurrentSpendingTotalDue,
    getCurrentPlanTotalDue,
    getDependentStatus,
    getIntroOverview,
    checkBalance,
    enrollmentProgress,
    taskList,
    notification,
    getHRSession,
    details
}
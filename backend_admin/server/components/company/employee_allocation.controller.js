require('express-async-errors');
require('dotenv').config();
const APPPATH = require('app-root-path');
const PlanHelper = require(`${APPPATH}/server/helpers/plan.helper.js`);
const StringHelper = require(`${APPPATH}/server/helpers/string.helper.js`);
const moment = require('moment');
const { map } = require('p-iteration');
const format=require('format-number');
const ucwords=require('ucwords');
const companyModel = require('./company.model');
const validate = require('./employee.validator');
const _ = require('lodash');
const sha256 = require('sha256');
const WalletHelper = require(`${APPPATH}/server/helpers/wallet.helper.js`);
const CustomerCreditsHelper = require(`${APPPATH}/server/helpers/customerCredits.helper.js`);
const CustomerCreditLogsHelper = require(`${APPPATH}/server/helpers/customerCreditLogs.helper.js`);
const WalletHistoryHelper = require(`${APPPATH}/server/helpers/walletHistory.helper.js`);
const SystemLogLibrary = require(`${APPPATH}/server/helpers/systemLogLibrary.helper.js`);
const mongoose = require('mongoose');
const global_helper = require("./../../helpers/global.helper.js");

const hrStatus = async (req, res, next) => {

    let data = req.body;
    let customerID = data.customer_id;
    let accessibility = 0;

    if(!customerID)
    {
        return res.json({
            status: false,
            message: "Customer ID not exist."
        });
    }

    let settings = await companyModel.getItemPartition(
        {
            indexValue: customerID,
            table: "medi_customer_purchase",
            limit: 1
        },res
    );

    let hrAccount = await companyModel.getItemPartition(
        {
            secondaryIndex: true,
            indexName: 'CustomerIdIndex',
            indexValue: customerID,
            table: "medi_customer_hr_accounts",
            limit: 1
        },res
    );
    hrAccount = hrAccount.Items[0].attrs;
    
    if(settings.Count <= 0)
    {
        return res.json({
            status: false,
            message: "Customer purchase not found."
        });
    }
    settings = settings.Items[0].attrs;

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

const userCompanyCreditsAllocated = async(req, res, nex) =>
{

    let data = req.body;
    let customerID = data.customer_id;
    let companyCredits = null;
    let allocated = 0;
    let totalAllocation = 0;
    let deletedEmployeeAllocation = 0;
    let totalDeductionCredits = 0;

    let allocatedWellness = 0;
    let totalAllocationWellness = 0;
    let deletedEmployeeAllocationWellness = 0;
    let totalWellnessAllocated = 0;
    let totalDeductionCreditsWellness = 0;
    let totalMedicalAllocation = 0;
    let totalMedicalAllocated = 0;
    let credits = 0;
    let getAllocationSpent = 0;
    let creditsWellness = 0;
    let getAllocationSpentWellness = 0;
    let totalMedicalBalance = 0;
    let totalWellnessBalance = 0;   
    
    let checkAccessibility = await hrStatus(req, res, next);
    
    if(checkAccessibility.accessibility == 1)
    {
        companyCredits = await companyModel.getItemPartition({
            table: "medi_customer_wallets",
            secondaryIndex: true,
            indexName: "CustomerIdIndex",
            indexValue: customerID,
            limit: 1
        }, res);

        if(companyCredits.Count > 0)
        {
            companyCredits = companyCredits.Items[0].attrs;
        }
        
        let customerCreditResetMedical = await companyModel.getItemEqual({
            table: "medi_wallet_resets",
            conditions: [
                {
                    whereField: "id",
                    whereValue: customerID
                },
                {
                    whereField: "spending_type",
                    whereValue: "medical"
                },
                {
                    whereField: "user_type",
                    whereValue: "company"
                }
            ],
            descending: true,
            limit: 1
        }, res);

        if(customerCreditResetMedical.Count > 0)
        {
            customerCreditResetMedical = customerCreditResetMedical.Items[0].attrs;

            let date = moment(new Date(customerCreditResetMedical.date_resetted)).format("z");
            let tempTotalAllocation = await companyModel.getItemEqual({
                table: "medi_customer_wallet_history",
                conditions: [
                    {
                        whereField: "customer_wallet_id",
                        whereValue: companyCredits.customer_wallet_id
                    },
                    {
                        whereField: "wallet_type",
                        whereValue: "medical"
                    },
                    {
                        in: {
                            whereField: "type",
                            whereValue: ["admin_deducted_credits","admin_added_credits"]
                        }
                    },
                    {
                        gte: {
                            whereField: "created_at",
                            whereValue: date
                        }
                    }
                ]
            }, res);
            
            if(tempTotalAllocation.Count > 0)
            {
                let admin_deducted_credits = 0;
                let admin_added_credits = 0;

                tempTotalAllocation = (tempTotalAllocation.Items).map(function(el){
                    if( el.attrs.type == "admin_deducted_credits" ){
                        admin_deducted_credits = admin_deducted_credits + el.attrs.credit;
                    }
                    else
                    {
                        admin_added_credits = admin_added_credits + el.attrs.credit;
                    }
                });

                tempTotalAllocation['temp_total_allocation'] = admin_deducted_credits;
                tempTotalAllocation['temp_total_deduction'] = admin_added_credits;
            }
            else
            {
                tempTotalAllocation['temp_total_allocation'] = 0;
                tempTotalAllocation['temp_total_deduction'] = 0;
            }
        }
        else
        {
            customerCreditResetMedical = customerCreditResetMedical.Items[0].attrs;

            let date = moment(new Date(customerCreditResetMedical.date_resetted)).format("z");
            let tempTotalAllocation = await companyModel.getItemEqual({
                table: "medi_customer_wallet_history",
                conditions: [
                    {
                        whereField: "customer_wallet_id",
                        whereValue: companyCredits.customer_wallet_id
                    },
                    {
                        whereField: "wallet_type",
                        whereValue: "medical"
                    },
                    {
                        whereField: "customer_id",
                        whereValue: customerID
                    },
                    {
                        in: {
                            whereField: "type",
                            whereValue: ["admin_deducted_credits","admin_added_credits"]
                        }
                    },
                    {
                        gte: {
                            whereField: "created_at",
                            whereValue: date
                        }
                    }
                ]
            }, res);
            
            if(tempTotalAllocation.Count > 0)
            {
                let admin_deducted_credits = 0;
                let admin_added_credits = 0;

                tempTotalAllocation = (tempTotalAllocation.Items).map(function(el){
                    if( el.attrs.type == "admin_deducted_credits" ){
                        admin_deducted_credits = admin_deducted_credits + el.attrs.credit;
                    }
                    else
                    {
                        admin_added_credits = admin_added_credits + el.attrs.credit;
                    }
                });

                tempTotalAllocation['temp_total_allocation'] = admin_deducted_credits;
                tempTotalAllocation['temp_total_deduction'] = admin_added_credits;
            }
            else
            {
                tempTotalAllocation['temp_total_allocation'] = 0;
                tempTotalAllocation['temp_total_deduction'] = 0;
            }
        }

        totalMedicalAllocation = tempTotalAllocation['temp_total_allocation'] - tempTotalAllocation['temp_total_deduction']

        let customerCreditResetWellness = await companyModel.getItemEqual({
            table: "medi_wallet_resets",
            conditions: [
                {
                    whereField: "id",
                    whereValue: customerID
                },
                {
                    whereField: "spending_type",
                    whereValue: "wellness"
                },
                {
                    whereField: "user_type",
                    whereValue: "company"
                }
            ],
            descending: true,
            limit: 1
        }, res);

        if(customerCreditResetWellness.Count > 0)
        {
            customerCreditResetWellness = customerCreditResetWellness.Items[0].attrs;

            let date = moment(new Date(customerCreditResetWellness.date_resetted)).format("z");
            let tempTotalAllocation = await companyModel.getItemEqual({
                table: "medi_customer_wallet_history",
                conditions: [
                    {
                        whereField: "customer_wallet_id",
                        whereValue: companyCredits.customer_wallet_id
                    },
                    {
                        whereField: "wallet_type",
                        whereValue: "medical"
                    },
                    {
                        in: {
                            whereField: "type",
                            whereValue: ["admin_deducted_credits","admin_added_credits"]
                        }
                    },
                    {
                        gte: {
                            whereField: "created_at",
                            whereValue: date
                        }
                    }
                ]
            }, res);
            
            if(tempTotalAllocation.Count > 0)
            {
                let admin_deducted_credits = 0;
                let admin_added_credits = 0;

                tempTotalAllocation = (tempTotalAllocation.Items).map(function(el){
                    if( el.attrs.type == "admin_deducted_credits" ){
                        admin_deducted_credits = admin_deducted_credits + el.attrs.credit;
                    }
                    else
                    {
                        admin_added_credits = admin_added_credits + el.attrs.credit;
                    }
                });

                tempTotalAllocation['temp_total_allocation'] = admin_deducted_credits;
                tempTotalAllocation['temp_total_deduction'] = admin_added_credits;
            }
            else
            {
                tempTotalAllocation['temp_total_allocation'] = 0;
                tempTotalAllocation['temp_total_deduction'] = 0;
            }
        }
        else
        {
            customerCreditResetWellness = customerCreditResetWellness.Items[0].attrs;

            let date = moment(new Date(customerCreditResetWellness.date_resetted)).format("z");
            let tempTotalAllocation = await companyModel.getItemEqual({
                table: "medi_customer_wallet_history",
                conditions: [
                    {
                        whereField: "customer_wallet_id",
                        whereValue: companyCredits.customer_wallet_id
                    },
                    {
                        whereField: "wallet_type",
                        whereValue: "wellness"
                    },
                    {
                        whereField: "customer_id",
                        whereValue: customerID
                    },
                    {
                        in: {
                            whereField: "type",
                            whereValue: ["admin_deducted_credits","admin_added_credits"]
                        }
                    },
                    {
                        gte: {
                            whereField: "created_at",
                            whereValue: date
                        }
                    }
                ]
            }, res);
            
            if(tempTotalAllocation.Count > 0)
            {
                let admin_deducted_credits = 0;
                let admin_added_credits = 0;

                tempTotalAllocation = (tempTotalAllocation.Items).map(function(el){
                    if( el.attrs.type == "admin_deducted_credits" ){
                        admin_deducted_credits = admin_deducted_credits + el.attrs.credit;
                    }
                    else
                    {
                        admin_added_credits = admin_added_credits + el.attrs.credit;
                    }
                });

                tempTotalAllocation['temp_total_allocation_wellness'] = admin_deducted_credits;
                tempTotalAllocation['temp_total_deduction_wellness'] = admin_added_credits;
            }
            else
            {
                tempTotalAllocation['temp_total_allocation_wellness'] = 0;
                tempTotalAllocation['temp_total_deduction_wellness'] = 0;
            }
        }

        let totalAllocationWellness = tempTotalAllocation['temp_total_allocation_wellness'] - tempTotalAllocation['temp_total_deduction_wellness']

        let userAllocated = PlanHelper.getCorporateUserByAllocated(customerID,customerID);
    
        _.forEach(userAllocated, async userAllocatedElement => {
            let wallet = await companyModel.getItemEqual({
                table: "medi_member_wallet",
                conditions: [
                    {
                        whereField: "member_id",
                        whereValue: userAllocatedElement
                    }
                ],
                limit: 1
            }, res);

            let medical_wallet = await PlanHelper.memberMedicalAllocatedCredits(wallet.member_wallet_id, userAllocatedElement, "medical", res);
            let wellness_wallet = await PlanHelper.memberWellnessAllocatedCredits(wallet.member_wallet_id, userAllocatedElement, "wellness", res);
            
            getAllocationSpent = getAllocationSpent + medical_wallet.getAllocationSpent;
            allocated = allocated + medical_wallet.allocation;

            totalDeductionCredits = totalDeductionCredits + medical_wallet.totalDeductionCredits;
            deletedEmployeeAllocation = totalDeductionCredits + medical_wallet.deletedEmployeeAllocation;
            totalMedicalBalance = totalMedicalBalance + medical_wallet.medWellBalance;
        
            getAllocationSpentWellness = getAllocationSpentWellness + wellness_wallet.getAllocationSpent;
            allocatedWellness = allocatedWellness + wellness_wallet.allocation;
            totalDeductionCreditsWellness = totalDeductionCreditsWellness + wellness_wallet.totalDeductionCredits;
            deletedEmployeeAllocationWellness = deletedEmployeeAllocationWellness + wellness_wallet.deletedEmployeeAllocation;
            totalWellnessBalance = totalWellnessBalance + wellness_wallet.medWellBalance;
        })
            
        totalMedicalAllocated = allocated - deletedEmployeeAllocation;
        totalWellnessAllocated = allocatedWellness - deletedEmployeeAllocationWellness;

        credits = totalMedicalAllocation - totalMedicalAllocated;
        creditsWellness = totalAllocationWellness - totalWellnessAllocated;

        companyCredits = await companyModel.getItemPartition(
            {
                secondaryIndex: true,
                indexName: "CustomerIdIndex",
                indexValue: customerID,
                table: "medi_customer_wallets"
            },res
        );

        if( companyCredits.Count > 0 && companyCredits.Items[0].attrs.medical_balance != credits)
        {
            await map(companyCredits.Items, async companyCreditsElement => {
                companyCreditsElement = companyCreditsElement.attrs;
                await companyModel.updateDataEq({
                    table: "medi_customer_wallets",
                    data: {
                        customer_wallet_id: companyCreditsElement.customer_wallet_id,
                        medical_balance: credits
                    }
            
                , res})

            })
        }

        if(companyCredits.Count > 0 && companyCredits.Items[0].attrs.wellness_balance != creditsWellness)
        {
            await map(companyCredits.Items, async companyCreditsElement => {
                companyCreditsElement = companyCreditsElement.attrs;
                await companyModel.updateDataEq({
                    table: "medi_customer_wallets",
                    data: {
                        customer_wallet_id: companyCreditsElement.customer_wallet_id,
                        wellness_balance: creditsWellness
                    }
            
                , res})

            })

        }
    }


    return res.json({
        total_medical_company_allocation: totalMedicalAllocation,
        total_medical_company_unallocation: credits,
        total_medical_employee_allocated: totalMedicalAllocated,
        total_medical_employee_spent: getAllocationSpent,
        total_medical_employee_balance: totalMedicalBalance,
        total_medical_employee_balance_number: totalMedicalBalance,
        total_medical_wellness_allocation: totalAllocationWellness,
        total_medical_wellness_unallocation: creditsWellness,
        total_wellness_employee_allocated: totalWellnessAllocated,
        total_wellness_employee_spent: getAllocationSpentWellness,
        total_wellness_employee_balance: totalWellnessBalance,
        total_wellness_employee_balance_number: totalWellnessBalance,
        company_id: customerID
    });
}


const carePlanJson = async (req, res, next) => {
    return res.json({
        status: true,
        data: [
            {
                "job_title":"Accounting, Audit, Finance"
            },
            {
                "job_title":"Administration Support"
            },
            {
                "job_title":"Arts/Cultural/Heritage"
            },
            {
                "job_title":"Building and Estate Management"
            },
            {
                "job_title":"Conciliation/Mediation"
            },
            {
                "job_title":"Corporate Strategy/Top Management"
            },
            {
                "job_title":"Customer Service"
            },
            {
                "job_title":"Economics/Statistics"
            },
            {
                "job_title":"Education"
            },
            {
                "job_title":"Engineering"
            },
            {
                "job_title":"Healthcare"
            },
            {
                "job_title":"Human Resources"
            },
            {
                "job_title":"InfoComm, Technology, New Media Communications"
            },
            {
                "job_title":"International Relations"
            },
            {
                "job_title":"Landscape/Horticulture"
            },
            {
                "job_title":"Law/Legal Services"
            },
            {
                "job_title":"Logistics/Supply Chain"
            },
            {
                "job_title":"Marketing/Business Development"
            },
            {
                "job_title":"Orgnisation Development"
            },
            {
                "job_title":"Policy Formulation"
            },
            {
                "job_title":"Public Relations/Corporate Communications/Psychology"
            },
            {
                "job_title":"Research and Analysis"
            },
            {
                "job_title":"Sales/Telesales/Telemarketing"
            },
            {
                "job_title":"Self-Employed"
            },
            {
                "job_title":"Sciences (e.g. life sciences, bio-technology etc.)"
            },
            {
                "job_title":"Social and Community Development"
            },
            {
                "job_title":"Statistics"
            },
            {
                "job_title":"Training and Development"
            },
            {
                "job_title":"Translators/Interpreters"
            },
            {
                "job_title":"Others"
            }
        ]
    })
}

const employeeLists = async (req, res, next) => {
    let data = req.body;
    let customerID = data.customer_id;
    
    if(!customerID) {
        return res.status(400).json({status: false, message: 'Customer ID is required.'});
    }

    let pageNumber = data.page ? parseInt(data.page) : 1;
    let listLimit = data.limit ? data.limit : 5;
    let count = 0;
    let startPushCounter = (pageNumber * listLimit) - listLimit;
    let lastPushCounter = (pageNumber * listLimit);
    let expiryDate = null;

    // let accountLink = await companyModel.getItemPartition({
    //     table: "medi_customer_purchase",
    //     indexValue: customerID,
    //     limit: 1
    // }, res);

    // accountLink = accountLink.Items[0].attrs;
    let finalUser = new Array();

    let usersData = new Array();

    let companyMembersContainer = await companyModel.getItemEqual({
        table: "medi_company_members",
        conditions: {
            whereField: "customer_id",
            whereValue: customerID
        }
    }, res);

    if(companyMembersContainer.Count > 0)
    {

        await map(companyMembersContainer.Items, async companyMembersContainerElement => {
            companyMembersContainerElement = companyMembersContainerElement.attrs;
            count = count + 1;

            if(count >= startPushCounter && lastPushCounter >= count)
            {

                let userContainerElement = await companyModel.getItemPartition({
                    secondaryIndex: true,
                    indexName: 'MemberIdIndex',
                    indexValue: companyMembersContainerElement.member_id,
                    table: "medi_members",
                    limit: 1
                }, res);

                userContainerElement = userContainerElement.Items[0].attrs;
                usersData.push({
                    member_id: userContainerElement.member_id,
                    fullname: userContainerElement.fullname,
                    email: userContainerElement.email,
                    nric: userContainerElement.nric,
                    phone_no: userContainerElement.phone_no,
                    job_title: userContainerElement.job_title,
                    dob: userContainerElement.dob,
                    created_at: userContainerElement.created_at,
                    deleted: userContainerElement.deleted,
                    zip_code: userContainerElement.zip_code,
                    bank_account_number: userContainerElement.bank_account_number
                });
            }
        });
    }

    let dataReturn = await getPaginateEmloyees({
        res, 
        customerID, 
        pageNumber, 
        listLimit, 
        count, 
        startPushCounter, 
        lastPushCounter, 
        // accountLink, 
        finalUser,
        usersData
    });

    console.warn('dataReturn',dataReturn)

    return res.json(dataReturn)
}

const getPaginateEmloyees = async (dataReferences) => {

    let res = dataReferences.res;
    let customerID = dataReferences.customerID;
    let pageNumber = dataReferences.pageNumber; 
    let listLimit = dataReferences.listLimit;
    let count = dataReferences.count;
    let startPushCounter = dataReferences.startPushCounter;
    let lastPushCounter = dataReferences.lastPushCounter;
    // let accountLink = dataReferences.accountLink;
    let finalUser = dataReferences.finalUser;
    let usersData = dataReferences.usersData;
    

    let paginate = {
        last_page: ((count/listLimit > 1) ? parseInt((count/listLimit)) : 1),
        current_page: pageNumber
    }

    let medicalCreditData = null;
    let wellnessCreditData = null;

    await map(usersData, async userElement => {
        console.log('userElement', userElement)
        let ids = await StringHelper.getSubAccountsID(userElement.member_id, res);

        let wallet = await companyModel.getItemEqual({
            table: "medi_member_wallet",
            indexName: "MemberIdIndex",
            indexValue: userElement.member_id,
            descending: true,
            limit: 1
        }, res);
        wallet = wallet.Items[0].attrs;

        medicalCreditData = await PlanHelper.memberMedicalAllocatedCredits(wallet.member_wallet_id, userElement.member_id, "medical",res);
        wellnessCreditData = await PlanHelper.memberWellnessAllocatedCredits(wallet.member_wallet_id, userElement.member_id, "wellness", res);
        

    
        let deletion = await companyModel.getItemPartition({
            table: "medi_customer_employee_plan_refund_details",
            indexName: "MemberIdIndex",
            indexValue: userElement.member_id,
            descending: true,
            limit: 1
        }, res);

        let dependents = await companyModel.countCollection({
            table: "medi_member_covered_dependents",
            conditions: [{
                whereField: 'owner_id',
                whereValue: userElement.member_id
            },{
                whereField: 'deleted',
                whereValue: 0
            }]
        }, res);
        
        
        let planTier = new Object();

        let flag = false

        let planTierUsers = await companyModel.getItemPartition({
            table: "medi_customer_plan_tier_users",
            secondaryIndex: true,
            indexName: "MemberIdIndex",
            indexValue: userElement.member_id
        }, res);

        await map(planTierUsers, async planTierUsersElement => {
            if(!flag)
            {
                let planTiers = await companyModel.getItemPartition({
                    table: "medi_customer_plan_tiers",
                    indexValue: planTierUsersElement.plan_tier_id,
                    limit: 1
                }, res);
    
                if(planTiers.Count > 0)
                {
                    planTier = planTiers.Items[0].attrs;
                    flag = true;
                }
            }
        });
        
        let getEmployeePlan = await companyModel.getItemPartition({
            table: "medi_member_plan_history",
            secondaryIndex: true,
            indexName: "MemberIdIndex",
            indexValue: userElement.member_id,
            descending: true,
            limit: 1
        }, res);
        getEmployeePlan = getEmployeePlan.Items[0].attrs;
        
        let userActivePlanHistory = await companyModel.getItemEqual({
            table: "medi_member_plan_history",
            descending: true,
            limit: 1,
            conditions: [{
                whereField: 'member_id',
                whereValue: userElement.member_id
            },{
                whereField: 'type',
                whereValue: 'started'
            }]
        });
        userActivePlanHistory = userActivePlanHistory.Items[0].attrs;


        let replace = await companyModel.getItemEqual({
            table: "medi_customer_replace_employee",
            descending: true,
            limit: 1,
            conditions: [{
                whereField: 'member_id',
                whereValue: userElement.member_id
            },{
                whereField: 'active_plan_id',
                whereValue: userActivePlanHistory.customer_active_plan_id
            }]
        });
        

        let activePlan = await companyModel.getItemPartition({
            table: "medi_customer_active_plans",
            indexValue: userActivePlanHistory.customer_active_plan_id,
            limit: 1,
        });

        activePlan = activePlan.Items[0].attrs;
        
        let planName = null;
        let expiryDate = null;
        
        if(activePlan.account_type == 'stand_alone_plan') {
            planName = "Pro Plan";
        } else if(activePlan.account_type == 'insurance_bundle') {
            planName = "Insurance Bundle";
        } else if(activePlan.account_type == 'trial_plan'){
            planName = "Trial Plan";
        } else if(activePlan.account_type== 'lite_plan') {
            planName = "Lite Plan";
        }

        if(replace.Count > 0)
        {
            replace = replace.Items[0].attrs;
            expiryDate = moment(new Date(replace.expired_and_activate)).format("YYYY-MM-DD");
        }
        else
        {

            let planUserHistory = await companyModel.getItemEqual({
                table: "medi_member_plan_history",
                conditions: [{
                    whereField: "member_id",
                    whereValue: userElement.member_id
                },{
                    whereField: "type",
                    whereValue: "started"
                }],
                descending: true,
                limit: 1
            }, res);

            if(planUserHistory.Count <= 0)
            {
                await PlanHelper.createUserPlanHistory(userElement.member_id, customerID);
                planUserHistory = await companyModel.getItemEqual({            
                    table: "medi_member_plan_history",
                    descending: true,
                    limit: 1,
                    conditions: [{
                        whereField: "member_id",
                        whereValue: userElement.member_id
                    },{
                        whereField: "type",
                        whereValue: "started"
                    }]
                }, res);
                planUserHistory = planUserHistory.Items[0].attrs;
            }
            else
            {
                planUserHistory = planUserHistory.Items[0].attrs;
            }
        
            activePlan = await companyModel.getItemPartition({
                table: "medi_customer_active_plans",
                indexValue: userActivePlanHistory.customer_active_plan_id,
                limit: 1,
            });
            activePlan = activePlan.Items[0].attrs;
            
            let plan = await companyModel.getItemPartition({
                table: "medi_customer_plans",
                indexValue: activePlan.customer_plan_id,
                limit: 1,
            });
            plan = plan.Items[0].attrs;
            
            let activePlanFirst = await companyModel.getItemPartition({
                table: "medi_customer_active_plans",
                secondaryIndex: true,
                indexName: "CustomerPlanIdIndex",
                indexValue: activePlan.customer_plan_id,
                limit: 1,
            });
            activePlanFirst = activePlanFirst.Items[0].attrs;
            
            let planUser = await companyModel.getItemPartition({
                table: "medi_member_plan_history",
                secondaryIndex: true,
                indexName: "MemberIdIndex",
                indexValue: userElement.member_id,
                descending: true,
                limit: 1
            },res);   
            planUser = planUser.Items[0].attrs;

            if(parseInt(activePlanFirst.plan_extension_enable) == 1)
            {         
                let activePlanExtension = await companyModel.getItemPartition({
                    table: 'medi_active_plan_extensions',
                    secondaryIndex: true,
                    indexName: "CustomerActivePlanIdIndex",
                    indexValue: activePlanFirst.customer_active_plan_id,
                    limit: 1
                }, res);
                activePlanExtension = activePlanExtension.Items[0].attrs;

                if(parseInt(planUser.fixed) == 1)
                {
                    let calendarType = (activePlanExtension.duration).split(" ");
                    let typeOfCalendar = "years";

                    if(calendarType[1] == "month" || calendarType[1] == "months")
                    {
                        typeOfCalendar = "months";
                    }
                    else if(calendarType[1] == "day" || calendarType[1] == "days")
                    {
                        typeOfCalendar = "days";
                    }

                    let tempValiDate = moment(new Date(activePlanExtension.plan_start)).add(calendarType[0], typeOfCalendar);
                    expiryDate = moment(new Date(tempValiDate)).subtract(1, "days");
                }
                else if(parseInt(planUser.fixed) == 1)
                {
                    let calendarType = (planUser.duration).split(" ");
                    let typeOfCalendar = "years";

                    if(calendarType[1] == "month" || calendarType[1] == "months")
                    {
                        typeOfCalendar = "months";
                    }
                    else if(calendarType[1] == "day" || calendarType[1] == "days")
                    {
                        typeOfCalendar = "days";
                    }

                    let tempValiDate = moment(new Date(planUser.plan_start)).add(calendarType[0], typeOfCalendar);
                    expiryDate = moment(new Date(tempValiDate)).subtract(1, "days");
                }
            }
            else
            {
                plan = await companyModel.getItemPartition({
                    table: "medi_customer_plans",
                    indexValue: activePlan.customer_plan_id,
                    limit: 1
                }, res);
                plan = plan.Items[0].attrs;

                if(parseInt(planUser.fixed) == 1)
                {
                    let calendarType = (activePlanFirst.duration).split(" ");
                    let typeOfCalendar = "years";

                    if(calendarType[1] == "month" || calendarType[1] == "months")
                    {
                        typeOfCalendar = "months";
                    }
                    else if(calendarType[1] == "day" || calendarType[1] == "days")
                    {
                        typeOfCalendar = "days";
                    }

                    let tempValiDate = moment(new Date(activePlanFirst.plan_start)).add(calendarType[0], typeOfCalendar);
                    expiryDate = moment(new Date(tempValiDate)).subtract(1, "days");
                }
                else if(parseInt(planUser.fixed) == 1)
                {
                    let calendarType = (planUser.duration).split(" ");
                    let typeOfCalendar = "years";

                    if(calendarType[1] == "month" || calendarType[1] == "months")
                    {
                        typeOfCalendar = "months";
                    }
                    else if(calendarType[1] == "day" || calendarType[1] == "days")
                    {
                        typeOfCalendar = "days";
                    }

                    let tempValiDate = moment(new Date(planUser.plan_start)).add(calendarType[0], typeOfCalendar);
                    expiryDate = moment(new Date(tempValiDate)).subtract(1, "days");
                }
            }
        }

        let deletionText = null;

        if(deletion.Count > 0)
        {
            expiryDate = moment(new Date(deletion.Items[0].attrs.date_withdraw)).format("DD MMMM, YY");
            deletionText = "Schedule for deletion: ".expiryDate;
        }
        else
        {
            if(moment(new Date()).diff(moment(new Date(expiryDate)), "days") < 0)
            {
                deletionText = "Care Plan For this Member is expired: " . expiryDate;
                deletion = true;
            }
        }
        
        let creditBalance = parseFloat(wallet.medical_balance)
        
        let medicationContainer = await companyModel.getItemEqual({
            table: "medi_out_of_network",
            conditions: [
                {
                    in: {
                        whereField: "member_id",
                        whereValue: ids
                    }
                },
                {
                    in: {
                        whereField: "spending_type",
                        whereValue: ["medical", "medical"]
                    }
                }
            ],
            attributes: ["claim_amount","spending_type"]
        }, res)

        let eClaimAmountPendingMedication = 0;
        let eClaimAmountPendingWellness = 0;

        medicationContainer = (medicationContainer.Items).map(function(el){
            if(el.attrs.spending_type == "medical")
            {
                eClaimAmountPendingMedication = eClaimAmountPendingMedication + el.attrs.claim_amount;
            }
            else
            {
                eClaimAmountPendingWellness = eClaimAmountPendingWellness + el.attrs.claim_amount;
            }
            return el.attrs.claim_amount;
        })
        
        let medical =  {
            credits_allocation: medicalCreditData.allocation,
            credits_spent: medicalCreditData.getAllocationSpent,
            balance:  medicalCreditData.allocation - medicalCreditData.getAllocationSpent,
            e_claim_amount_pending_medication: eClaimAmountPendingMedication
        }

        let wellness =  {
            credits_allocation_wellness: wellnessCreditData.allocation,
            credits_spent_wellness: wellnessCreditData.getAllocationSpent,
            balance: wellnessCreditData.allocation - wellnessCreditData.getAllocationSpent,
            e_claim_amount_pending_wellness: eClaimAmountPendingWellness
        }
        
        let name = (userElement.fullname).split("(").length > 1 ? (userElement.fullname).split("(") : false;
        
        name = name ? name[0].split(" ") : (userElement.fullname).split(" ");
        let firstName = "";
        let lastName = "";       

        if(name[0].length > 0 && name[1].length > 0)
        {
            firstName = name[0];
            lastName = name[1];
        }
        else
        {
            firstName = userElement.fullname;
            lastName = userElement.fullname;
        }

        let memberID = (userElement.member_id).padStart(6, '0')

        finalUser.push({
            'spending_account': {
                'medical' : medical,
                'wellness': wellness
            },
            'dependents'	  	: dependents,
            'plan_tier'			: planTier,
            'name'				: userElement.fullname,
            'first_name'		: firstName,
            'last_name'			: lastName,
            'email'				: userElement.email,
            'enrollment_date' 	: userElement.created_at,
            'plan_name'			: planName,
            'start_date'		: getEmployeePlan.plan_start,
            'expiry_date'		: expiryDate,
            'wallet_id'			: wallet.wallet_id,
            'credits'			: creditBalance,
            'user_id'			: userElement.member_id,
            'member_id'			: memberID,
            'nric'				: userElement.nric,
            'phone_no'			: userElement.phone_no,
            'job_title'			: userElement.job_title,
            'dob'			    : userElement.dob,
            'postal_code'		: userElement.zip_code,
            'bank_account_number'		: userElement.bank_account_number,
            // 'company'			: userElement.company_name
            'employee_plan'		: getEmployeePlan,
            'deletion'			: deletion ? true : false,
            'deletion_text'		: deletionText
        });

    });

    paginate.data = finalUser;
        
    return {status: true, paginate};
}

const getHRSession = async (req, res, next) => {

    let data = req.body;
    let customerID = data.customer_id;
    let accessibility = 0;

    if(!customerID)
    {
        return res.json({
            status: false,
            message: "Customer ID not exist."
        });
    }

    let settings = await companyModel.getItemPartition(
        {
            indexValue: customerID,
            table: "medi_customer_purchase",
            limit: 1
        },res
    );

    let hrAccount = await companyModel.getItemPartition(
        {
            secondaryIndex: true,
            indexName: 'CustomerIdIndex',
            indexValue: customerID,
            table: "medi_customer_hr_accounts",
            limit: 1
        },res
    );
    hrAccount = hrAccount.Items[0].attrs;
    
    if(settings.Count <= 0)
    {
        return res.json({
            status: false,
            message: "Customer purchase not found."
        });
    }
    settings = settings.Items[0].attrs;

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

const searchEmployee = async (req, res, next) => {

    let data = req.query;
    let customerID = data.customer_id;

    if(!customerID) {
        return res.status(400).json({status: false, message: 'Customer ID is required.'});
    }

    let pageNumber = data.page ? parseInt(data.page) : 1;
    let listLimit = data.limit ? data.limit : 5;
    let count = 0;
    let startPushCounter = (pageNumber * listLimit) - listLimit;
    let lastPushCounter = (pageNumber * listLimit);
    let expiryDate = null;

    // let accountLink = await companyModel.getItemPartition({
    //     table: "medi_customer_purchase",
    //     indexValue: customerID,
    //     limit: 1
    // }, res);

    // accountLink = accountLink.Items[0].attrs;
    let finalUser = new Array();

    let usersData = new Array();

    let companyMembersContainer = await companyModel.getItemEqual({
        table: "medi_company_members",
        conditions: {
            whereField: "customer_id",
            whereValue: customerID
        }
    }, res);

    if(companyMembersContainer.Count > 0)
    {

        await map(companyMembersContainer.Items, async companyMembersContainerElement => {
            companyMembersContainerElement = companyMembersContainerElement.attrs;
            count = count + 1;

            if(count >= startPushCounter && lastPushCounter >= count)
            {

                let userContainerElement = await companyModel.getMemberFilterExpression({
                    table: "medi_members",
                    limit: 1,
                    filterExpression: "contains(#fullname, :fullname) OR contains(#email, :email) OR contains(#nric, :nric)",
                    expressionAttributeValues: {
                        ':fullname' : params.search,
                        ':email' : params.search,
                        ':nric' : params.search
                    },
                    expressionAttributeNames: {
                        '#fullname': 'fullname',
                        '#email': 'email',
                        '#nric': 'nric'
                    }
                }, res);

                if(userContainerElement.Count > 0)
                {
                    userContainerElement = userContainerElement.Items[0].attrs;
                    usersData.push({
                        member_id: userContainerElement.member_id,
                        fullname: userContainerElement.fullname,
                        email: userContainerElement.email,
                        nric: userContainerElement.nric,
                        phone_no: userContainerElement.phone_no,
                        job_title: userContainerElement.job_title,
                        dob: userContainerElement.dob,
                        created_at: userContainerElement.created_at,
                        deleted: userContainerElement.deleted,
                        zip_code: userContainerElement.zip_code,
                        bank_account_number: userContainerElement.bank_account_number
                    });
                }

            }
        });
    }

    let dataReturn = await getPaginateEmloyees({
        res, 
        customerID, 
        pageNumber, 
        listLimit, 
        count, 
        startPushCounter, 
        lastPushCounter, 
        // accountLink, 
        finalUser,
        usersData
    });

    return res.json(dataReturn);
}

const confirmPassword = async (req, res, next) =>
{
    // $result = self::checkSession();
    // $input = Input::all();
    let data = req.body;
    let customerID = data.customer_id;
    let password = data.password;

    let check = companyModel.getItemEqual({
        table: "medi_customer_hr_accounts",
        conditions: [
            {
                whereField: "customer_id",
                whereValue: customerID
            },
            {
                whereField: "password",
                whereValue: sha256(password)
            }
        ],
        limit: 1
    }, res);
    // $check = DB::table('customer_hr_dashboard')->where('customer_buy_start_id', $result->customer_buy_start_id)->where('password', md5($input['password']))->count();

    if(check.Count > 0) {
        return {
            status: true,
            message: 'Success.'
        }
    }

    return {
        status: false,
        message: 'Invalid Password.'
    }
}

const allocateCreditBaseInActivePlan = async (customerID, credit, walletType) =>
{
    let plan = await companyModel.aggregation('medi_customer_plans',
        [
            {$match: {customer_id: customerID}},
            {$sort:{created_at: -1}},
            {$limit:1}
        ]
    );


    plan = plan[0];
    let activePlans = await companyModel.getMany('medi_customer_active_plans', { customer_plan_id: plan.customer_plan_id })

    let result = await map(activePlans, async activeElement => {
        let totalCredits = 0;
        let TemptotalAllocatedAmount = await companyModel.aggregation('medi_customer_wallet_history', [{
            $match : { $and : [ { customer_id: customerID }, { type: 'admin_added_credits' }, { wallet_type: walletType }] },
        },{
            $group : {
                _id : null,
                total : {
                    $sum : "$credit"
                }
            }
        }]);

        totalCredits = TemptotalAllocatedAmount[0].total;
    
        let user_ids = await companyModel.getIds('medi_member_plan_history', { 'customer_active_plan_id': activeElement.customer_active_plan_id }, 'member_id')
        let tempAllocation = 0;
        let tempDeductAllocation = 0;
        let tempWellnessAllocation = 0;
        let tempWellnessDeductAllocation = 0;
        // let totalWellnessAllocation = 0;
        let totalAllocation = 0; 


        let tempAllocationDataMember = await companyModel.aggregation("medi_member_wallet", [
            {   $lookup:{
                    from: "medi_member_wallet_histories",
                    localField : "member_wallet_id",
                    foreignField : "member_wallet_id",
                    as : "medi_member_wallet_histories"
                },
            },
            {   $unwind: "$medi_member_wallet_histories" },
            {   $match: { $and: [
                        {"medi_member_wallet_histories.wallet_type": (walletType == "medical" ? "medical" : "wellness")},
                        {"member_id": {
                            $in: user_ids
                        }},
                        {"medi_member_wallet_histories.customer_active_plan_id": activeElement.customer_active_plan_id}
                    ] }
            },
            {   $group: { 
                    _id: null,
                    total: {
                        $sum:{
                            $cond: { 
                                if: {$eq:["$medi_member_wallet_histories.type","added_by_hr"]}, 
                                then: "$medi_member_wallet_histories.credit",
                                else: "0"
                            }
                        }
                    },
                    total1: { 
                        $sum: {
                            $cond: { 
                                if: { $eq:["$medi_member_wallet_histories.type","deducted_by_hr"]}, 
                                then: "$medi_member_wallet_histories.credit",
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
        // return tempAllocationDataMember;
        console.log('tempAllocationDataMember', tempAllocationDataMember);

        if(tempAllocationDataMember.length > 0) {
            tempAllocationDataMember = tempAllocationDataMember[0].totalMWAllocation
            let total_unallocated_medical = totalCredits - tempAllocationDataMember;

            if(total_unallocated_medical > 0 && total_unallocated_medical > credit) {
                return activeElement.customer_active_plan_id;
            }
        } else {
            return false;
        }
    });

    
    if(result) {
        console.log('give directly')
        return result[0];
    } else {
        console.log('here baby')
        return activePlans[0].customer_active_plan_id;
    }
    
}

const allocateEmployeeCredits = async (req, res, next) =>
{

    try {

        let { created_at, updated_at } = await global_helper.createDate();
        let data = req.body;
        let memberID = null;
        let customerID = null;
        let credits = data.credits;
        let spendingType = data.spending_type;
        let allocationType = data.allocation_type;
        let customerActivePlanId = null;
        let adminID = data.admin_id;
        let employeeCreditsLeft = null;

        let validation = {
            customer_id: data.customer_id,
            member_id: data.member_id,
            spending_type: data.spending_type,
            allocation_type: data.allocation_type,
            credits: data.credits
        }

        isValid = await validate.joiValidate(validation, validate.allocationValidation, true)
    
        if(typeof isValid != 'boolean')
        {
            return res.status(400).json({
                status: false,
                message: isValid.details[0].message
            })
        }

        customerID = parseInt(validation.customer_id);
        memberID = parseInt(validation.member_id);

        // check customer
        let customer = await companyModel.getOne("medi_customer_purchase", { customer_id: validation.customer_id })

        if(!customer) {
            return res.status(400).json({ status: false, message: 'Customer does not exist' })
        }

        // check member
        let member = await companyModel.getOne("medi_members", { member_id: validation.member_id })

        if(!member) {
            return res.status(400).json({ status: false, message: 'Member does not exist' })
        }

        // get customer wallet
        let companyCredits = await companyModel.getOne('medi_customer_wallets', { customer_id: validation.customer_id })
        let wallet = await companyModel.getOne('medi_member_wallet', { member_id: validation.member_id })
        let walletID = wallet.member_wallet_id;

        if(spendingType == "medical" || spendingType == "wellness")
        {
            let resultCustomerActivePlan = await allocateCreditBaseInActivePlan(customerID, credits, spendingType);
            // return res.json(resultCustomerActivePlan)
            if(resultCustomerActivePlan)
            {
                customerActivePlanId = resultCustomerActivePlan;
            }
            else
            {
                customerActivePlanId = false;
            }
            
            if(( spendingType == "medical" ? companyCredits.medical_balance : companyCredits.wellness_balance) >= credits && allocationType == "add")
            {

                let walletResult = await WalletHelper.addCredits(
                    memberID,
                    credits,
                    spendingType
                );

                if(walletResult)
                {
                    
                    let customerCreditsResult = await CustomerCreditsHelper.deductCustomerCredits(companyCredits.customer_wallet_id, credits, spendingType);
                    if(customerCreditsResult)
                    {

                        let companyDeductLogs = {
                            customer_wallet_id: companyCredits.customer_wallet_id,
                            credit: (spendingType == "medical" ? credits: credits),
                            running_balance: (spendingType == "medical" ? parseFloat(companyCredits.medical_balance - credits)  : parseFloat(companyCredits.wellness_balance - credits)),
                            type: 'added_employee_credits',
                            employee_id: memberID,
                            customer_active_plan_id: customerActivePlanId,
                            wallet_type: spendingType,
                            currency_type: "sgd",
                            currency_value: 0,
                            created_at: created_at,
                            updated_at: updated_at
                        }
                        console.warn('companyDeductLogs',companyDeductLogs)
                        await CustomerCreditLogsHelper.createCustomerCreditLogs(companyDeductLogs);

                        let employeeCreditsLogs = {
                            member_wallet_id: walletID,
                            credit: credits,
                            running_balance: (spendingType == "medical" ? parseFloat(wallet.medical_balance + credits)  : parseFloat(wallet.wellness_balance + credits)),
                            type: "added_by_hr",
                            employee_id: memberID,
                            customer_active_plan_id: customerActivePlanId,
                            wallet_type: spendingType,
                            spend: "0",
                            created_at: created_at,
                            updated_at: updated_at
                        }

                        await WalletHistoryHelper.createWalletHistory(employeeCreditsLogs);
                        
                        console.log('adminID', adminID)
                        if(adminID)
                        {
                            SystemLogLibrary.createAdminLog({
                                admin_id: adminID,
                                admin_type: "mednefits",
                                type: "admin_hr_employee_allocate_credits",
                                data: data,
                                created_at: created_at,
                                updated_at: updated_at
                            })
                        }
                        else
                        {
                            SystemLogLibrary.createAdminLog({
                                admin_id: adminID,
                                admin_type: "hr",
                                type: "admin_hr_employee_allocate_credits",
                                data: data,
                                created_at: created_at,
                                updated_at: updated_at
                            })
                        }
                        
                        return res.json({
                            status: true,
                            message: 'Employee successfully assigned '+(spendingType == "medical" ? 'medical' : 'wellness') +' credits $' + credits
                        });                            
                    }
                    
                }
            } else {
                if(credits > (spendingType == "medical" ? wallet.medical_balance : wallet.wellness_balance))
                {
                    return res.json({
                        status: false,
                        message: "Insufficient "+(spendingType == "medical" ? "medical" : "wellness")+" balance credits to deduct."
                    });
                }

                let deductHistory = await WalletHistoryHelper.createWalletHistory({
                    member_wallet_id: walletID,
                    credit: credits,
                    running_balance: (spendingType == "medical" ? parseFloat(wallet.medical_balance - credits)  : wallet.wellness_balance - credits),
                    type: "deducted_by_hr",
                    employee_id: memberID,
                    customer_active_plan_id: customerActivePlanId,
                    wallet_type: spendingType,
                    created_at: created_at,
                    updated_at: updated_at
                });

                if(deductHistory) {
                    walletResult = await WalletHelper.deductCredits(memberID, credits, spendingType);

                    if(!walletResult) {
                        companyModel.removeData('medi_member_wallet_history', { _id: deductHistory._id })
                        return res.status(500).json({
                            status: false,
                            message: 'Something went wrong, please try again.'
                        });
                    }
                }
                

                if(adminID)
                {
                    SystemLogLibrary.createAdminLog({
                        admin_id: adminID,
                        admin_type: "mednefits",
                        type: "admin_hr_employee_allocate_credits",
                        data: data,
                        created_at: created_at,
                        updated_at: updated_at
                    })
                }
                else
                {
                    SystemLogLibrary.createAdminLog({
                        admin_id: adminID,
                        admin_type: "hr",
                        type: "admin_hr_employee_allocate_credits",
                        data: data,
                        created_at: created_at,
                        updated_at: updated_at
                    })
                }

                return res.json({
                    status: true,
                    message: 'Employee successfully deducted medical credits $' + credits + '.'
                });
            }

        }
        else
        {
            return res.json({
                status: false,
                message: 'Please choose a spending account type ["medical", "wellness"]'
            });
        }

        
    } catch (error) {
        console.log(error);
        return res.json({
            status: false,
            message: error.message
        })
    }
    
}

module.exports = {
    userCompanyCreditsAllocated,
    carePlanJson,
    employeeLists,
    getHRSession,
    searchEmployee,
    allocateEmployeeCredits
}
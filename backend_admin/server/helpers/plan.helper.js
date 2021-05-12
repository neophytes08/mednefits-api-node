const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const { map } = require('p-iteration');
const moment = require('moment');
const _ = require('underscore');

const getCompanyAccountTypeEnrollee = async (customerID) => {
    
    let hr = await mongoose.fetchOne('medi_customer_purchase', {customer_id: customerID});
    
    if(!(Object.keys(hr || {})).length )
    {
        return "NIL";
    }

    if(parseInt(hr.wallet) == 1 && parseInt(hr.qr_payment) == 1)
    {
        return "Health Wallet";
    }

    return "NIL";
}

const getEnrolleePackages = async (customerActivePlanID, planAddOn) => {
    
    console.log('customerActivePlanID', customerActivePlanID)
    let activePlan = await mongoose.fetchOne("medi_customer_active_plans", {customer_active_plan_id: customerActivePlanID});
    console.log('activePlan', activePlan)
    let accountType = activePlan.account_type;
    let secondaryAccountType = activePlan.secondary_account_type;
    let wallet = 0;
    
    if(activePlan)
    {
        if(activePlan.account_type == "insurance_bundle")
        {
            let plan = await mongoose.fetchOne("medi_customer_plans", {customer_plan_id:  activePlan.customer_plan_id})
            
            if(plan.secondary_account_type == null || plan.secondary_account_type == "pro_plan_bundle")
            {
                secondaryAccountType = "pro_plan_bundle";
            }
            else
            {
                secondaryAccountType = "insurance_bundle_lite";
            }
        }
        else if(activePlan.account_type == "trial_plan")
        {
            return false;
        }
    }
    
    if(planAddOn != "NIL")
    {
        return 1;
    }

    let packageGroup = await mongoose.fetchOne("medi_benefits_package_group", {account_type: accountType, secondary_account_type: secondaryAccountType, wallet: wallet});

    if(packageGroup)
    {
        return packageGroup.package_group_id;
    }

    return false;
}


const getCompanyAvailableActivePlan = async (customerID) => {
    
    let check = await mongoose.fetchOne("medi_customer_purchase", {customer_id: customerID});

    if(!check)
    {
        return false;
    }

    let plan = await mongoose.aggregation("medi_customer_plans", 
        [
            {
                $match: {
                    customer_id: customerID
                }
            },
            {
                $sort:{
                    created_at: -1
                }
            },
            {
                $limit:1
            }
        ]
    );
    
    let activePlan = await mongoose.fetchMany("medi_customer_active_plans", {customer_plan_id: plan[0].customer_plan_id});

    if(typeof activePlan == "object" && (Object.keys(activePlan)).length > 0)
    {
        let activeUsers = null;
        await map(activePlan, async element => {
            activeUsers = await mongoose.countCollection("medi_member_plan_history",{customer_active_plan_id: element.customer_active_plan_id, type: 'started'}, true);
            if((parseFloat(element.employees) - activeUsers) > 0)
            {
                return element.customer_active_plan_id;
            }
        });
    }

    return false;
}

const getDependentAvailableActivePlan = async (customerID) => {    
    let check = await mongoose.fetchOne("medi_customer_purchase", {customer_id: customerID});

    if(!check)
    {
        return false;
    }

    let plan = await mongoose.aggregation("medi_customer_plans", 
        [
            {
                $match: {
                    customer_id: customerID
                }
            },
            {
                $sort:{
                    created_at: -1
                }
            },
            {
                $limit:1
            }
        ]
    );
    let activePlan = await mongoose.fetchMany("medi_dependent_plans", {customer_plan_id: plan[0].customer_plan_id});

    if(activePlan.length > 0)
    {
        let activeUsers = null;
        await map(activePlan, async element => {
            activeUsers = await mongoose.countCollection("medi_dependent_plan_history",{dependent_plan_id: element.dependent_plan_id, type: 'started'}, true);
            if((parseFloat(element.employees) - activeUsers) > 0)
            {
                return element.customer_active_plan_id;
            }
        });
    }

    return activePlan[activePlan.length - 1];
}


const getPlanExpiration = async(customerID, res) => {

    console.log('customerID', customerID)
    let today = moment(new Date()).subtract(1, 'days').format('YYYY-MM-DD');
    let real_today = moment(new Date()).format('YYYY-MM-DD');
    console.log('today', today);
    let plan = await mongoose.aggregation('medi_customer_plans',
        [
            {$match: {customer_id: customerID}},
            {$sort:{created_at: -1}},
            {$limit:1}
        ]
    );
    console.log('plan', plan);
    if(plan.length == 0)
    {
        return res.json({
            status: false,
            message: "No customer plan."
        })
    }

    plan = plan[0]

    let activePlan = await mongoose.fetchOne('medi_customer_active_plans', {customer_plan_id: plan.customer_plan_id});

    if(!activePlan)
    {
        return {
            status: false,
            message: "No active plan."
        }
    }
    
    let calendar = null;
    let ext = "";
    let endPlanDate = moment(new Date()).format("YYYY-MM-DD");

    if(parseInt(activePlan.plan_extention_enable) == 1)
    {
        let planExtension = await companyModel.getOne("medi_active_plan_extensions", {customer_active_plan_id: activePlan.customer_active_plan_id});
        ext = "";
        if(planExtension)
        {
            if(planExtension.duration != "")
            {
                calendar = (planExtension.duration).split(" ");
                if(calendar[1] == "month" || calendar[1] == "months")
                {
                    ext = "months";
                }
                else if(calendar[1] == "day" || calendar[1] == "days")
                {
                    ext = "days";
                }
                else
                {
                    ext = "years";
                }
                endPlanDate = moment(new Date(plan.plan_start)).add(calendar[0], ext).format("YYYY-MM-DD");
            }
            else
            {
                calendar = (activePlan.duration).split(" ");
                if(calendar[1] == "month" || calendar[1] == "months")
                {
                    ext = "months";
                }
                else if(calendar[1] == "day" || calendar[1] == "days")
                {
                    ext = "days";
                }
                else
                {
                    ext = "years";
                }
                endPlanDate = moment(new Date(activePlan.plan_start)).add(calendar[0], ext).format("YYYY-MM-DD");
            }
        }
        else
        {
            calendar = (activePlan.duration).split(" ");
            if(calendar[1] == "month" || calendar[1] == "months")
            {
                ext = "months";
            }
            else if(calendar[1] == "day" || calendar[1] == "days")
            {
                ext = "days";
            }
            else
            {
                ext = "years";
            }
            endPlanDate = moment(new Date(activePlan.plan_start)).add(calendar[0], ext).format("YYYY-MM-DD");
        }
    }
    else
    {
        if(activePlan.duration != "")
        {
            calendar = (activePlan.duration).split(" ");
            ext = "";
            
            if(calendar[1] == "month" || calendar[1] == "months")
            {
                ext = "months";
            }
            else if(calendar[1] == "day" || calendar[1] == "days")
            {
                ext = "days";
            }
            else
            {
                ext = "years"
            }
            
            endPlanDate = moment(new Date(plan.plan_start)).add(calendar[0], ext).format("YYYY-MM-DD");
        }
        else
        {
            endPlanDate = moment(new Date(plan.plan_start)).add(1, "years").format("YYYY-MM-DD");
        }
    }
    console.log('endPlanDate', endPlanDate)
    let end_date = moment(endPlanDate, "YYYY-MM-DD");
    let timeLeft = moment.duration(end_date.diff(today)).asDays();
    console.log('timeLeft', timeLeft)
    // let timeLeft = endPlanDate.diff(today,'days');

    endPlanDate = moment(new Date(endPlanDate)).subtract(1, "days").format("YYYY-MM-DD");


    // spending account
    let spending_account = await mongoose.aggregation('medi_spending_account_settings',
        [
            {$match: {customer_id: customerID}},
            {$sort:{created_at: -1}},
            {$limit:1}
        ]
    );

    spending_account = spending_account[0];

    var spending_renewal_status = false;
    var combine = false;

    if(real_today >= spending_account.medical_spending_end_date) {
        spending_renewal_status
    }

    if(endPlanDate == spending_account.medical_spending_end_date) {
        combine = true
    }
    let end_date_spending = moment(spending_account.medical_spending_end_date, "YYYY-MM-DD");
    let timeLeftSpending = moment.duration(end_date_spending.diff(today)).asDays();
    return {
        start_date: plan.plan_start,
        end_date : endPlanDate,
        plan_days_to_expire: timeLeft >= 0 ? timeLeft : 0,
        expire: timeLeft <= 0 ? true : false,
        to_expire: timeLeft <= 90 ? true : false,
        days_left: timeLeft,
        spending_account_renewal: spending_renewal_status,
        to_spending_renew: timeLeftSpending <= 90 ? true : false,
        combine: combine
    };
    
}

const getCorporateUserByAllocated = async (customerID) =>
{
    customerID = parseInt(customerID);
    allocationMedicalUsers = await mongoose.aggregation("medi_company_members", [
        {   $lookup:{
                from: "medi_member_wallets",
                localField : "member_id",
                foreignField : "member_id",
                as : "medi_member_wallets"
            },
        },
        {   $unwind: "$medi_member_wallets" },
        {   $lookup:{
                from: "medi_member_wallet_histories",
                localField : "member_wallet_id",
                foreignField : "medi_member_wallet_histories.member_wallet_id",
                as : "medi_member_wallet_histories"
            },
        },
        {   $unwind: "$medi_member_wallet_histories" },
        {   $match: { $and: [
                    {"customer_id": customerID},
                    {"medi_member_wallet_histories.type": "added_by_hr"},
                    {"medi_member_wallet_histories.wallet_type": "medical"}
                ] }
        },
        // {   $group: { 
        //         _id: null, 
        //         member_id: "member_id"
        //     }
        // }
    ]);


    allocationMedicalUsers = _.uniq(allocationMedicalUsers, data => data.member_id);
        
    allocationWellnessUsers = await mongoose.aggregation("medi_company_members", [
            {   $lookup:{
                    from: "medi_member_wallets",
                    localField : "member_id",
                    foreignField : "member_id",
                    as : "medi_member_wallets"
                },
            },
            {   $unwind: "$medi_member_wallets" },
            {   $lookup:{
                    from: "medi_member_wallet_histories",
                    localField : "member_wallet_id",
                    foreignField : "medi_member_wallet_histories.member_wallet_id",
                    as : "medi_member_wallet_histories"
                },
            },
            {   $unwind: "$medi_member_wallet_histories" },
            {   $match: { $and: [
                        // {"medi_wallet_resets.user_type": "employee"},
                        {"customer_id": customerID},
                        {"medi_member_wallet_histories.type": "added_by_hr"},
                        {"medi_member_wallet_histories.wallet_type": "wellness"}
                    ] }
            },
            // {   $group: { 
            //         _id: null, 
            //         member_id: "member_id"
            //     }
            // }
        ]);

    allocationWellnessUsers = _.uniq(allocationWellnessUsers, data => data.member_id);

    let idArr = new Array();
    // let userAllocation = new Array();
    await map(allocationMedicalUsers, element => {
        if(!_.find(idArr, element.member_id)) {
            idArr.push(element.member_id);
            // userAllocation.push(element);
        }
    });

    await map(allocationWellnessUsers, element => {
        if(!_.find(idArr, element.member_id)) {
            idArr.push(element.member_id);
            // userAllocation.push(element);
        }
    });

    idArr = _.uniq(idArr, data => data);
    return idArr;
}

const memberAllocatedCredits = async (memberWalletID, memberID, walletType) => {
    try {
        var getAllocation = 0;
        var deductedCredits = 0;
        var creditsBack = 0;
        var deductedByHR = 0;
        var inNetworkTempSpent = 0;
        var eClaimSpent = 0;
        let walletHistory = null;
        // let pro_allocation = ;
    
    
        let member = await mongoose.fetchOne("medi_members", { member_id: memberID });
        let employeeCreditResetMedical = await mongoose.aggregation('medi_wallet_resets',
            [
                {$match: {
                    id: memberID,
                    spending_type: walletType == 'medical' ? 'medical' : 'wellness',
                    user_type: 'employee'
                }},
                {$sort:{created_at: -1}},
                {$limit:1}
            ]
        );
        // return employeeCreditResetMedical;
        if(employeeCreditResetMedical.length > 0)
        {   
            employeeCreditResetMedical = employeeCreditResetMedical[0];
            let reset_date = moment(employeeCreditResetMedical.date_resetted).format("YYYY-MM-DD");
            console.log('reset_date', reset_date)
            walletHistory = await mongoose.aggregation("medi_member_wallet_history", [
                {   
                    // $lookup:{
                    //     from: "medi_member_wallet_histories",
                    //     localField : "_id",
                    //     foreignField : "member_wallet_id",
                    //     as : "medi_member_wallet_histories"
                    // },
                    $lookup:{
                        from: "medi_member_wallets",
                        localField : "member_wallet_id",
                        foreignField : "member_wallet_id",
                        as : "medi_member_wallets"
                    },
                },
                {   $unwind: "$medi_member_wallets" },
                {   $match: { $and: [
                            {"wallet_type": (walletType == "medical" ? "medical" : "wellness")},
                            {"medi_member_wallets.member_id": memberID},
                            {"created_at": { $gt: reset_date}}
                        ] }
                },
                // {   $group: { 
                //         _id: null, 
                //         admin_added_credits: {
                //             $sum:{
                //                 $cond: { 
                //                     if: {$eq:["$medi_member_wallet_histories.type","admin_added_credits"]}, 
                //                     then: "$medi_member_wallet_histories.credit",
                //                     else: "0"
                //                 }
                //             }
                //         },
                //         admin_deducted_credits: { 
                //             $sum: {
                //                 $cond: { 
                //                     if: { $eq:["$medi_member_wallet_histories.type","admin_deducted_credits"]}, 
                //                     then: "$medi_member_wallet_histories.credit",
                //                     else: "0"
                //                 } 
                //             }
                //         },
                //     } 
                // },
                // {   $project: { 
                //         totalMWAllocation: { 
                //             $subtract: ["$admin_added_credits", "$admin_deducted_credits"]
                //         } 
                //     } 
                // }
            ]);
        }
        else
        {
            walletHistory = await mongoose.fetchMany("medi_member_wallet_history", { member_wallet_id: memberWalletID, wallet_type: walletType });
        }

        await map(walletHistory, history => {
            if(history.type == "added_by_hr")
            {
                getAllocation += parseFloat(history.credit);
            }
            else if(history.type == "deducted_by_hr")
            {
                deductedCredits += parseFloat(history.credit);
                deductedByHR = parseFloat(history.credit);
            }
    
            if(history.spend == "e_claim_transaction")
            {
                eClaimSpent += parseFloat(history.credit);
            }
            else if(history.spend == "in_network_transaction")
            {
                inNetworkTempSpent += parseFloat(history.credit);
            }
            else if(history.spend == "credits_back_from_in_network")
            {
                creditsBack += parseFloat(history.credit);
            }
        });

        walletHistory = await mongoose.fetchMany("medi_member_wallet_history", { member_wallet_id: memberWalletID, wallet_type: walletType, type: 'pro_allocation' });
        walletHistory = (walletHistory).map(function(el){
            return el.credits;
        }).reduce(function(acc, val) { return acc + val; }, 0)
        
        getAllocationSpentTemp = inNetworkTempSpent - creditsBack;
        getAllocationSpent = getAllocationSpentTemp + eClaimSpent;
        let balance = 0;
        let medWellBalance = 0;
        let totalDeductionCredits = 0
        let deletedEmployeeAllocation = 0;

        if(walletHistory > 0 && (member.active == 0 || member.active == 1)) {
            allocation = walletHistory;
            balance = walletHistory - getAllocationSpent;
            medWellBalance = balance;
            if(balance < 0) {
                balance = 0;
                medWellBalance = balance;
            }
        } else {
            allocation = getAllocation - deductedCredits;
            totalDeductionCredits = deductedCredits;
            balance = allocation - getAllocationSpent;
            medWellBalance = balance;
            if(member.active == 0) {
                deletedEmployeeAllocation = allocation - deductedByHR;
                medWellBalance = 0;
            }
        }

        if(walletHistory > 0) {
            allocation = walletHistory;
        }

        // console.log('allocation' + walletType, allocation)

        return {
            allocation: allocation, 
            getAllocationSpent: getAllocationSpent, 
            balance: balance >= 0 ? balance : 0, 
            eClaimSpent: eClaimSpent, 
            getAllocationSpentTemp: getAllocationSpentTemp, 
            deletedEmployeeAllocation: deletedEmployeeAllocation, 
            totalDeductionCredits: totalDeductionCredits, 
            medWellBalance: medWellBalance, 
            totalSpent: getAllocationSpent
        }
        
    } catch (error) {
        console.log('error',error)
        return error;
    }
}

const memberActivityAllocatedCredits = async (memberWalletID, memberID, walletType) => {
    try {
        var getAllocation = 0;
        var deductedCredits = 0;
        var creditsBack = 0;
        var deductedByHR = 0;
        var inNetworkTempSpent = 0;
        var eClaimSpent = 0;
        let walletHistory = null;
        // let pro_allocation = ;
    
    
        let member = await mongoose.fetchOne("medi_members", { member_id: memberID });
        let employeeCreditResetMedical = await mongoose.aggregation('medi_wallet_resets',
            [
                {$match: {
                    id: memberID,
                    spending_type: walletType == 'medical' ? 'medical' : 'wellness',
                    user_type: 'employee'
                }},
                {$sort:{created_at: -1}},
                {$limit:1}
            ]
        );
        // return employeeCreditResetMedical;
        if(employeeCreditResetMedical.length > 0)
        {   
            employeeCreditResetMedical = employeeCreditResetMedical[0];
            let reset_date = moment(employeeCreditResetMedical.date_resetted).format("YYYY-MM-DD");
            console.log('reset_date', reset_date)
            walletHistory = await mongoose.aggregation("medi_member_wallet_history", [
                {   
                    // $lookup:{
                    //     from: "medi_member_wallet_histories",
                    //     localField : "_id",
                    //     foreignField : "member_wallet_id",
                    //     as : "medi_member_wallet_histories"
                    // },
                    $lookup:{
                        from: "medi_member_wallets",
                        localField : "member_wallet_id",
                        foreignField : "member_wallet_id",
                        as : "medi_member_wallets"
                    },
                },
                {   $unwind: "$medi_member_wallets" },
                {   $match: { $and: [
                            {"wallet_type": (walletType == "medical" ? "medical" : "wellness")},
                            {"medi_member_wallets.member_id": memberID},
                            {"created_at": { $gt: reset_date}}
                        ] }
                },
                // {   $group: { 
                //         _id: null, 
                //         admin_added_credits: {
                //             $sum:{
                //                 $cond: { 
                //                     if: {$eq:["$medi_member_wallet_histories.type","admin_added_credits"]}, 
                //                     then: "$medi_member_wallet_histories.credit",
                //                     else: "0"
                //                 }
                //             }
                //         },
                //         admin_deducted_credits: { 
                //             $sum: {
                //                 $cond: { 
                //                     if: { $eq:["$medi_member_wallet_histories.type","admin_deducted_credits"]}, 
                //                     then: "$medi_member_wallet_histories.credit",
                //                     else: "0"
                //                 } 
                //             }
                //         },
                //     } 
                // },
                // {   $project: { 
                //         totalMWAllocation: { 
                //             $subtract: ["$admin_added_credits", "$admin_deducted_credits"]
                //         } 
                //     } 
                // }
            ]);
        }
        else
        {
            walletHistory = await mongoose.fetchMany("medi_member_wallet_history", { member_wallet_id: memberWalletID, wallet_type: walletType });
        }

        await map(walletHistory, history => {
            if(history.type == "added_by_hr")
            {
                getAllocation += parseFloat(history.credit);
            }
            else if(history.type == "deducted_by_hr")
            {
                deductedCredits += parseFloat(history.credit);
                deductedByHR = parseFloat(history.credit);
            }
    
            if(history.spend == "e_claim_transaction")
            {
                eClaimSpent += parseFloat(history.credit);
            }
            else if(history.spend == "in_network_transaction")
            {
                inNetworkTempSpent += parseFloat(history.credit);
            }
            else if(history.spend == "credits_back_from_in_network")
            {
                creditsBack += parseFloat(history.credit);
            }
        });

        walletHistory = await mongoose.fetchMany("medi_member_wallet_history", { member_wallet_id: memberWalletID, wallet_type: walletType, type: 'pro_allocation' });
        walletHistory = (walletHistory).map(function(el){
            return el.credits;
        }).reduce(function(acc, val) { return acc + val; }, 0)
        
        getAllocationSpentTemp = inNetworkTempSpent - creditsBack;
        getAllocationSpent = getAllocationSpentTemp + eClaimSpent;
        let balance = 0;
        let medWellBalance = 0;
        let totalDeductionCredits = 0
        let deletedEmployeeAllocation = 0;

        if(walletHistory > 0 && (member.active == 0 || member.active == 1)) {
            allocation = walletHistory;
            balance = walletHistory - getAllocationSpent;
            medWellBalance = balance;
            if(balance < 0) {
                balance = 0;
                medWellBalance = balance;
            }
        } else {
            allocation = getAllocation - deductedCredits;
            totalDeductionCredits = deductedCredits;
            balance = allocation - getAllocationSpent;
            medWellBalance = balance;
            if(member.active == 0) {
                deletedEmployeeAllocation = allocation - deductedByHR;
                medWellBalance = 0;
            }
        }

        if(walletHistory > 0) {
            allocation = walletHistory;
        }

        // console.log('allocation' + walletType, allocation)

        return {
            allocation: allocation, 
            getAllocationSpent: getAllocationSpent, 
            balance: balance >= 0 ? balance : 0, 
            eClaimSpent: eClaimSpent, 
            getAllocationSpentTemp: getAllocationSpentTemp, 
            deletedEmployeeAllocation: deletedEmployeeAllocation, 
            totalDeductionCredits: totalDeductionCredits, 
            medWellBalance: medWellBalance, 
            totalSpent: getAllocationSpent
        }
        
    } catch (error) {
        console.log('error',error)
        return error;
    }
}

const calculateInvoicePlanPrice = async (defaultPrice, start, end) => {

    let days = moment(new Date(end)).diff(moment(new Date(start)), "days");
    let totalDays = moment(new Date()).add(1,"years").diff(moment((new Date())), "days");
    let costPlanAndDays = defaultPrice/totalDays;
    console.log('days', days)
    return costPlanAndDays * days;
}

const memberWellnessAllocatedCredits = async (memberWalletID, memberID) => {
    return await memberMedicalAllocatedCredits(memberWalletID, memberID, "wellness");
}

const memberMedicalAllocatedCredits = async (memberWalletID, memberID, walletType) => {

    let getAllocation = 0;
    let deductedCredits = 0;
    let creditsBack = 0;
    let deductedByHRMedical = 0;
    let inNetworkTempSpent = 0;
    let eClaimSpent = 0;
    let walletHistory = null;

    let employeeCreditResetMedical = await employeeModel.aggregate("medi_wallet_resets", [
        {$match: {
            id: memberID,
            spending_type: 'medical',
            user_type: 'employee'
            }
        },
        {$sort:{created_at: -1}},
        {$limit:1}
    ]);
    employeeCreditResetMedical = employeeCreditResetMedical[0];

    if((Object.keys(employeeCreditResetMedical || {})).length > 0)
    {
        let start = moment(new Date(employeeCreditResetMedical.date_resetted)).format("YYYY-MM-DD");

        walletHistory = await employeeModel.aggregate("medi_wallet_history", [
            {
                $match: {
                    member_wallet_id: memberWalletID,
                    wallet_type: (walletType || "medical"),
                    created_at: {
                        $gte: start
                    }
                }
            },
            {$sort:{created_at: -1}}
        ]);
    }
    else
    {
        walletHistory = mongoose.fetchMany("medi_wallet_history", {
            member_wallet_id: memberWalletID,
            wallet_type: (walletType || "medical")
        });
    }
    
    await map(walletHistory, history => {
        if(history.type == "added_by_hr")
        {
            getAllocation = getAllocation + history.credit;
        }
        else if(history.type == "deducted_by_hr")
        {
            deductedCredits = deductedCredits + history.credit;
        }

        if(history.spent == "e_claim_transaction")
        {
            eClaimSpent = eClaimSpent + history.credit;
        }
        else if(history.spent == "in_network_transaction")
        {
            inNetworkTempSpent = inNetworkTempSpent + history.credit;
        }
        else if(history.spent == "credits_back_from_in_network")
        {
            creditsBack = creditsBack + history.credit;
        }
    });
    
    walletHistory = await companyModel.aggregation("medi_wallet_history", [
        {   $match: { $and: [
                    {"medi_wallet_history.member_wallet_id": memberWalletID},
                    {wallet_type: (walletType || "medical")},
                    {"medi_wallet_history.type": {
                        $in: ["pro_allocation_deduction"]
                    }}
                ] }
        },
        {   $group: { 
                _id: null, 
                total: {
                    $sum: "$credit"
                }
            }
        }
    ]);
    walletHistory = walletHistory[0].total;

    getAllocationSpentTemp = inNetworkTempSpent - creditsBack - deductedByHRMedical;
    getAllocationSpent = getAllocationSpentTemp + eClaimSpent;
    allocation = getAllocation - deductedCredits - walletHistory;

    return {
        allocation: allocation,
        get_allocation_spent: getAllocationSpent
    }
}
const createUserPlanHistory = async (memberID, customerID)=> {

    let plan = await mongoose.aggregate("medi_customer_plans",[
        {
            $match: {
                customer_id: customerID
            }
        },
        {$sort:{created_at: -1}},
        {$limit:1}
    ]);
    plan = plan[0];
    
    let activePlan = await mongoose.aggregate("medi_customer_active_plans",[
        {
            $match: {
                customer_plan_id: plan.customer_plan_id
            }
        },
        {$sort:{created_at: -1}},
        {$limit:1}
    ]);
    activePlan = activePlan[0];
        
    let data = {
        // 	'user_id'                   => $user_id,
        // 	'customer_active_plan_id'   => $active_plan->customer_active_plan_id,
        // 	'type'                      => 'started',
        // 	'date'                      => date('Y-m-d', strtotime($active_plan->plan_start)),
        // 	'created_at'                => date('Y-m-d h:i:s'),
        // 	'updated_at'                => date('Y-m-d h:i:s')
    }
//medi_member_plan_history

			// $data = array(
			// 	'user_id'                   => $user_id,
			// 	'customer_active_plan_id'   => $active_plan->customer_active_plan_id,
			// 	'type'                      => 'started',
			// 	'date'                      => date('Y-m-d', strtotime($active_plan->plan_start)),
			// 	'created_at'                => date('Y-m-d h:i:s'),
			// 	'updated_at'                => date('Y-m-d h:i:s')
			// );

			// DB::table('user_plan_history')->insert($data); 
}

const planInvoiceDetails = async (invoice_id) => {
    console.log('invoice_id', invoice_id)
    // check customer active plan invoice
    let invoice = await mongoose.fetchOne('medi_active_plan_invoices', { active_plan_invoice_id: invoice_id })
    console.log('invoice', invoice)
    if(!invoice) {
        return false;
    }

    let active_plan = await mongoose.fetchOne('medi_customer_active_plans', { customer_active_plan_id: invoice.customer_active_plan_id })
    let business_contact = await mongoose.fetchOne('medi_customer_business_information', { customer_id: active_plan.customer_id })

    let data = new Object();
    if(data.billing_recipient == 1) {
        data.email = business_contact.contact.email;
        data.phone = business_contact.contact.phone;
        data.address = business_contact.contact.address;
        data.postal = business_contact.postal_code;
        data.name = `${ business_contact.contact.first_name } ${ business_contact.contact.last_name }`
    } else {
        let billing_contact = await mongoose.fetchOne('medi_customer_billing_contact', { customer_id: active_plan.customer_id })
        data.email = billing_contact.billing_email;
        data.phone = billing_contact.billing_phone;
        data.address = billing_contact.billing_address;
        data.postal = billing_contact.postal_code;
        data.name = `${ billing_contact.billing_first_name } ${ billing_contact.billing_last_name }`
    }

    data.company = business_contact.company_name;
    let plan = await mongoose.fetchOne('medi_customer_plans', { _id: active_plan.customer_plan_id })
    let plan_start = plan.plan_start;
    data.complimentary = false;
    data.plan_type = "Standalone Mednefits Care (Corporate)";
    data.account_type = null;

    if(active_plan.account_type == "stand_alone_plan") {
        data.plan_type = "Standalone Mednefits Care (Corporate)";
        data.account_type = "Pro Plan";
        data.complimentary = false;
    } else if(active_plan.account_type == "insurance_bundle") {
        data.plan_type = "Bundled Mednefits Care (Corporate)";
        data.account_type = "Insurance Bundle";
        data.complimentary = true;
    } else if(active_plan.account_type == "trial_plan") {
        data.plan_type = "Trial Plan Mednefits Care (Corporate)";
        data.account_type = "Trial Plan";
        data.complimentary = false;
    } else if(active_plan.account_type == "lite_plan") {
        data.plan_type = "Lite Plan Mednefits Care (Corporate)";
        data.account_type = "Lite Plan";
        data.complimentary = false;
    }

    data.invoice_number = invoice.invoice_number;
    data.invoice_date = moment(invoice.invoice_date).format("MMMM D, YYYY");
    data.invoice_due = moment(invoice.invoice_due_date).format("MMMM D, YYYY");
    data.number_employess = invoice.employees;
    data.plan_start = moment(active_plan.plan_start).format("MMMM D, YYYY");
    data.dependents = [];

    if(active_plan.new_head_count == 0) {
        data.price = invoice.individual_price;
        data.amount = invoice.individual_price * invoice.employees;
        data.amount_due = invoice.individual_price * invoice.employees;
        data.total = invoice.individual_price * invoice.employees;
        data.duration = active_plan.duration;
        // && invoice.transaction_trail.payment_type && invoice.transaction_trail.transaction_date
        if(invoice.transaction_trail) {
            if(invoice.isPaid == 1) {
                data.paid = true;
                data.payment_date = moment(invoice.transaction_trail.transaction_date).format("MMMM D, YYYY");
                data.notes = invoice.transaction_trail.remarks;
                data.amount_due = data.amount_due - invoice.transaction_trail.paid_amount
            } else {
                data.paid = false;
            }
        } else {
            data.paid = false
        }
        let calendar = (active_plan.duration).split(" ");
        let typeOfMonth = "years";

        if(calendar[1] == "day" || calendar[1] == "days")
        {
            typeOfMonth = "days";
        }else if(calendar[1] == "month" || calendar[1] == "months")
        {
            typeOfMonth = "months";
        }

        data.plan_end = moment(active_plan.plan_start).add(calendar[0], typeOfMonth).subtract("1", "day").format("MMMM D, YYYY")
    } else {
        let firstPlan = await mongoose.fetchOne("medi_customer_active_plans", { customer_active_plan_id: invoice.customer_active_plan_id })
        plan = await mongoose.fetchOne("medi_customer_plans", { customer_plan_id: firstPlan.customer_plan_id })
        
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

            endPlanDate = moment(firstPlan.plan_start).add(calendar[0], typeOfMonth).subtract("1", "day").format("YYYY-MM-DD")
        }
        else
        {
            endPlanDate = moment(new Date()).add(1, "years").format("YYYY-MM-DD")
        }
        data.plan_end = moment(endPlanDate).format("MMMM D, YYYY");
        let calculatedPrices = await calculateInvoicePlanPrice(invoice.individual_price, active_plan.plan_start, endPlanDate);
        data.price = calculatedPrices;
        data.amount = calculatedPrices * invoice.employees;
        data.amount_due = calculatedPrices * invoice.employees;
        data.total = calculatedPrices * invoice.employees;
        data.duration = active_plan.duration;
    }

    // get dependents
    let dependent_data = await mongoose.fetchMany('medi_dependent_plans', { customer_plan_id: active_plan.customer_plan_id, tagged_active_plan_invoice: 1 });
    let dependent_amount = 0;
    let dependent_amount_due = 0;
    let count = dependent_data.length, x = 0;

    for(; x < count; x++) {
        let dependent_invoice = await mongoose.fetchOne('medi_dependent_invoices', { dependent_plan_id: dependent_data[x]._id });
        let account_type = null;
        if(dependent_data[x].account_type == "stand_alone_plan") {
            account_type = "Pro Plan";
        } else if(dependent_data[x].account_type == "insurance_bundle") {
            account_type = "Insurance Bundle";
        } else if(dependent_data[x].account_type == "trial_plan") {
            account_type = "Trial Plan";
        } else if(dependent_data[x].account_type == "lite_plan") {
            account_type = "Lite Plan";
        }

        if(dependent_data[x].isPaid == 0) {
            dependent_amount_due += dependent_invoice.individual_price * dependent_invoice.total_dependents;
        }

        dependent_amount += dependent_invoice.individual_price * dependent_invoice.total_dependents;
        let calendar = (dependent_data[x].duration).split(" ");
        let typeOfMonth = "years";

        if(calendar[1] == "day" || calendar[1] == "days")
        {
            typeOfMonth = "days";
        }else if(calendar[1] == "month" || calendar[1] == "months")
        {
            typeOfMonth = "months";
        }
        let end_date = moment(dependent_data[x].plan_start).add(calendar[0], typeOfMonth).subtract("1", "day").format("MMMM D, YYYY");

        data.dependents.push({
            account_type: account_type,
            total_dependents: dependent_invoice.total_dependents,
            price: dependent_invoice.individual_price,
            amount: dependent_invoice.individual_price * dependent_invoice.total_dependents,
            plan_start: moment(dependent_data[x].plan_start).format("MMMM D, YYYY"),
            plan_end: end_date,
            duration: dependent_data[x].duration
        })
    }

    data.total = data.total + dependent_amount;
    data.amount_due = data.amount_due + dependent_amount_due;
    data.customer_active_plan_number = active_plan.active_plan_number;
    console.log('data', data)
    return data;
}

const employeePlanStatus = async(id, type) => {
    if(type == "increment") {
        return await mongoose.update("medi_customer_plan_status", 
            {"_id": id},
            {$inc:{"employee_enrolled_count": 1}}
        );
    } else {
        return await mongoose.update("medi_customer_plan_status", 
            {"_id": id},
            {$inc:{"employee_enrolled_count": -1}}
        );
    }
}

const dependentPlanStatus = async(id, type) => {
    if(type == "increment") {
        return await mongoose.update("medi_dependent_plan_status", 
            {"_id": id},
            {$inc:{"employee_enrolled_count": 1}}
        );
    } else {
        return await mongoose.update("medi_dependent_plan_status", 
            {"_id": id},
            {$inc:{"employee_enrolled_count": -1}}
        );
    }
}

module.exports = {
    getCompanyAvailableActivePlan,
    getCompanyAccountTypeEnrollee,
    getEnrolleePackages,
    getPlanExpiration,
    getCorporateUserByAllocated,
    memberAllocatedCredits,
    calculateInvoicePlanPrice,
    planInvoiceDetails,
    getDependentAvailableActivePlan,
    employeePlanStatus,
    dependentPlanStatus
}
require('express-async-errors');
require('dotenv').config();
const APPPATH = require('app-root-path');
const PlanHelper = require(`${APPPATH}/server/helpers/plan.helper.js`);
const StringHelper = require(`${APPPATH}/server/helpers/string.helper.js`);
const SystemLogLibrary = require(`${APPPATH}/server/helpers/systemLogLibrary.helper.js`);
const validate = require('./company.validator');
const moment = require('moment');
const { map } = require('p-iteration');
const format=require('format-number');
const ucwords=require('ucwords');
const companyModel = require('./company.model');
const companyController = require('./company.controller');
const employeeValidator = require('./employee.validator');
const Capitalize = require('capitalize');
const global_helper = require(APPPATH + '/server/helpers/global.helper');
const PlanTierUsersHelper = require(APPPATH + '/server/helpers/planTierUsers.helper');
const DependentPlanStatusHelper = require(APPPATH + '/server/helpers/dependentPlanStatus.helper');
const mongoose = require('mongoose');
const _ = require("underscore.string");
const sha256 = require('sha256');

const enrollmentProgress = async (req, res, next) => {

    let data = req.body;
    let customerID = data.customer_id;

    let plan = await companyModel.getItemPartition(
        {
            secondaryIndex: true,
            indexName: "CustomerIdIndex",
            indexValue: customerID,
            table: "medi_customer_plans",
            limit: 1,
            descending: true
        },res
    );
    plan = plan.Items[0].attrs;
    
    let activePlans = await companyModel.getItemPartition(
        {
            secondaryIndex: true,
            indexName: "CustomerPlanIdIndex",
            indexValue: plan.customer_plan_id,
            table: "medi_customer_active_plans"
        },res
    );

    let activePlanItems = new Array();
    if(activePlans.Count > 0)
    {
        await map(activePlans,async activePlansElement => {
            activePlanItems.push(activePlansElement.attrs);
        })
    }
    else
    {
        activePlanItems = null;
    }

    let planStatus = await companyModel.getItemPartition(
        {
            secondaryIndex: true,
            indexName: "CustomerPlanIdIndex",
            indexValue: plan.customer_plan_id,
            table: "medi_customer_plan_status",
            limit: 1
        },res
    );
    planStatus = planStatus.Items[0].attrs;
    
    let inProgress = parseFloat(planStatus.employee_head_count) - parseFloat(planStatus.employee_enrolled_count);
    let endPlan = moment(new Date(plan.plan_start)).subtract(5, "days").format("YYYY-MMMM-DD");
    
    return res.json({
        status: true,
        data: {
            in_progress: inProgress,
            completed: planStatus.employee_enrolled_count,
            active_plans: activePlanItems,
            total_employees: planStatus.employee_head_count,
            plan_end_date: endPlan,
            account_type: plan.account_type
        }
    });
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

const getDependentStatus = async (req, res, next) => {

    let data = req.query;
    let customerID = moongose.mongo.ObjectId(data.customer_id);
    
     let plan = await companyModel.aggregation('medi_customer_plans',
        [
            {$match: {customer_id: customerID}},
            {$sort:{created_at: -1}},
            {$limit:1}
        ]
    );
    plan = plan[0]
    res.json(plan);
    if(plan.Count > 0)
    {
        plan = plan.Items[0].attrs;

        let dependents = await companyModel.getItemPartition(
            {
                secondaryIndex: true,
                indexName: 'CustomerPlanIdIndex',
                indexValue: plan.customer_plan_id,
                table: "medi_dependent_plan_status",
                limit: 1,
                descending: true
            },res
        );

        if(dependents.Count > 0)
        {
            dependents = dependents.Items[0].attrs;
            return res.json({
                status: true, 
                total_number_of_seats:dependents.dependent_head_count, 
                occupied_seats: dependents.total_enrolled_dependents, 
                vacant_seats: dependents.dependent_head_count - dependents.total_enrolled_dependents
            });
        }
    }

    return res.json({
        status: false
    });
}

const checkPlan = async (req, res, next) => {

    let data = req.body;
    let customerID = data.customer_id;
    let isPaid = false;
    let checks = false;
    
    let plan = await companyModel.getItemPartition(
        {
            secondaryIndex: true,
            indexName: "CustomerIdIndex",
            indexValue: customerID,
            table: "medi_customer_plans",
            limit: 1,
            descending: true
        },res
    );

    if(plan.Count <= 0)
    {
        return res.json({
            status: false,
            message: "No customer plan."
        })
    }

    plan = plan.Items[0].attrs;

    let activePlan = await companyModel.getItemPartition(
        {
            secondaryIndex: true,
            indexName: "CustomerPlanIdIndex",
            indexValue: plan.customer_plan_id,
            table: "medi_customer_active_plans",
            limit: 1
        },res
    );

    let account = await companyModel.getItemPartition(
        {
            indexValue: customerID,
            table: "medi_customer_purchase",
            limit: 1
        },res
    );

    if(activePlan.Count <= 0)
    {
        return res.json({
            status: false,
            message: "Active plan not found."
        })
    }
    activePlan = activePlan.Items[0].attrs;

    if(account.Count <= 0)
    {
        return res.json({
            status: false,
            message: "Customer purchase not found."
        })
    }
    account = account.Items[0].attrs;

    if(activePlan.paid && activePlan.paid == "true")
    {
        isPaid = true;
    }

    
    let numberOfEmployees = await companyModel.countCollection({
        table: "medi_company_members",
        conditions: {
            whereField: "customer_id",
            whereValue: customerID
        }
    });

    if(isPaid && numberOfEmployees > 0)
    {
        checks = true;
    }
    
    let dependents = await companyModel.countCollection({
        table: "medi_dependent_plans",
        conditions: {
            whereField: "customer_plan_id",
            whereValue: plan.customer_plan_id
        }
    });
    
    return res.json({
        status: true,
        data: {
            paid: isPaid, 
            employee_count: numberOfEmployees, 
            cheque: true, 
            agree_status: account.agree_status, 
            checks: checks, 
            plan: activePlan,
            dependent_status: dependents > 0 ? true : false
        }
    });
}

const getPlanStatus = async (req, res, next) => {

    let data = req.body;
    let customerID = data.customer_id;
    let result = await PlanHelper.getPlanExpiration(customerID, res);
    result['status'] = true;
    
    return result;

}

const getTotalMembers = async (req, res, next) => {

    if(!req.query.customer_id) {
        return res.status(400).json({
            status: false,
            message: "customer_id is required",
        });
    }

    try {
        let customerID = parseInt(req.query.customer_id);
        let purchase = await companyModel.getOne("medi_customer_purchase", { customer_id: customerID });
        let totalEnrolledDependents = 0;
        let totalMembers = 0;
        if(!purchase) {
            return res.status(404).json({
                status: false,
                message: "Customer does not exist",
            });
        }

        let planned = await companyModel.aggregation("medi_customer_plans",
            [
                {$match: {customer_id: customerID}},
                {$sort: {created_at: -1}},
                {$limit:1}
            ]
        );
        // console.log('planned', planned)
        planned = planned[0]
        let planStatus = await companyModel.aggregation("medi_customer_plan_status",
            [
                {$match: {customer_plan_id: planned.customer_plan_id}},
                {$sort:{created_at: -1}},
                {$limit:1}
            ]
        );
        planStatus = planStatus[0]
        console.log('planStatus', planStatus)

        let checkDependents = await companyModel.aggregation("medi_dependent_plan_status",
            [
                {$match: {customer_plan_id: planned.customer_plan_id}},
                {$sort:{created_at: -1}},
                {$limit:1}
            ]
        );

        console.log('checkDependents', checkDependents)
        if(checkDependents && checkDependents.length > 0) {
            totalEnrolledDependents = checkDependents[0].dependent_enrolled_count;
        }
        totalMembers = await planStatus.employee_enrolled_count + totalEnrolledDependents;
        console.log('totalMembers', totalMembers)
        return res.json({
            status: true,
            total_members: totalMembers
        });

    } catch(error) {
        console.log('error', error)
        return res.status(400).json({
            status: false,
            message: 'id not found',
        });
    }
}

const companyAllocation = async (req, res, next) => {

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

const employeeLists = async (req, res, next) => {
    let data = req.query;
    // console.log('data', data)
    if(!data.customer_id) {
        return res.status(400).json({status: false, message: 'Customer ID is required.'});
    }

    let customerID = parseInt(data.customer_id);
    let finalUser = new Array();

    let usersData = new Array(), x = 0, count = 0, members = null, companyMembers = new Object();
    let options = {
      page: req.query.page ? req.query.page : 1,
      limit: req.query.limit ? req.query.limit : 5,
    };

    if(data.search) {
        // search member
        companyMembers = await companyModel.aggregation('medi_members',
            [
                {
                    $match: { $text: { $search: data.search } }
                    // $match: { $and: [{ 'fullname': data.search }] }
                    // $match: { 'fullname': { "$regex": data.search } } 
                },
                {
                    // $lookup: {
                    //     from: 'medi_company_members',
                    //     localField: '_id',
                    //     foreignField: 'member_id',
                    //     as: 'members'
                    // }
                    $lookup: {
                        from: 'medi_company_members',
                        localField: 'member_id',
                        foreignField: 'member_id',
                        as: 'members'
                    }
                },
                {   $unwind: '$members' },
                {
                    $match: { 'members.customer_id': customerID } 
                }
            ]
        );

        if(companyMembers.length > 0) {
            count = companyMembers.length;
            members = companyMembers;
        }
        // console.log('members search', members)
        // return res.json(companyMembers);
        // companyMembers = await companyModel.paginate('medi_company_members', { member_id: await mongoose.mongo.ObjectId(data.member_id) });
    } else {
        companyMembers = await companyModel.paginate('medi_company_members', { customer_id: customerID }, options);
        count = companyMembers.docs.length;
        members = companyMembers.docs;
    }

    for(; x < count; x++) {
        // let id = members[x].member_id ? members[x].member_id : members[x]._id
        let id = members[x].member_id
        let member = await companyModel.getOne('medi_members', { member_id: id });
        let wallet = await companyModel.getOne('medi_member_wallet', { member_id: id })

        medicalWallet = await PlanHelper.memberAllocatedCredits(wallet.member_wallet_id, id, "medical");
        wellnessWallet = await PlanHelper.memberAllocatedCredits(wallet.member_wallet_id, id, "wellness");
        let user_ids = await companyModel.getIds('medi_member_covered_dependents', { 'owner_id': id }, 'member_id')
        user_ids.push(id);
        // let eClaimAmountPendingMedication = await 
        // eClaimAmountPendingMedication = await mongoose.fetchMany("medi_out_of_network_transactions", { member_wallet_id: mongoose.mongoose.mongo.ObjectId(memberWalletID), wallet_type: walletType, type: 'pro_allocation' });
        
        // eClaimAmountPendingMedication = (eClaimAmountPendingMedication).map(function(el){
        //     return el.amount;
        // }).reduce(function(acc, val) { return acc + val; }, 0)

        let eClaimAmountPendingMedication = await companyModel.aggregation('medi_out_of_network_transactions', [{
            $match : { 
                $and : [ 
                { claim_status: 0 }, { wallet_type: 'medical' },
                 {"member_id": {
                    $in: user_ids
                }},
                ] 
            },
        },{
            $group : {
                _id : null,
                total : {
                    $sum : "$claim_amount"
                }
            }
        }]);

        let eClaimAmountPendingWellness = await companyModel.aggregation('medi_out_of_network_transactions', [{
            $match : { 
                $and : [ 
                { claim_status: 0 }, { wallet_type: 'wellness' },
                 {"member_id": {
                    $in: user_ids
                }},
                ] 
            },
        },{
            $group : {
                _id : null,
                total : {
                    $sum : "$claim_amount"
                }
            }
        }]);

        if(eClaimAmountPendingMedication.length > 0) {
            eClaimAmountPendingMedication = eClaimAmountPendingMedication[0].total;
        } else {
            eClaimAmountPendingMedication = 0;
        }

        if(eClaimAmountPendingWellness.length > 0) {
            eClaimAmountPendingWellness = eClaimAmountPendingWellness[0].total;
        } else {
            eClaimAmountPendingWellness = 0;
        }

        let medical = {
            credits_allocation: medicalWallet.allocation,
            credits_spent: medicalWallet.getAllocationSpent,
            balance: medicalWallet.medWellBalance,
            e_claim_amount_pending_medication: eClaimAmountPendingMedication
        }

        let wellness =  {
            credits_allocation_wellness: wellnessWallet.allocation,
            credits_spent_wellness: wellnessWallet.getAllocationSpent,
            balance: wellnessWallet.medWellBalance,
            e_claim_amount_pending_wellness: eClaimAmountPendingWellness
        }

        let name = await StringHelper.splitName(member.fullname);
        firstName = name.first_name;
        lastName = name.last_name;
        let deletion = await companyModel.getOne("medi_customer_employee_plan_refund_details", { employee_id: member._id });
        let dependents = await companyModel.countCollection("medi_member_covered_dependents", { owner_id: member._id });
        let planTier = new Object();
        let flag = false

        let planTierUsers = await companyModel.getOne("medi_customer_plan_tier_users", { member_id: member._id });

        if(planTierUsers) {
            flag = true
            planTier = await companyModel.getOne("medi_customer_plan_tiers", { plan_tier_id: planTierUsers.plan_tier_id })
        }

        let getEmployeePlan = await companyModel.aggregation('medi_member_plan_history',
            [
                {$match: {member_id: member.member_id, type: 'started'}},
                {$sort:{created_at: -1}},
                {$limit: 1}
            ]
        );

        getEmployeePlan = getEmployeePlan[0]
        let replace = await companyModel.getOne("medi_customer_replace_employee", { member_id: member._id });
        let activePlan = await companyModel.getOne("medi_customer_active_plans", { customer_active_plan_id: getEmployeePlan.customer_active_plan_id });
        let expiryDate = null;
        let planName = await StringHelper.accountType(activePlan.account_type);
        
        let plan = null;
        if(replace)
        {
            replace = replace;
            expiryDate = moment(new Date(replace.expired_and_activate)).format("YYYY-MM-DD");
        } else {
            plan = await companyModel.aggregation('medi_customer_plans',
                [
                    {$match: { customer_plan_id: activePlan.customer_plan_id}},
                    {$sort:{created_at: -1}},
                    {$limit:1}
                ]
            );
            plan = plan[0];

            let activePlanFirst = await companyModel.getOne("medi_customer_active_plans", { customer_plan_id: plan.customer_plan_id });
            
            if(parseInt(activePlanFirst.plan_extension_enable) == 1)
            {  
                let activePlanExtension = await companyModel.getOne('medi_active_plan_extensions', { customer_active_plan_id: activePlanFirst.customer_active_plan_id });
                if(parseInt(getEmployeePlan.fixed) == 1)
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
                else if(parseInt(getEmployeePlan.fixed) == 1)
                {
                    let calendarType = (getEmployeePlan.duration).split(" ");
                    let typeOfCalendar = "years";

                    if(calendarType[1] == "month" || calendarType[1] == "months")
                    {
                        typeOfCalendar = "months";
                    }
                    else if(calendarType[1] == "day" || calendarType[1] == "days")
                    {
                        typeOfCalendar = "days";
                    }

                    let tempValiDate = moment(new Date(getEmployeePlan.plan_start)).add(calendarType[0], typeOfCalendar);
                    expiryDate = moment(new Date(tempValiDate)).subtract(1, "days");
                }
            } else {
                if(parseInt(getEmployeePlan.fixed) == 1)
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
                else if(parseInt(getEmployeePlan.fixed) == 1)
                {
                    let calendarType = (getEmployeePlan.duration).split(" ");
                    let typeOfCalendar = "years";

                    if(calendarType[1] == "month" || calendarType[1] == "months")
                    {
                        typeOfCalendar = "months";
                    }
                    else if(calendarType[1] == "day" || calendarType[1] == "days")
                    {
                        typeOfCalendar = "days";
                    }

                    let tempValiDate = moment(new Date(getEmployeePlan.plan_start)).add(calendarType[0], typeOfCalendar);
                    expiryDate = moment(new Date(tempValiDate)).subtract(1, "days");
                }
            }
            expiryDate = moment(new Date(expiryDate)).format("YYYY-MM-DD");
        }

        let deletionText = null;
        if(deletion)
        {
            expiryDate = moment(new Date(deletion.date_withdraw)).format("DD MMMM, YY");
            deletionText = "Schedule for deletion: ".expiryDate;
        }
        else
        {
            if(moment(new Date()).diff(moment(new Date(expiryDate)), "days") < 0)
            {
                deletionText = "Care Plan For this Member is expired: ". expiryDate;
                deletion = true;
            }
        }

        finalUser.push({
            'spending_account': {
                'medical' : medical,
                'wellness': wellness
            },
            'dependents'        : dependents,
            'plan_tier'         : planTier,
            'name'              : member.fullname,
            'first_name'        : firstName,
            'last_name'         : lastName,
            'email'             : member.email,
            'enrollment_date'   : member.created_at,
            'plan_name'         : planName,
            'start_date'        : getEmployeePlan.plan_start,
            'expiry_date'       : expiryDate,
            'member_id'         : member.member_id,
            'nric'              : member.nric,
            'phone_no'          : member.phone_no,
            'job_title'         : member.job_title,
            'dob'               : member.dob,
            'postal_code'       : member.postal_code,
            'bank_account_number': member.bank_account_number,
            'employee_plan'     : getEmployeePlan,
            'deletion'          : deletion ? true : false,
            'deletion_text'     : deletionText
        });

        // console.log('finalUser', finalUser)
    }

    if(!data.search) {
        delete companyMembers.docs;
        companyMembers.data = finalUser;
    } else {
        companyMembers = new Object();
        companyMembers.data = finalUser;
    }
    console.log('companyMembers', companyMembers)
    return res.status(200).json(companyMembers)
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
                        whereValue: ["medical", "wellness"]
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

const checkEmployeePlanRefundType = async (req, res, next) =>
{
    let data = req.data;

    if((data.employee_id).length > 0)
    {
        return res.json({
            status: false,
            message: "Employee ID is required."
        });
    }

    let checkEmployee = await companyModel.getItem({
        table: "medi_members",
        conditions: [
            {
                whereField: "member_id",
                whereValue: data.employee_id
            },
            {
                whereField: "user_type",
                whereValue: 5
            }
        ],
        limit: 1
    });

    if(checkEmployee.Count <= 0 )
    {
        return res.json({
            status: false,
            message: "Account does not exist."
        });
    }

    let result = await PlanHelper.checkEmployeePlanRefundType(data.employee_id,res);

    return res.json({
        status: true,
        refund_status: result
    });
}


const getEmployeeDependents = async(req, res, next) => 
{
    let data = req.query;
    let cutomerId = parseInt(data.customer_id);
    let employeeId = parseInt(data.employee_id);

    if(!employeeId)
    {
        return res.json({
            status: false,
            message: 'Employee ID is required.'
        });
    }

    let checkEmployee = await companyModel.getOne('medi_members', { member_id: employeeId, member_type: "employee" });
    
    if(!checkEmployee)
    {
        return res.json({
            status: false,
            message: 'Employee does not exist.'
        });
    }

    let dependents = await companyModel.getMany('medi_member_covered_dependents', { owner_id: employeeId });

    let usersDependents = [];
    if(dependents.length > 0)
    {
        let deletion = false;
        let deletionText = null;
        let withdraw = null;
        let replace = null;
        let name = null;
        let firstName = "";
        let lastName = "";

        await map(dependents, async usersDependentsElement => {
            var mediUsers = await companyModel.getOne('medi_members', { member_id: usersDependentsElement.member_id, member_type: "dependent", active: 1 });
            if(mediUsers) {
                console.log('here nigga')
                let temp = new Object();
                
                deletion = false;
                deletionText = null;
                withdraw = await companyModel.getOne('medi_dependent_plan_withdraws', { member_id: usersDependentsElement.member_id })

                if(withdraw)
                {
                    deletion = true;
                    deletionText = `Dependent is Schedule for Dependent Plan Withdrawal this ${moment(new Date(withdraw.date_withdraw)).format("MMMM DD,YYYY")}.`
                }

                replace = await companyModel.getOne('medi_customer_replace_dependent', { member_id: usersDependentsElement.member_id })

                if(replace)
                {
                    deletion = true;
                    deletionText = `Dependent is Schedule for Dependent Account Replacement this ${moment(new Date(replace.expired_date)).format("MMMM DD,YYYY")}.`
                }
            
                temp.deletion = deletion;
                temp.deletion_text = deletionText;
                temp.relationship = (usersDependentsElement.relationship ? usersDependentsElement.relationship : 'Dependent');
                name = ((mediUsers.fullname).split("(")).length > 1 ? (mediUsers.fullname).split("(")[0] : (mediUsers.fullname).split(" ");
                
                if(name[0] != "" && name[1] != "")
                {
                    lastName = name.pop();
                    firstName = name.join(" ");
                }
                else
                {
                    lastName = mediUsers.fullname;
                    firstName = mediUsers.fullname;
                }

                if(mediUsers.dob == null || mediUsers.dob == "")
                {
                    temp.dob = null;
                }
                else
                {
                    temp.dob = moment(new Date(mediUsers.dob)).format("YYYY-MM-DD");
                }

                temp.first_name = firstName;
                temp.last_name = lastName;
                temp.nric = mediUsers.nric;
                temp.member_id = await _.pad(mediUsers.member_id, 6, '0');
                usersDependents.push(temp);
            }
        });
    }

    console.log('usersDependents', usersDependents)
    return res.json({
        status: true,
        dependents: usersDependents
    })
}

const updateEmployeeDetails = async(req, res, next) =>
{
    let data = req.body;
    if(!data.member_id) {
        return res.status(400).json({ status: false, message: 'Employee ID is required.' })
    }

    try {
        let update_data = req.body;
        let adminId = data.admin_id;
        let memberId = data.member_id;
        let hrId = data.customer_id;

        delete update_data.admin_id;
        delete update_data.member_id;
        delete update_data.customer_id;
        // validate parameters
        isValid = await validate.joiValidate(req.body, validate.updateEmployee, true)
        let { created_at, updated_at } = await global_helper.createDate();

        if(typeof isValid != 'boolean')
        {
            return res.status(400).json({
                status: false,
                message: isValid.details[0].message
            })
        }

        // check if member exist
        let member = await companyModel.getOne("medi_members", { member_id: memberId })

        if(!member) {
            return res.status(404).json({ status: false, message })
        }

        if(update_data.dob) {
            update_data.dob = moment(update_data.dob).format("YYYY-MMMM-DD");
        }

        update_data.updated_at = updated_at;

        let update = await companyModel.updateOne("medi_members", { _id: member._id }, update_data);

        update_data.member_id = memberId;
        if(adminId)
        {
            SystemLogLibrary.createAdminLog({
                admin_id: adminId,
                admin_type: "mednefits",
                type: "admin_hr_updated_employee_details",
                data: update_data,
                created_at: created_at,
                updated_at: updated_at
            })
        }
        else
        {
            SystemLogLibrary.createAdminLog({
                admin_id: hrId,
                admin_type: "hr",
                type: "admin_hr_updated_employee_details",
                data: update_data,
                created_at: created_at,
                updated_at: updated_at
            })
        }
        
        return res.json({
            status: true,
            message: 'Success.'
        });
    } catch (error) {
        console.log('error', error)
        return res.json({
            status: false,
            message: error.message
        });
    }
}

const updateDependentDetails = async (req, res, next) =>
{
    
    let data = req.body;
    if(!data.member_id) {
        return res.status(400).json({ status: false, message: 'Member ID is required.' })
    }

    try {
        let update_data = req.body;
        let adminId = data.admin_id;
        let memberId = data.member_id;
        let hrId = data.customer_id;

        delete update_data.admin_id;
        delete update_data.member_id;
        delete update_data.customer_id;
        // validate parameters
        isValid = await validate.joiValidate(req.body, validate.updateDependent, true)
        let { created_at, updated_at } = await global_helper.createDate();

        if(typeof isValid != 'boolean')
        {
            return res.status(400).json({
                status: false,
                message: isValid.details[0].message
            })
        }

        // check if member exist
        let member = await companyModel.getOne("medi_members", { member_id: memberId, member_type: 'dependent' })

        if(!member) {
            return res.status(404).json({ status: false, message })
        }

        if(update_data.dob) {
            update_data.dob = moment(update_data.dob).format("YYYY-MM-DD");
        }

        update_data.updated_at = updated_at;

        let update = await companyModel.updateOne("medi_members", { _id: member._id }, update_data);

        update_data.member_id = memberId;
        if(adminId)
        {
            SystemLogLibrary.createAdminLog({
                admin_id: adminId,
                admin_type: "mednefits",
                type: "admin_hr_updated_dependent_details",
                data: update_data,
                created_at: created_at,
                updated_at: updated_at
            })
        }
        else
        {
            SystemLogLibrary.createAdminLog({
                admin_id: hrId,
                admin_type: "hr",
                type: "admin_hr_updated_dependent_details",
                data: update_data,
                created_at: created_at,
                updated_at: updated_at
            })
        }
        
        return res.json({
            status: true,
            message: 'Dependent Profile Updated!'
        });
    } catch (error) {
        console.log('error', error)
        return res.json({
            status: false,
            message: error.message
        });
    }

}

const createEmployeeReplacementSeat = async (req, res, next) =>
{
    try {
        
        let data = req.body;
        let memberId = data.employee_id;

            // $input = Input::all();
            // $customer_id = PlanHelper::getCusomerIdToken();

        let checkWithdraw = await companyModel.countCollection({
            table: "medi_customer_employee_plan_refund_details",
            conditions: [
                {
                    whereField: "member_id",
                    whereValue: memberId
                }
            ]
        });

        let expiryDate = moment(new Date(data.last_date_of_coverage)).format("YYYY-MM-DD");
        let date = moment(new Date()).format("YYYY-MM-DD");
        let daysDifference = moment(new Date(expiryDate)).diff(moment(new Date(date)), 'days');

        if(checkWithdraw > 0)
        {
            if(daysDifference <= 0)
            {
                let result = await removeEmployee(memberId, expiryDate, false);
                
                if(!result)
                {
                    return res.json({
                        status: false,
                        message: 'Failed to create withdraw employee. Please contact Mednefits and report the issue.'
                    });
                }
            }
            else
            {
                await createWithDrawEmployees(data.employee_id, expiryDate, true, false, true);
            }
        }
        else
        {
            return res.json({
                status: false,
                message: 'Employee already deleted.'
            });
        }

        return res.json({
            status: true,
            message: 'Hold Seat updated.'
        });

    } catch (error) {
		// 			$email = [];
		// 			$email['end_point'] = url('hr/employees/withdraw', $parameter = array(), $secure = null);
		// 			$email['logs'] = 'Withdraw Employee Failed - '.$e;
		// 			$email['emailSubject'] = 'Error log.';
		// 			EmailHelper::sendErrorLogs($email);
		// 			return array('status' => FALSE, 'message' => 'Failed to create withdraw employee. Please contact Mednefits and report the issue.');
    }
}

const removeEmployee = async (memberId, expiryDate, refundStatus, customerId) =>
{
    try {
        

        let calculate = false;
        let totalRefund = 0;


        let plan = await companyModel.getItemPartition({
            table: "medi_member_plan_history",
            secondaryIndex: true,
            indexName: "MemberIdIndex",
            indexValue: memberId,
            descending: true,
            limit: 1
        });

        // $plan = DB::table('user_plan_type')->where('user_id', $id)->orderBy('created_at', 'desc')->first();
        // $calculate = false;
        // $total_refund = 0;
        // // check if active plan is a trial plan and has a plan extension

        let activePlan = await companyModel.getItemEqual({
            table: "medi_member_plan_history",
            conditions: [
                {
                    whereField: "member_id",
                    whereValue: memberId
                },
                {
                    whereField: "type",
                    whereValue: "started"
                }
            ],
            descending: true,
            limit: 1
        });
        // $active_plan = DB::table('user_plan_history')
        // ->where('user_id', $id)
        // ->where('type', 'started')
        // ->orderBy('date', 'desc')
        // ->first();

        
        let planActive = await companyModel.getItemPartition({
            table: "medi_customer_active_plans",
            indexValue: activePlan.customer_active_plan_id,
            limit: 1
        }, res);
        planActive = planActive.Items[0].attrs;
        
        if(planActive.account_type == "trial_plan")
        {
            let extension = await companyModel.getItemPartition({
                table: "medi_active_plan_extensions",
                secondaryIndex: true,
                indexName: "CustomerActivePlanIdIndex",
                indexValue: planActive.customer_active_plan_id,
                limit: 1
            }, res);

            if(extension.Count > 0 && parseInt(extension.Items[0].attrs.enable) == 1)
            {
                extension = extension.Items[0].attrs;
                let extensionPlanStart = moment(new Date(extension.plan_start)).format("YYYY-MM-DD");
                let extensionDiff =  moment(new Date(expiryDate)).diff(moment(new Date(extensionPlanStart)), 'days');
                
                if(extensionDiff >= 0)
                {
                    calculate = true;
                    planStart = extensionPlanStart;
                    invoice = await companyModel.getItemEqual({
                        table: "medi_active_plan_invoices",
                        conditions: [
                            {
                                whereField: "customer_active_plan_id",
                                whereValue: planActive.customer_active_plan_id
                            },
                            {
                                whereField: "plan_extension_enable",
                                whereValue: 1
                            }
                        ],
                        limit: 1
                    }, res);
                }
                else
                {
                    calculate = false;
                    planStart = plan.plan_start;
                }
            
            }
            else
            {
                calculate = false;
                planStart = plan.plan_start;
            }
        }
        else
        {
            invoice = await companyModel.getItemPartition({
                table: "medi_active_plan_invoices",
                secondaryIndex: true,
                indexName: "CustomerActivePlanIdIndex",
                indexValue: activePlan.customer_active_plan_id,
                limit: 1
            });
            invoice = invoice.Items[0].attrs;

            calculate = true;
            planStart = plan.plan_start;
        }

        plan = await companyModel.getItemPartition({
            table: "medi_member_plan_history",
            secondaryIndex: true,
            indexName: "MemberIdIndex",
            indexValue: memberId,
            descending: true,
            limit: 1
        });
        // $plan = DB::table('user_plan_type')->where('user_id', $id)->orderBy('created_at', 'desc')->first();

        if(calculate)
        {
            let planDates = await companyController.getCompanyPlanDates(customerId);
            let diff = moment(new Date(planStart)).diff(moment(new Date(planDates.plan_end)));

            let totalDays = moment(new Date(planDates.plan_start)).diff(moment(new Date(planDates.plan_end)), 'days');
            //     $diff = date_diff(new DateTime(date('Y-m-d', strtotime($plan_start))), new DateTime(date('Y-m-d')));
            //     $days = $diff->format('%a') + 1;
            let remainingDays = totalDays - diff;
            //     $total_days = date("z", mktime(0,0,0,12,31,date('Y'))) + 1;
            //     $remaining_days = $total_days - $days;
            let costPlanAndDays = invoice.individual_price / totalDays;
            let tempTotal = costPlanAndDays * remainingDays;
            totalRefund = tempTotal * .70;
            //     $cost_plan_and_days = ($invoice->individual_price/$total_days);
            //     $temp_total = $cost_plan_and_days * $remaining_days;
            //     $total_refund = $temp_total * 0.70;
        }

        // save history
        let userPlanHistoryData = {
            member_id: id,
            type: "deleted_expired",
            date: expiryDate,
            customer_active_plan_id: activePlan.customer_active_plan_id
        };

        await UserPlanHistoryHelper.createUserPlanHistory(userPlanHistoryData, res);
    //     $user_plan_history->createUserPlanHistory($user_plan_history_data);

        let refund = await companyModel.getItemEqual({
            table: "medi_customer_employee_plan_payment_refunds",
            conditions: [
                {
                    whereField: "customer_active_plan_id",
                    whereValue: activePlan.customer_active_plan_id
                },
                {
                    whereField: "refund_date",
                    whereValue: expiryDate
                },
                {
                    whereField: "status",
                    whereValue: 0
                }
            ],
            limit: 1
        }, res);
        
        if(refund.Count > 0)
        {
            refund = refund.Items[0].attrs;
            paymentRefundId = refund.customer_employee_plan_payment_refund_id
        }
        else
        {
            paymentRefundId = await PlanHelper.createPaymentsRefund(activePlan.customer_active_plan_id, expiryDate);
        }

        let amount = totalRefund;

        await PlanWithdrawHelper.createPlanWithdraw({
            payment_refund_id: paymentRefundId,
            member_id: id,
            customer_active_plan_id: activePlan.customer_active_plan_id,
            date_withdraw: expiryDate,
            amount: amount,
            refund_status: refundStatus == true ? 0 : 2
        }, res);

    //    let user = await companyModel.getItemPartition({
    //        table: "medi_members",
    //        indexValue: memberId,
    //        limit: 1
    //    });

        let userData = {
            member_id: memberId,
            active: 0
        }

        await companyModel.updateDataEq({
            table: "medi_members",
            data: userData
        });

        let companyMembersContainer = await companyModel.getItemPartition({
            table: "medi_company_members",
            secondaryIndex: true,
            indexName: "MemberIdIndex",
            indexValue: memberId,
            attributes: ['company_member_id']
        })

        if(companyMembersContainer.Count > 0)
        {
            await map(companyMembersContainer, async companyMembersElement => {
                companyMembersElement = companyMembersElement.attrs;
                await companyModel.updateDataEq({
                    table: "medi_company_members",
                    data: {
                        company_member_id: companyMembersElement.company_member_id,
                        deleted: 1
                    }
                });
            });
        }

        await PlanHelper.revemoDependentAccounts(memberId, expiryDate, res);
        
        if(!refundStatus)
        {
            await PlanHelper.updateCustomerPlanStatusDeleteUserVacantSeat(memberId, res);
        }
        else
        {
            await updateCustomerPlanStatusDeleteUser(memberId, res);
        }

        return true;

    } catch (error) {
        //     $email = [];
        //     $email['end_point'] = url('hr/employees/withdraw', $parameter = array(), $secure = null);
        //     $email['logs'] = 'Withdraw Employee Failed - '.$e;
        //     $email['emailSubject'] = 'Error log.';
        //     EmailHelper::sendErrorLogs($email);
        //     return FALSE;
    }

}



const updateCustomerPlanStatusDeleteUser = async (id, res) =>
{
    let userPlan = await companyModel.getItemEqual({
        table: "medi_member_plan_history",
        secondaryIndex: true,
        indexName: "MemberIdIndex",
        indexValue: id,
        descending: true,
        limit: 1
    }, res);
    userPlan = userPlan.Items[0].attrs;

    let activePlan = await companyModel.getItemPartition({
        table: "medi_customer_active_plans",
        indexValue: userPlan.customer_active_plan_id
    }, res);
    activePlan = activePlan.Items[0].attrs;

    let customerPlanId = activePlan.customer_plan_id;    

    if(parseInt(activePlan.plan_extension_enable) == 1)
    {
        let extension = await companyModel.getItemPartition({
            table: "medi_active_plan_extensions",
            secondaryIndex: true,
            indexName: "CustomerActivePlanIdIndex",
            indexValue: userPlan.customer_active_plan_id,
            limit: 1,
            attributes: ['enable']
        }, res);

        if(extension.Count > 0 && parseInt(extension.Items[0].attrs.enable) == 1)
        {
            activePlan = extension;
        }
    }
    
    if(activePlan.account_type == "stand_alone_plan" || activePlan.account_type == "lite_plan" || activePlan.account_type == "trial_plan")
    {
        CustomerPlanStatusHelper.addjustCustomerStatus('employees_input', customerPlanId, 'decrement', 1, res);
        CustomerPlanStatusHelper.addjustCustomerStatus('enrolled_employees', customerPlanId, 'decrement', 1, res);
    }
    else
    {
        CustomerPlanStatusHelper.addjustCustomerStatus('enrolled_employees', customerPlanId, 'decrement', 1, res);
    }

}

const createWithDrawEmployees = async (memberId, expiryDate, history, refundStatus, vacateSeat) =>
{
    // $withdraw = new PlanWithdraw();
    // $user_plan_history = new UserPlanHistory();

    try {
        let activePlan = await companyModel.getItemEqual({
            table: "medi_member_plan_history",
            conditions: [
                {
                    whereField: "member_id",
                    whereValue: memberId
                },
                {
                    whereField: "type",
                    whereValue: "started"
                }
            ],
            descending: true,
            limit: 1
        }, res);
        activePlan = activePlan.Items[0].attrs;

        let plan = await companyModel.getItemEqual({
            table: "medi_member_plan_history",
            conditions: [
                {
                    whereField: "member_id",
                    whereValue: memberId
                }
            ],
            descending: true,
            limit: 1
        }, res);
        plan = plan.Items[0].attrs;

        let calculate = false;
        let totalRefund = 0;
        let planStart = null;
        let invoice = null;
        
        let planActive = await companyModel.getItemPartition({
            table: "medi_customer_active_plans",
            indexValue: activePlan.customer_active_plan_id,
            limit: 1
        }, res);
        planActive = planActive.Items[0].attrs;
        
        if(planActive.account_type == "trial_plan")
        {
            let extension = await companyModel.getItemPartition({
                table: "medi_active_plan_extensions",
                secondaryIndex: true,
                indexName: "CustomerActivePlanIdIndex",
                indexValue: planActive.customer_active_plan_id,
                limit: 1
            }, res);

            if(extension.Count > 0 && parseInt(extension.Items[0].attrs.enable) == 1)
            {
                extension = extension.Items[0].attrs;
                let extensionPlanStart = moment(new Date(extension.plan_start)).format("YYYY-MM-DD");
                let extensionDiff =  moment(new Date(expiryDate)).diff(moment(new Date(extensionPlanStart)), 'days');
                
                if(extensionDiff >= 0)
                {
                    calculate = true;
                    planStart = extensionPlanStart;
                    invoice = await companyModel.getItemEqual({
                        table: "medi_active_plan_invoices",
                        conditions: [
                            {
                                whereField: "customer_active_plan_id",
                                whereValue: planActive.customer_active_plan_id
                            },
                            {
                                whereField: "plan_extension_enable",
                                whereValue: 1
                            }
                        ],
                        limit: 1
                    }, res);
                }
                else
                {
                    calculate = false;
                    planStart = plan.plan_start;
                }
            
            }
            else
            {
                calculate = false;
                planStart = plan.plan_start;
            }
        }
        else
        {
            invoice = await companyModel.getItemPartition({
                table: "medi_active_plan_invoices",
                secondaryIndex: true,
                indexName: "CustomerActivePlanIdIndex",
                indexValue: activePlan.customer_active_plan_id,
                limit: 1
            });

            calculate = true;
            planStart = plan.plan_start;
        }

        if(calculate)
        {
            let planDates = await companyController.getCompanyPlanDates(customerId);
            let diff = moment(new Date(planStart)).diff(moment(new Date(planDates.plan_end)));

            let totalDays = moment(new Date(planDates.plan_start)).diff(moment(new Date(planDates.plan_end)), 'days');
            let remainingDays = totalDays - diff;
            let costPlanAndDays = invoice.individual_price / totalDays;
            let tempTotal = costPlanAndDays * remainingDays;
            totalRefund = tempTotal * .70;
        }

        let amount = totalRefund;

        let refund = await companyModel.getItemEqual({
            table: "medi_customer_employee_plan_payment_refunds",
            limit: 1,
            conditions: [
                {
                    whereField: "",
                    whereValue: 0
                },
                {
                    whereField: "status",
                    whereValue: 0
                }
            ]
        });

        let paymentRefundId = null;
        if(refund.Count > 0)
        {
            refund = refund.Items[0].attrs;
            paymentRefundId = refund.customer_employee_plan_payment_refund_id;
        }
        else
        {
            paymentRefundId = await PlanHelper.createPaymentsRefund(activePlan.customer_active_plan_id, expiryDate);
        }

        let newData = {
            payment_refund_id: paymentRefundId,
            member_id: memberId,
            customer_active_plan_id: activePlan.customer_active_plan_id,
            date_withdraw: expiryDate,
            amount: amount,
            refund_status: (refundStatus == true ? 0 : 2),
            vacate_seat: (vacateSeat == true ? 1 : 0)
        }
        
        PlanWithdraw.createPlanWithdraw(newData);
        PlanHelper.revemoDependentAccounts(memberId, moment(new Date(expiryDate).format("YYYY-MM-DD")));
        return true;

    } catch (error) {
        //     $email = [];
        //     $email['end_point'] = url('hr/employees/withdraw', $parameter = array(), $secure = null);
        //     $email['logs'] = 'Withdraw Schdedule Employee Failed - '.$e->getMessage();
        //     $email['emailSubject'] = 'Error log.';
        //     EmailHelper::sendErrorLogs($email);
        //     return FALSE;
    }




}

const withDrawEmployees = async(req, res, next) =>
{
    try {
            
        let data = req.body;
        let users = data.users;
        let adminId = data.admin_id;
        let hrId = data.customer_id;
        let memberId = data.member_id;
        let customerId = data.customer_id;

        let date = moment(new Date()).format("YYYY-MM-DD");
        // get admin session from mednefits admin login
        // $admin_id = Session::get('admin-session-id');
        // $hr_data = StringHelper::getJwtHrSession();
        // $hr_id = $hr_data->hr_dashboard_id;
        // $input = Input::all();
        // $date = date('Y-m-d');

        let checkWithdraw = null;
        let expiryDate = null;
        await map(users, async usersElement => {
            checkWithdraw = await companyModel.countCollection({
                table: "medi_customer_employee_plan_refund_details",
                conditions: [
                    {
                        whereField: "member_id",
                        whereValue: memberId
                    }
                ]
            }, res);

            if(checkWithdraw == 0)
            {
                if(moment(new Date(date)).diff(moment(new Date(expiryDate)), 'days') >= 0)
                {
                    let result = await removeEmployee(memberId, expiryDate, false, customerId);
                    
                    if(!result)
                    {
                        return res.json({
                            status: false,
                            message: 'Failed to create withdraw employee. Please contact Mednefits and report the issue.'
                        });
                    }
                }
                else
                {
                    await createWithDrawEmployees(data.employee_id, expiryDate, true, false, true,customerId);
                }
            }

            if(adminId)
            {
                await SystemLogLibrary.createAdminLog({
                    admin_id: hrId,
                    admin_type: 'mednefits',
                    type: 'admin_hr_removed_employee',
                    data: SystemLogLibrary.serializeData(usersElement)
                });
            }
            else
            {
                await SystemLogLibrary.createAdminLog({
                    admin_id: hrId,
                    admin_type: 'hr',
                    type: 'admin_hr_removed_employee',
                    data: SystemLogLibrary.serializeData(usersElement)
                });
            }
        });

        return res.json({
            status: true,
            message: 'Withdraw Employee(s) Successful.'
        })
    } catch (error) {
        //                 $email = [];
        //                 $email['end_point'] = url('hr/employees/withdraw', $parameter = array(), $secure = null);
        //                 $email['logs'] = 'Withdraw Employee Failed - '.$e;
        //                 $email['emailSubject'] = 'Error log.';
        //                 EmailHelper::sendErrorLogs($email);
        //                 return array('status' => FALSE, 'message' => 'Failed to create withdraw employee. Please contact Mednefits and report the issue.');
    }

}

const createDependentAccount = async (req, res, next) =>
{
    let data = req.body;
    let customerId = data.customer_id;
    let adminId = data.admin_id || data.customer_id;
    let hrId = data.hr_id || data.customer_id;
    let memberId = data.employee_id;
    let totalDependents = 0;
    let {created_at, updated_at} = await global_helper.createDate();

    if(employeeId == "")
    {
        return res.json({
            status: false,
            message: 'Employee ID is required.'
        });
    }

    // $input = Input::all();
    // $customer_id = PlanHelper::getCusomerIdToken();
    // // get admin session from mednefits admin login
    // $admin_id = Session::get('admin-session-id');
    // $hr_data = StringHelper::getJwtHrSession();
    // $hr_id = $hr_data->hr_dashboard_id;

    // if(empty($input['employee_id']) || $input['employee_id'] == null) {
    //     return array('status' => false, 'message' => 'Employee ID is required.');
    // }

    let checkEmployee = await companyModel.getItemEqual({
        table: "medi_members",
        conditions: [
            {
                whereField: "member_id",
                whereValue: memberId
            },
            {
                whereField: "member_type",
                whereValue: 5
            }
        ],
        limit: 1
    });

    if(checkEmployee.Count <= 0)
    {
        return res.json({
            status: false,
            message: 'Employee does not exist.'
        })
    }
    checkEmployee = checkEmployee.Items[0].attrs;
    // $check_employee = DB::table('user')
    // ->where('UserID', $input['employee_id'])
    // ->where('UserType', 5)
    // ->first();

    // if(!$check_employee) {
    //     return array('status' => false, 'message' => 'Employee does not exist.');
    // }

    if((data.dependents).length > 0)
    {
        return res.json({
           status: false,
           message: 'Dependents data is required.'
        });
    }
    // if(empty($input['dependents']) || $input['dependents'] == null || sizeof($input['dependents']) == 0) {
    //     return array('status' => false, 'message' => 'Dependents data is required.');
    // }

    let planned = await companyModel.getItemPartition({
        table: "medi_customer_plans",
        secondaryIndex: true,
        indexName: "CustomerIdIndex",
        indexValue: customerId,
        descending: true,
        limit: 1
    });
    planned = planned.Items[0].attrs;

    let dependentPlanStatus = await companyModel.getItemPartition({
        table: "medi_dependent_plan_status",
        secondaryIndex: true,
        indexName: "CustomerPlanIdIndex",
        indexValue: planned.customer_plan_id
    });
    // $planned = DB::table('customer_plan')
    // ->where('customer_buy_start_id', $customer_id)
    // ->orderBy('created_at', 'desc')
    // ->first();

    if(dependentPlanStatus.Count > 0)
    {
        totalDependents = parseFloat(dependentPlanStatus.dependent_head_count) - parseFloat(dependentPlanStatus.dependent_enrolled_count);
    }
    else
    {
        return res.json({
            status: false,
            message: "This Company does not have a Dependent Purchase. Please request a Dependent Plan Purchase to enable dependent accounts."
        });
    }

    let planTier = await companyModel.getItemEqual({
        table: "medi_customer_plan_tier_users",
        conditions: [
            {
                whereField: "member_id",
                whereValue: memberId
            }
        ]
    });

    let customerPlanTiers = null;
    let flag = false;
    let planTierContainer = new Array();

    if(planTier.Count > 0)
    {
        await map(planTier, async planTierElement => {
            if(!flag)
            {
                planTierElement = planTierElement.attrs;
                customerPlanTiers = await companyModel.getItemEqual({
                    table: "medi_customer_plan_tiers",
                    conditions: [
                        {
                            whereField: "plan_tier_id",
                            whereValue: planTierElement.plan_tier_id
                        },
                        {
                            whereField: "active",
                            whereValue: 1
                        }
                    ]
                });
    
                if(customerPlanTiers.Count > 0)
                {
                    flag = true;
                    planTierContainer = [...planTierContainer, planTierElement, customerPlanTiers.Items[0].attrs];
                }
            }

        });
    }
    let planTierStatus = false;
    let planTierId = null;

    if(planTierContainer.length > 0)
    {
        planTierStatus = true;
        planTierId = planTier.plan_tier_id;
        let vacantSeats = parseFloat(planTierContainer.dependent_head_count) - parseFloat(planTierContainer.dependent_enrolled_count);
       
        if((dependents.dependents).length > vacantSeats) {
            return res.json({
                status: false,
                message: 'We realised the current dependent headcount you wish to enroll is over the current vacant member seat/s of this Plan Tier.'
            })
        }
    }

    let dependentPlanId = await PlanHelper.getCompanyAvailableDependentPlanId(customerId);

    if(!dependentPlanId)
    {
        let dependentPlan = companyModel.getItemPartition({
            table: "medi_dependent_plans",
            secondaryIndex: true,
            indexName: "CustomerPlanIdIndex",
            indexValue: planned.customer_plan_id,
            limit: 1,
            descending: true
        }, res);

        dependentPlanId = dependentPlan.Items[0].attrs.dependent_plan_id;
    }

    let packageGroup = await companyController.getDependentPackageGroup(dependentPlanId, res);
    // $package_group = PlanHelper::getDependentPackageGroup($dependent_plan_id);
    // $plan_tier_user = new PlanTierUsers();
    // $plan_tier_class = new PlanTier();
    // $dependent_plan_status = new DependentPlanStatus( );

    await map(data.dependents, async dependentElement => {
        let user = {
            fullname:  dependentElement['first_name'] + " " + dependentElement['last_name'],
            nric: dependentElement['nric'],
            dob: moment(new Date(dependentElement.dob))
        }

        let userId = await PlanHelper.createDependentAccountUser(user);

        if(userId)
        {
            let familyResult = await companyModel.insertItem({
                table: "medi_member_covered_dependents",
                data: {
                    member_covered_dependent_id: await global_helper.createUuID(),
                    owner_id: memberId,
                    member_id: userId,
                    relationship: dependentElement.relationship,
                    user_type: 'dependent',
                    deleted: 0,
                    deleted_at: null,
                    created_at: created_at,
                    updated_at: updated_at
                }
            }, res);
            user.family_data = familyResult

            if((Object.keys(familyResult || {})).length > 0)
            {
                let history = await companyModel.insertItem({
                    table: "medi_dependent_plan_history",
                    data: {
                        dependent_plan_history_id: await global_helper.createUuID(),
                        member_id: userId,
                        dependent_plan_id: dependentPlanId,
                        package_group_id: packageGroup.package_group_id,
                        plan_start: moment(new Date(dependentElement.plan_start)),
                        plan_end: moment(new Date(dependentElement.plan_start)).add(1,'years'),
                        duration: "12 months",
                        type: 'started',
                        fixed: 1,
                        created_at: created_at,
                        updated_at: updated_at
                    }
                }, res);
                user.dependent_history = history

                if(planTierId)
                {
                    await PlanTierUsersHelper.creaeData({
                        plan_tier_user_id: global_helper.createUuID(),
                        plan_tier_id: planTierId,
                        member_id: userId,
                        status: 1,
                        created_at: created_at,
                        updated_at: updaed_at
                    });

                    await PlanTierHelper.increamentMemberEnrolledHeadCount(planTierId);
                }

                user.user_id = userId;

                if(adminId)
                {
                //                     'admin_id'  => $admin_id,
                //                     'admin_type' => 'mednefits',
                //                     'type'      => 'admin_hr_created_dependent',
                //                     'data'      => SystemLogLibrary::serializeData($user)
                //                 );
                //                 SystemLogLibrary::createAdminLog($admin_logs);
                }
                else
                {
                    //                 $admin_logs = array(
                    //                     'admin_id'  => $hr_id,
                    //                     'admin_type' => 'hr',
                    //                     'type'      => 'admin_hr_created_dependent',
                    //                     'data'      => SystemLogLibrary::serializeData($user)
                    //                 );
                    //                 SystemLogLibrary::createAdminLog($admin_logs);
                }
            
                await DependentPlanStatusHelper.incrementEnrolledDependents(planned.customer_plan_id);
            }
        }
    });

    return res.json({
        status: true, 
        message: 'Dependent Account successfully created.'
    });
}

const replaceEmployee = async (req, res, next) =>
{
    let data = req.body;
    let id = data.id;
    let replaceId = data.replace_id;
    let firstName =  data.first_name;
    let lastName = data.last_name;

    let isValid = await employeeValidator.joiValidate({
        replace_id: replaceId,
        first_name: firstName,
        last_name: lastName,
        nric: data.nric,
        email: data.email,
        dob: data.dob,
        mobile: data.mobile,
        postal_code: data.postal_code,
        last_day_coverage: data.last_day_coverage,
        plan_start: data.plan_start
    }, employeeValidator.replaceEmployee, true);

    if(typeof isValid != 'boolean')
    {
        return res.json({
            status: false,
            message: isValid.details[0].message
        });
    }

    let check = await companyModel.getItemEqual({
        table: "medi_members",
        conditions: [
            {
                whereField: "email",
                whereValue: data.email
            },
            {
                whereField: "member_type",
                whereValue: 5
            },
            {
                whereField: "active",
                whereValue: 1
            }
        ]
    });

    let validLastDayOfCoverage = PlanHelper.validateStartDate(data.last_day_coverage);
    let validatePlanStart = PlanHelper.validateStartDate(data.plan_start);
    
    if(!validLastDayOfCoverage)
    {
        return res.json({
            status: false,
            message: 'Last Day of Coverage of must be a date.'
        })
    }
    
    if(!validatePlanStart)
    {
        return res.json({
            status: false,
            message: 'Last Day of Coverage of must be a date.'
        });
    }

    let replaceEmployee = await companyModel.getItemEqual({
        table: "medi_customer_replace_employee",
        conditions: [
            {
                whereField: "member_id",
                whereValue: replaceId
            }
        ],
        limit: 1
    });

    if(replaceEmployee.Count > 0)
    {
        return res.json({
            status: false,
            message: 'Employee already in Replacement.'
        });
    }

    let medical = data.medical_credits;
    let wellness = data.wellness_credits;

    let employee = await companyModel.getItemEqual({
        table: "medi_members",
        conditions: [
            {
                whereField: "member_id",
                whereValue: replaceId
            },
            {
                whereField: "member_type",
                whereValue: 5
            }
        ],
        limit: 1
    });

    if(employee.Count <= 0)
    {
        return res.json({
            status: false,
            message: 'Employee does not exist.'
        });
    }

    if(check.Count > 0)
    {
        return res.json({
            status: false,
            message: 'Email Address already taken.'
        });
    }

    let lastDayOfCoverage = moment(new Date(data.last_day_coverage)).format("YYYY-MM-DD");
    let planStart = moment(new Date(data.plan_start)).format("YYYY-MM-DD");



        // $input = Input::all();
        // $user = new User();
        
        // $id = PlanHelper::getCusomerIdToken();
        

		// $last_day_of_coverage = date('Y-m-d', strtotime($input['last_day_coverage']));
		// $plan_start = date('Y-m-d', strtotime($input['plan_start']));
    let customer = await companyModel.getItemPartition({
        table: "medi_customer_wallets",
        secondaryIndex: true,
        indexName: "CustomerIdIndex",
        indexValue: id,
        limit: 1
    }, res);

    if(moment(new Date(lastDayOfCoverage)).diff(moment(new Date(planStart)),'days') == 0)
    {
        let result = await PlanHelper.createReplacementEmployee(replaceId, data, id, false, medical,wellness, res)
        
        if(result.status == true)
        {
            return res.json({
                status: true,
                message: result.message
            });
        }
        else
        {
            return res.json({
                status: false,
                message: 'Unable to create new employee. Please contact Mednefits Team for assistance.'
            });
        }
    }
    else
    {	
        // $replace = new CustomerReplaceEmployee( ); 
        let userPlanHistory = await companyModel.getItemEqual({
            table: "medi_member_plan_history",
            conditions: [
                {
                    whereField: "member_id",
                    whereValue: replaceId
                },
                {
                    whereField: "type",
                    whereValue: "started"
                }
            ],
            descending: true,
            limit: 1
        }, res);

        let activePlan = null;
        if(userPlanHistory.Count <= 0)
        {
            activePlan = await companyModel.getItemPartition({
                table: "medi_customer_active_plans",
                secondaryIndex: true,
                indexName: "CustomerIdIndex",
                indexValue: id,
                descending: true,
                limit: 1
            }, res)
        }
        else
        {
            userPlanHistory = userPlanHistory.Items[0].attrs;
            activePlan = await companyModel.getItemPartition({
                table: "medi_customer_active_plans",
                indexValue: userPlanHistory.customer_active_plan_id,
                limit: 1
            }, res)
        }
        
        let deactiveEmployeeStatus = 0;
        let replaceStatus = 0;

        if(moment(new Date()).diff(moment(lastDayOfCoverage),"days") >= 0)
        {
            let userData = {
                member_id: replaceId,
                active: 0,
                updated_at: updated_at
            }

            await companyModel.updateDataEq({
                table: "medi_members",
                data: userData
            });

            let corporateMembersContainer = await companyModel.getItemEqual({
                table: "medi_company_members",
                conditions: [
                    {
                        whereField: "member_id",
                        whereValue: replaceId
                    }
                ]
            });

            if(corporateMembersContainer.Count > 0)
            {
                await map(corporateMembersContainer, async corporateMembersElement => {
                    corporateMembersElement = corporateMembersElement.attrs;

                    await companyModel.updateDataEq({
                        table: "medi_company_members",
                        data: {
                            company_member_id: corporateMembersElement.company_member_id,
                            deleted: 1,
                            updated_at: updated_at
                        }
                    });
                })
            }

            await UserPlanHistoryHelper.createUserPlanHistory({
                //         'user_id'		=> $replace_id,
                //         'type'			=> "deleted_expired",
                //         'date'			=> date('Y-m-d', strtotime($input['last_day_coverage'])),
                //         'customer_active_plan_id' => $active_plan->customer_active_plan_id
            });
            deactiveEmployeeStatus = 1;
        }

        let pending = 1;
        customer = await companyModel.getItemPartition({
            table: "medi_customer_wallets",
            secondaryIndex: true,
            indexName: "CustomerIdIndex",
            indexValue: id,
            limit: 1
        }, res);
    
        let corporate = await companyModel.getItemPartition({
            table: "medi_customer_purchase",
            indexValue: id,
            limit: 1
        }, res);

        let password = Math.random().toString(36).substring(0,8);
        
        if(moment(new Date()).diff(moment(planStart),"days") >= 0)
        {
            pending = 0;
        }
        let = "email"
        if(data.mobile)
        {
            communicationType = "sms"
        }

        // $data = array(
        //     'Name'          => $input['first_name'].' '.$input['last_name'],
        //     'Password'  => md5($password),
        //     'Email'         => $input['email'],
        //     'PhoneNo'       => $input['mobile'],
        //     'PhoneCode' => "+65",
        //     'NRIC'          => $input['nric'],
        //     'Job_Title'  => 'Other',
        //     'DOB'       => $input['dob'],
        //     'Zip_Code'  => $input['postal_code'],
        //     'Active'        => 1,
        //     'pending'		=> $pending,
        //     'communication_type' => $communication_type
        // );
       userId = await  UserHelper.createUserFromCorporate({
            fullname: data['first_name'] + " " + data['last_name'],
            password: sha256(password),
            email: data['email'],
            phone_no: data['mobile'],
            phone_code: "+65",
            nric: data['nric'],
            job_title: 'Other',
            dob: data['dob'],
            zip_code: data['postal_code'],
            active: 1,
            pending: pending,
            communication_type: communicationType
       },res);

       if(userId)
        {
            let corporateMember  = {
                company_member_id: await global_helper.createUuID(),
                customer_id: corporate.customer_id,
                member_id: userId,
                type: 'member',
                deleted: 0,
                created_at: created_at,
                updated_at: updated_at
            }

            await awsDynamoDB.insertItem({
                table: "medi_company_members",
                data: corporateMember
            }, res);

            let checkPlanType = await UserPlanTypeHelper.checkUserPlanType(userId);

            if(checkPlanType.Count == 0)
            {
                let packageGroupId = await PackagePlanGroupHelper.getPackagePlanGroupDefault();
                let resultBundle = await BundleHelper.getBundle(packageGroupId);

                await map(resultBundle, async resultBundleElement => {
                    resultBundleElement = resultBundleElement.attrs;
                    await UserPackageHelper.createUserPackage(resultBundleElement.benefits_care_package_id, userId);
                });

                // get customer actiePlan
                let customerActivePlan = await awsDynamoDB.getItemEqual({
                    table: "",
                    conditions: {
                        type: "started",
                        member_id: userId
                    },
                    attributes: ["customer_active_plan_id"],
                    limit: 1
                });
                customerActivePlan = customerActivePlan.Items[0].attrs;

                await UserPlanTypeHelper.createUserPlanType({
                    user_plan_history_id: await global_helper.createUuID(),
                    member_id: userId,
                    customer_active_plan_id: customerActivePlan.customer_active_plan_id,
                    package_group_id: packageGroupId,
                    plan_start: moment(new Date(data.plan_start)).format("YYYY-MM-DD"),
                    plan_end: moment(new Date(data.plan_start)).add(1, "years").format("YYYY-MM-DD"),
                    duration: "12 months",
                    fixed: 1,
                    type: "started",
                    created_at: created_at,
                    updated_at: updated_at
                });
            }
            else
            {
                await UserPlanHistoryHelper.createUserPlanHistory({
                    user_plan_history_id: await global_helper.createUuID(),
                    member_id: userId,
                    customer_active_plan_id: customerActivePlan.customer_active_plan_id,
                    package_group_id: packageGroupId,
                    plan_start: moment(new Date(data.plan_start)).format("YYYY-MM-DD"),
                    plan_end: moment(new Date(data.plan_start)).add(1, "years").format("YYYY-MM-DD"),
                    duration: "12 months",
                    fixed: 1,
                    type: "started",
                    created_at: created_at,
                    updated_at: updated_at
                }, res);
            }

            wallet = await awsDynamoDB.getItemPartition({
                table: "medi_member_wallet",
                indexValue: userId,
                limit: 1
            });
            wallet = wallet.Items[0].attrs;

            await awsDynamoDB.insertItem({
                table: "medi_member_wallet_history",
                data: {
                    wallet_history_id: await global_helper.createUuID(),
                    member_wallet_id: wallet.member_wallet_id,
                    credit: 0,
                    running_balance: 0,
                    type: "wallet_created",
                    employee_id: userId,
                    customer_active_plan_id: activePlan.customer_active_plan_id,
                    wallet_type: "medical",
                    spend: 0,
                    created_at: created_at,
                    updated_at: updated_at
                }
            }, res);

            await awsDynamoDB.insertItem({
                table: "medi_member_wallet_history",
                data: {
                    wallet_history_id: await global_helper.createUuID(),
                    member_wallet_id: wallet.member_wallet_id,
                    credit: 0,
                    running_balance: 0,
                    type: "wallet_created",
                    employee_id: userId,
                    customer_active_plan_id: activePlan.customer_active_plan_id,
                    wallet_type: "wellness",
                    spend: 0,
                    created_at: created_at,
                    updated_at: updated_at
                }
            }, res);

            if(medical > 0 && customer.medical_balance >= medical)
            {
                let resultCustomerActivePlan = await companyController.allocateCreditBaseInActivePlan(id, medical, "medical", res);
            
                customerActivePlanId = null;
                if(resultCustomerActivePlan)
                {
                    customerActivePlanId = resultCustomerActivePlan;
                }
                
                wallet = await awsDynamoDB.getItemPartition({
                    table: "medi_member_wallet",
                    secondaryIndex: true,
                    indexName: "MemberIdIndex",
                    indexValue: userId,
                    limit: 1
                });
                wallet = wallet.Items[0].attrs;

                let updateWallet = await WalletHelper.addCredits(userId, medical, "medical", res);
                
                await awsDynamoDB.insertItem({
                    table: "medi_member_wallet_history",
                    data: {
                        wallet_history_id: await global_helper.createUuID(),
                        member_wallet_id: wallet.member_wallet_id,
                        credit: medical,
                        running_balance: medical,
                        type: "added_by_hr",
                        employee_id: userId,
                        customer_active_plan_id: customerActivePlanId,
                        wallet_type: "medical",
                        spend: 0,
                        created_at: created_at,
                        updated_at: updated_at
                    }
                }, res);
                
                let customerCreditsResult = await CustomerCreditsHelper.deductCustomerCredits(customer.customer_wallet_id, medical, "medical", res);
            
                if(!customerCreditsResult)
                {
                    await CustomerCreditsLogsHelper.createCustomerCreditLogs({
                        customer_wallet_history_id: await global_helper.createUuID(),
                        customer_wallet_id: customer.customer_wallet_id,
                        customer_id: id,
                        credit: medical,
                        running_balance: customer.medical_balance - medical,
                        type: "added_employee_credits",
                        employee_id: userId,
                        customer_active_plan_id: customerActivePlanId,
                        wallet_type: "medical",
                        currency_type: "SGD",
                        currency_value: 0,
                        created_at: updated_at,
                        updated_at: created_at
                    });
                }
            }

            if(wellness > 0 && customer.wellness_balance >= wellness)
            {
                let resultCustomerActivePlan = await companyController.allocateCreditBaseInActivePlan(id, wellness, "wellness", res);
            
                customerActivePlanId = null;
                if(resultCustomerActivePlan)
                {
                    customerActivePlanId = resultCustomerActivePlan;
                }
                
                wallet = await awsDynamoDB.getItemPartition({
                    table: "medi_member_wallet",
                    secondaryIndex: true,
                    indexName: "MemberIdIndex",
                    indexValue: userId,
                    limit: 1
                });
                wallet = wallet.Items[0].attrs;

                let updateWallet = await WalletHelper.addCredits(userId, wellness, "wellness", res);
                
                await awsDynamoDB.insertItem({
                    table: "medi_member_wallet_history",
                    data: {
                        wallet_history_id: await global_helper.createUuID(),
                        member_wallet_id: wallet.member_wallet_id,
                        credit: wellness,
                        running_balance: wellness,
                        type: "added_by_hr",
                        employee_id: userId,
                        customer_active_plan_id: customerActivePlanId,
                        wallet_type: "wellness",
                        spend: 0,
                        created_at: created_at,
                        updated_at: updated_at
                    }
                }, res);
                
                let customerCreditsResult = await CustomerCreditsHelper.deductCustomerCredits(customer.customer_wallet_id, wellness, "wellness", res);
            
                if(!customerCreditsResult)
                {
                    await CustomerCreditsLogsHelper.createCustomerCreditLogs({
                        customer_wallet_history_id: await global_helper.createUuID(),
                        customer_wallet_id: customer.customer_wallet_id,
                        customer_id: id,
                        credit: wellness,
                        running_balance: customer.wellness_balance - wellness,
                        type: "added_employee_credits",
                        employee_id: userId,
                        customer_active_plan_id: customerActivePlanId,
                        wallet_type: "wellness",
                        currency_type: "SGD",
                        currency_value: 0,
                        created_at: updated_at,
                        updated_at: created_at
                    });
                }
            }

            if(schedule)
            {
                let replaceEmployee = await awsDynamoDB.getItemEqual({
                    table: "medi_customer_replace_employee",
                    conditions: {
                        "member_id": replaceId
                    },
                    limit: 1
                });
                replaceEmployee = replaceEmployee.Items[0].attrs;

                let replaceData = {
                    customer_replace_employee_id: replaceEmployee.customer_replace_employee_id, 
                    new_member_id:  userId,
                    status: 1,
                    replace_status: 1
                }

                await awsDynamoDB.updateDataEq({
                    table: "medi_customer_replace_employee",
                    data: replaceData
                }, res);
            }
            else
            {
                let status = 0;

                if(deactiveEmployeeStatus == 1)
                {
                    status = 1;
                    await removeDependentAccountsReplace(replaceId, moment(new Date(data.last_day_coverage)).format("YYYY-MM-DD"));
                }

                await awsDynamoDB.insertItem({
                    table: "medi_customer_replace_employee",
                    data: {
                        customer_replace_employee_id: await global_helper.createUuID(),
                        member_id: replaceId,
                        new_member_id: userId,
                        active_plan_id: userPlanHistory.customer_active_plan_id,
                        expired_and_activate: moment(new Date(data.last_day_coverage)),
                        start_date: moment(new Date(data.plan_start)),
                        first_name: data.first_name,
                        last_name: data.last_name,
                        nric: data.nric,
                        email: data.email,
                        dob: data.dob,
                        mobile: data.mobile,
                        postal_code: data.postal_code,
                        deactive_employee_status: deactiveEmployeeStatus,
                        status: 1,
                        medical: medical,
                        wellness: wellness,
                        replace_status: 1,
                        created_at: created_at,
                        updated_at: updated_at
                    }
                }, res);
            }

            let memberContainer = await awsDynamoDB.getItemPartition({
                table: "medi_members",
                indexValue: userId,
                limit: 1
            },res);

            let companyContainer = await awsDynamoDB.getItemEqual({
                table: "medi_customer_business_information",
                conditions: {
                    customer_id: id
                },
                limit: 1
            });
            companyContainer = companyContainer.Items[0].attrs;
            // $user = DB::table('user')->where('UserID', $user_id)->first();
            //     $company = DB::table('corporate')->where('corporate_id', $corporate->corporate_id)->first();
                
            if(memberContainer.Count > 0)
            {
                memberContainer = memberContainer.Items[0].attrs;
                if(memberContainer.communication_type == "sms")
                {
                    let compose = new Object();
                    compose['name'] = memberContainer.fullname;
                    compose['company'] = companyContainer.company_name;
                    compose['plan_start'] = moment(new Date(data.plan_start)).format("MM DD, YYYY");
                    compose['email'] = memberContainer.email;
                    compose['nric'] = memberContainer.nric;
                    compose['password'] = password;
                    compose['phone'] = memberContainer.phone_no;

                    compose['message'] = await SmsHelper.formatWelcomeEmployeeMessage(compose);
                    let resultSms = await SmsHelper.sendSms(compose);
                }
                else
                {
                    if(data.email)
                    {
                        let emailData = new Object();
                        emailData['company']   = companyContainer.company_name;
                        emailData['emailName'] = data['first_name'] + ' ' + data['last_name'];
                        emailData['name'] = data['first_name'] + ' ' + data['last_name'];
                        emailData['emailTo']   = data['email'];
                        emailData['email']   = data['email'];
                        emailData['emailPage'] = 'email-templates.latest-templates.mednefits-welcome-member-enrolled';
                        emailData['emailSubject'] = 'WELCOME TO MEDNEFITS CARE';
                        emailData['start_date'] = moment(new Date(data.plan_start)).format("MM DD, YYYY");
                        emailData['pw'] = password;
                        emailData['url'] = url('/');
                        emailData['plan'] = activePlan;
                        await EmailHelper.sendEmail(emailData);
                    }
                    else
                    {
                        let compose = new Object();
                        compose['name'] = memberContainer.fullname;
                        compose['company'] = companyContainer.company_name;
                        compose['plan_start'] = moment(new Date(data.plan_start)).format("MM DD, YYYY");
                        compose['email'] = memberContainer.email;
                        compose['nric'] = memberContainer.nric;
                        compose['password'] = password;
                        compose['phone'] = memberContainer.phone_no;

                        compose['message'] = await SmsHelper.formatWelcomeEmployeeMessage(compose);
                        let resultSms = SmsHelper.sendSms(compose);
                    }
                }
            }
            
        }
        else
        {
            return res.json({
                status: false, 
                message: 'Failed to replace employee.'
            });
        }

        status = 0;

        if(deactiveEmployeeStatus == 1)
        {
            status = 1;
            await PlanHelper.removeDependentAccountsReplace(replaceId, moment(new Date(data.last_day_coverage)).format("YYYY-MM-DD"))
        }

        result = await awsDynamoDB.insertItem({
            table: "medi_customer_replace_employee",
            data: {
                customer_replace_employee_id: await global_helper.createUuID(),
                member_id: replaceId,
                new_member_id: userId,
                active_plan_id: userPlanHistory.customer_active_plan_id,
                expired_and_activate: moment(new Date(data.last_day_coverage)),
                start_date: moment(new Date(data.plan_start)),
                first_name: data.first_name,
                last_name: data.last_name,
                nric: data.nric,
                email: data.email,
                dob: data.dob,
                mobile: data.mobile,
                postal_code: data.postal_code,
                deactive_employee_status: deactiveEmployeeStatus,
                status: 1,
                medical: medical,
                wellness: wellness,
                replace_status: 1,
                created_at: created_at,
                updated_at: updated_at
            }
        }, res);

        return res.json({
            status: true,
            message: 'Old Employee will be deactivated by '+ moment(new Date(data.last_day_coverage)).format("DD MM, YYYY") +' and new employee will be activated by ' + moment(new Date(data.plan_start)).format("DD MM, YYYY")
        });
    }
}

const getEmployeeSpendingAccountSummary = async (req, res, next) => 
{
		// $input = Input::all();
        // $customer_id = PlanHelper::getCusomerIdToken();
        let data = req.body;
        let customerId = data.customer_id;

        if(data.employee_id == "")
        {
            return res.json({
                status: false,
                message: "Employee ID is required."
            })
        }

        let checkEmployee = await companyModel.getItemEqual({
            table: "medi_members",
            conditions: [
                {
                    whereField: "member_id",
                    whereValue: data.employee_id
                },
                {
                    whereField: "member_type",
                    whereValue: 5
                }
            ]
        });

        if(checkEmployee.Count <= 0)
        {
            return res.json({
                status: false,
                message: "Employee does not exist."
            })
        }
        checkEmployee = checkEmployee.Items[0].attrs;

        let coverage = await PlanHelper.getEmployeePlanCoverageDate(data.employee_id, customerId, res);
        let lastDayOfCoverage = moment(new Date(data.last_date_of_coverage)).endOf('day');
        let ids = await StringHelper.getSubAccountsID(checkEmployee.member_id);

		// $coverage = PlanHelper::getEmployeePlanCoverageDate($input['employee_id'], $customer_id);
		// $last_day_coverage = PlanHelper::endDate($input['last_date_of_coverage']);
		// $ids = StringHelper::getSubAccountsID($check_employee->UserID);

        let wallet = await companyModel.getItemEqual({
            table: "medi_member_wallet",
            conditions: [
                {
                    whereField: "member_id",
                    whereValue: checkEmployee.member_id
                }
            ],
            descending: true,
            limit: 1
        });
        wallet = wallet.Items[0].attrs;

        let startDate = moment(new Date(coverage.plan_start)).format("YYYY-MM-DD");
        let endDate = moment(new Date(coverage.plan_end)).format("YYYY-MM-DD");
        let diff = moment(new Date(endDate)).diff(moment(new Date(startDate)), "days");
        let planDuration = diff + 1;
        let coverageEnd = moment(new Date(lastDayOfCoverage))
        let coverageDiff = moment(new Date(coverageEnd)).diff(moment(new Date(startDate)),"days") + 1

        let employeeCreditResetMedical = companyModel.getItemEqual({
            table: "medi_wallet_resets",
            conditions: [
                {
                    whereField: "id",
                    whereValue: checkEmployee.member_id
                },
                {
                    whereField: "spending_type",
                    whereValue: "medical"
                },
                {
                    whereField: "user_type",
                    whereValue: "employee"
                }
            ],
            descending: true,
            limit: 1
        });

        let minimumDateMedical = null;
        if(employeeCreditResetMedical.Count > 0)
        {
            employeeCreditResetMedical = employeeCreditResetMedical.Items[0].attrs;
            minimumDateMedical = moment(new Date(employeeCreditResetMedical.date_resetted)).format("YYYY-MM-DD");
        }
        else
        {
            minimumDateMedical = await companyModel.getItemEqual({
                table: "medi_member_wallet_history",
                conditions: {
                    whereField: "member_wallet_id",
                    whereValue: wallet.member_wallet_id
                },
                limit: 1
            });

            if(minimumDateMedical.Count <= 0)
            {
                minimumDateMedical = wallet.created_at;
            }
            else
            {
                minimumDateMedical = minimumDateMedical.Items[0].attrs.created_at;
            }
        }

        let planEndDate = moment(coverage.plan_end).endOf('day');

        let totalAllocationMedicalTemp = 0;
        let totalAllocationMedicalDeducted = 0;
        let totalAllocationMedicalCreditsBack = 0;
        let totalAllocationMedical = 0;
        let totalMedicalEClaimSpend = 0;
        let totalMedicalInNetworkSpent = 0;
        let totalMedicalSpentTemp = 0;
        let totalMedicalSpent = 0;
        let hasMedicalAllocation = 0;
        
        let medicalWalletHistory = await companyModel.getItemEqual({
            table: "medi_member_wallet_history",
            conditions: [
                {
                    whereField: "member_wallet_id",
                    whereValue: wallet.member_wallet_id
                },
                {
                    whereField: "wallet_type",
                    whereValue: "medical"
                },
                {
                    between: 
                    {
                        whereField: "created_at",
                        whereValue1: moment(new Date(minimumDateMedical)).format("z"),
                        whereValue2: moment(new Date(planEndDate)).format("z")
                    }
                }
            ]
        });

        let pendingEClaimMedical = await companyModel.getItemEqual({
            table: "medi_out_of_network",
            conditions: [
                {
                    in: {
                        whereField: "member_id",
                        whereValue: ids
                    }
                },
                {
                    whereField: "spending_type",
                    whereValue: "medical"
                },
                {
                    whereField: "status_date",
                    whereValue: 0
                }
            ],
            attributes: ['claim_amount']
        });

        if(pendingEClaimMedical.Count > 0)
        {
            let profit = _.sumBy(pendingEClaimMedical.Items, function (item) {
 
                return item.claim_amount;
         
            });
            pendingEClaimMedical = profit
        }

        let usageDate = moment(new Date()).format("YYYY-MM-DD");

        let proAllocationMedicalDate = await companyModel.getItemEqual({
            table: "medi_member_wallet_history",
            conditions: [
                {
                    whereField: "member_wallet_id",
                    whereValue: wallet.member_wallet_id
                },
                {
                    whereField: "type",
                    whereValue: "pro_allocation"
                },
                {
                    whereField: "wallet_type",
                    whereValue: "medical"
                }
            ],
            descending: true,
            limit: 1
        });
        
        if(proAllocationMedicalDate.Count > 0)
        {
            proAllocationMedicalDate = proAllocationMedicalDate.Items[0].attrs;
            usageDate = moment(new Date(proAllocationMedicalDate.created_at)).format("YYYY-MM-DD");
        }
        else
        {
            let proAllocationWellnessDate = await companyModel.getItemEqual({
                table: "medi_member_wallet_history",
                conditions: [
                    {
                        whereField: "member_wallet_id",
                        whereValue: wallet.member_wallet_id
                    },
                    {
                        whereField: "type",
                        whereValue: "pro_allocation"
                    },
                    {
                        whereField: "wallet_type",
                        whereValue: "wellness"
                    }
                ],
                descending: true,
                attributes: ["created_at"],
                limit: 1
            });

            if(proAllocationWellnessDate.Count > 0)
            {
                proAllocationWellnessDate = proAllocationWellnessDate.Items[0].attrs;
                usageDate = moment(new Date(proAllocationWellnessDate.created_at)).format("YYYY-MM-DD")
            }
        }

        await map(medicalWalletHistory, async medicalWallElement => {
            medicalWallElement = medicalWallElement.attrs;

            if(medicalWallElement.type == "added_by_hr")
            {
                totalAllocationMedicalTemp = totalAllocationMedicalTemp + parseFloat(medicalWallElement.credit);
            }

            if(medicalWallElement.type == "deducted_by_hr" && parseInt(medicalWallElement.from_pro_allocation) == 0)
            {
                totalMedicalEClaimSpend = totalMedicalEClaimSpend + parseFloat(medicalWallElement.credit);
            }

            if(medicalWallElement.spend == "in_network_transaction")
            {
                totalMedicalInNetworkSpent = totalMedicalInNetworkSpent + parseFloat(medicalWallElement.credit);
            }

            if(medicalWallElement.spend == "credits_back_from_in_network")
            {
                totalAllocationMedicalCreditsBack = totalAllocationMedicalCreditsBack + parseFloat(medicalWallElement.credit);
            }

        });

        totalAllocationMedicalTemp = totalAllocationMedicalTemp - totalAllocationMedicalDeducted;
        totalAllocationMedical = totalAllocationMedicalTemp;
        totalMedicalSpentTemp = totalMedicalInNetworkSpent +  totalMedicalEClaimSpend;
        totalMedicalSpent = totalMedicalSpentTemp - totalAllocationMedicalCreditsBack;
        hasMedicalAllocation = false;

        let proTemp = coverageDiff / planDuration;

        let totalCurrentUsage = totalMedicalSpent + pendingEClaimMedical;
        let totalProMedicalAllocation = proTemp * totalAllocationMedical;
        let minimumDateWellness = null;

        if(totalAllocationMedical > 0)
        {
            hasMedicalAllocation = true;
        }

        let exceed = false;

        if(totalCurrentUsage > totalProMedicalAllocation)
        {
            exceed = true;
        }

        let medicalBalance = totalProMedicalAllocation - totalMedicalSpent;
        medicalBalance = (medicalBalance < 0) ? 0 : medicalBalance;
        
        let medical = {
            status: true,
            initial_allocation: totalAllocationMedical,
            pro_allocation: totalProMedicalAllocation,
            current_usage: totalCurrentUsage,
            pending_e_claim: pendingEClaimMedical,
            spent: totalMedicalSpent,
            exceed: exceed,
            exceeded_by: totalMedicalSpent - totalProMedicalAllocation,
            balance: medicalBalance
        }

        let employeeCreditResetWellness = await companyModel.getItemEqual({
            table: "medi_wallet_resets",
            conditions: [
                {
                    whereField: "id",
                    whereValue: checkEmployee.member_id
                },
                {
                    whereField: "spending_type",
                    whereValue: "wellness"
                },
                {
                    whereField: "user_type",
                    whereValue: "employee"
                }
            ],
            descending: true,
            limit: 1
        });

        if(employeeCreditResetWellness.Count > 0)
        {
            minimumDateWellness = moment(new Date(employeeCreditResetWellness.date_resetted)).format("YYYY-MM-DD");
        }
        else
        {
            minimumDateWellness = await companyModel.getItemEqual({
                table: "medi_member_wallet_history",
                conditions: [
                    {
                        whereField: "member_id",
                        whereValue: wallet.member_wallet_id
                    },
                    {
                        whereField: "wallet_type",
                        whereValue: "wellness"
                    }
                ],
                limit: 1
            });

            if(minimumDateWellness.Count <= 0)
            {
                minimumDateWellness = wallet.created_at;
            }
        }

        let totalAllocationWellnessTemp = 0;
        let totalAllocationWellnessDeducted = 0;
        let totalAllocationWellnessCreditsBack = 0;
        let totalWellnessEClaimSpentWellness = 0;
        let totalWellnessInNetworkSpent = 0;
        let hasWellnessAllocation = false;

        let totalAllocationWellness = 0;
        let totalWellnessSpentTemp = 0;
        let totalWellnessSpent = 0;

        let exceedWellness = false;
        let totalCurrentUsageWellness = 0;
        let totalProWellnessAllocation = 0;
        
        let wellnessWalletHistory = await companyModel.getItemEqual({
            table: "medi_member_wallet_history",
            conditions: [
                {
                    whereField: "member_wallet_id",
                    whereValue: wallet.member_wallet_id
                },
                {
                    whereField: "wallet_type",
                    whereValue: "wellness"
                },
                {
                    between: 
                    {
                        whereField: "created_at",
                        whereValue1: moment(new Date(minimumDateMedical)).format("z"),
                        whereValue2: moment(new Date(planEndDate)).format("z")
                    }
                }
            ]
        });

        let pendingEClaimWellness = await companyModel.getItemEqual({
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
                        whereValue: ["wellness"]
                    }
                },
                {
                    whereField: "claim_status",
                    whereValue: 0
                }
            ]
        }, res)

        let pendingEClaimWellnessAmount = 0;

        if(pendingEClaimWellness.Count > 0)
        {
            pendingEClaimWellnessAmount = _.sumBy(pendingEClaimWellness.Items, function (item) {
                return pendingEClaimWellness.attrs.claim_amount
            });
        }

        if(wellnessWalletHistory.Count > 0)
        {
            await map(wellnessWalletHistory, async wellnessWalletElement => {
                wellnessWalletElement = wellnessWalletElement.attrs;

                if(wellnessWalletElement.type == "added_by_hr")
                {
                    totalAllocationWellnessTemp = totalAllocationWellnessTemp + parseFloat(wellnessWalletElement.credit);
                }

                if(wellnessWalletElement.type == "deducted_by_hr" && parseInt(wellnessWalletElement.from_pro_allocation) == 0)
                {
                    totalWellnessEClaimSpend = totalWellnessEClaimSpend + parseFloat(wellnessWalletElement.credit);
                }

                if(wellnessWalletElement.spend == "in_network_transaction")
                {
                    totalWellnessInNetworkSpent = totalWellnessInNetworkSpent + parseFloat(wellnessWalletElement.credit);
                }

                if(wellnessWalletElement.spend == "credits_back_from_in_network")
                {
                    totalAllocationWellnessCreditsBack = totalAllocationWellnessCreditsBack + parseFloat(wellnessWalletElement.credit);
                }

            });
        }

        totalAllocationWellness = totalAllocationWellnessTemp - totalAllocationWellnessDeducted;
        totalWellnessSpentTemp = totalWellnessInNetworkSpent - totalWellnessEClaimSpentWellness;
        totalWellnessSpent = totalWellnessSpentTemp - totalAllocationWellnessCreditsBack;

        exceedWellness = false;
        totalCurrentUsageWellness = totalWellnessInNetworkSpent + totalWellnessEClaimSpentWellness + pendingEClaimWellness;
        totalProWellnessAllocation = proTemp * totalAllocationWellness;

        if(totalCurrentUsageWellness > totalProWellnessAllocation)
        {
            exceedWellness = true;
        }

        let wellnessBalance = totalProWellnessAllocation - totalAllocationWellness;

        if(wellnessBalance < 0)
        {
            hasWellnessAllocation = true;
        }
        
        let wellness = {
            status: true,
            initial_allocation:  totalAllocationWellness,
            pro_allocation: totalProWellnessAllocation,
            current_usage: totalCurrentUsageWellness,
            spent: totalWellnessSpent,
            pending_e_claim: pendingEClaimWellness,
            exceed: exceedWellness,
            exceeded_by: totalWellnessSpent - totalProWellnessAllocation,
            balance: wellnessBalance
        }

        let date = {
            pro_rated_start: moment(new Date(coverage.plan_start)).format("YYYY-MM-DD"),
            pro_rated_end: moment(new Date(lastDayOfCoverage)),
            usage_start: moment(new Date(coverage.plan_start)).format("YYYY-MM-DD"),
            usage_end: usageDate
        }
        
        if(hasMedicalAllocation)
        {
            if(typeof data.calibrate_medical != "undefined")
            {
                let calibrateMedical = data.calibrate_medical;
                let calibrateMedicalData = null;
                let calibrateMedicalDeductionParameter = null;

                if(calibrateMedical && totalAllocationMedical > 0)
                {
                    calibrateMedical = await companyModel.getItemEqual({
                        table: "medi_member_wallet_history",
                        conditions: [
                            {
                                whereField: "member_wallet_id",
                                whereValue: wallet.member_wallet_id
                            },
                            {
                                whereField: "wallet_type",
                                whereValue: "medical"
                            },
                            {
                                whereField: "type",
                                whereValue: "pro_allocation"
                            }
                        ],
                        limit: 1
                    });

                    if(calibrateMedical.Count > 0)
                    {
                        return res.json({
                            status: false,
                            message: "Medical Spending Account Pro Allocation is already updated."
                        })
                    }

                    let calibrateMedical = await companyModel.getItemEqual({
                        table: "medi_member_wallet_history",
                        conditions: [
                            {
                                whereField: "employee_id",
                                whereValue: data.employee_id
                            },
                            {
                                whereField: "wallet_type",
                                whereValue: "medical"
                            },
                            {
                                whereField: "type",
                                whereValue: "started"
                            }
                        ],
                        limit: 1
                    })
                    calibrateMedical = calibrateMedical.Items[0].attrs;

                    calibrateMedicalData = {
                        wallet_history_id: await global_helper.createUuID(),
                        member_wallet_id: wallet.member_wallet_id,
                        credit: totalProMedicalAllocation,
                        type: 'pro_allocation',
                        running_balance: totalProMedicalAllocation,
                        from_pro_allocation: 0,
                        wallet_type: 'medical',
                        employee_id: data.employee_id,
                        spend: "nil",
                        customer_active_plan_id: calibrateMedical.customer_active_plan_id,
                        created_at: created_at,
                        updated_at: updated_at
                    }

                    calibrateMedicalDeductionParameter = {
                        wallet_history_id: await global_helper.createUuID(),
                        member_wallet_id: wallet.member_wallet_id,
                        credit: totalAllocationMedical - totalProMedicalAllocation,
                        type: 'pro_allocation_deduction',
                        running_balance: totalAllocationMedical - totalProMedicalAllocation,
                        from_pro_allocation: 0,
                        wallet_type: 'medical',
                        employee_id: data.employee_id,
                        spend: "nil",
                        customer_active_plan_id:calibrateMedical.customer_active_plan_id,
                        created_at: created_at,
                        updated_at: updated_at
                    }

                    let newBalance = totalProMedicalAllocation - totalMedicalSpent;

                    if(newBalance < 0)
                    {
                        newBalance = 0;
                    }

                    await companyModel.insertItem({
                        table: "medi_member_wallet_history",
                        data: calibrateMedicalData
                    }, res)

                    await companyModel.insertItem({
                        table: "medi_member_wallet_history",
                        data: calibrateMedicalDeductionParameter
                    }, res)

                    await companyModel.updateDataEq({
                        table: "medi_member_wallet",
                        data: {
                            member_wallet_id: wallet.member_wallet_id,
                            medical_balance: newBalance
                        }
                    });
                }
            }
        }
        
        if(hasWellnessAllocation)
        {
            if(typeof data.calibrate_wellness != "undefined")
            {
                let calibrateWellness = data.calibrate_wellness;
                let calibrateWellnessData = null;
                let calibrateWellnessDeductionParameter = null;

                if(calibrateWellness && totalAllocationWellness > 0)
                {
                    calibrateWellness = await companyModel.getItemEqual({
                        table: "medi_member_wallet_history",
                        conditions: [
                            {
                                whereField: "member_wallet_id",
                                whereValue: wallet.member_wallet_id
                            },
                            {
                                whereField: "wallet_type",
                                whereValue: "wellness"
                            },
                            {
                                whereField: "type",
                                whereValue: "pro_allocation"
                            }
                        ],
                        limit: 1
                    });

                    if(calibrateWellness.Count > 0)
                    {
                        return res.json({
                            status: false,
                            message: "Wellness Spending Account Pro Allocation is already updated."
                        })
                    }

                    let calibrateWellness = await companyModel.getItemEqual({
                        table: "medi_member_wallet_history",
                        conditions: [
                            {
                                whereField: "employee_id",
                                whereValue: data.employee_id
                            },
                            {
                                whereField: "wallet_type",
                                whereValue: "wellness"
                            },
                            {
                                whereField: "type",
                                whereValue: "started"
                            }
                        ],
                        limit: 1
                    })
                    calibrateWellness = calibrateWellness.Items[0].attrs;

                    calibrateWellnessData = {
                        wallet_history_id: await global_helper.createUuID(),
                        member_wallet_id: wallet.member_wallet_id,
                        credit: totalProWellnessAllocation,
                        type: 'pro_allocation',
                        running_balance: totalProWellnessAllocation,
                        from_pro_allocation: 0,
                        wallet_type: 'wellness',
                        employee_id: data.employee_id,
                        spend: "nil",
                        customer_active_plan_id: calibrateWellness.customer_active_plan_id,
                        created_at: created_at,
                        updated_at: updated_at
                    }

                    calibrateWellnessDeductionParameter = {
                        wallet_history_id: await global_helper.createUuID(),
                        member_wallet_id: wallet.member_wallet_id,
                        credit: totalAllocationWellness - totalProWellnessAllocation,
                        type: 'pro_allocation_deduction',
                        running_balance: totalAllocationWellness - totalProWellnessAllocation,
                        from_pro_allocation: 0,
                        wallet_type: 'wellness',
                        employee_id: data.employee_id,
                        spend: "nil",
                        customer_active_plan_id:calibrateWellness.customer_active_plan_id,
                        created_at: created_at,
                        updated_at: updated_at
                    }

                    let newBalance = totalProWellnessAllocation - totalWellnessSpent;

                    if(newBalance < 0)
                    {
                        newBalance = 0;
                    }

                    await companyModel.insertItem({
                        table: "medi_member_wallet_history",
                        data: calibrateWellnessData
                    }, res)

                    await companyModel.insertItem({
                        table: "medi_member_wallet_history",
                        data: calibrateWellnessDeductionParameter
                    }, res)

                    await companyModel.updateDataEq({
                        table: "medi_member_wallet",
                        data: {
                            member_wallet_id: wallet.member_wallet_id,
                            wellness_balance: newBalance
                        }
                    });
                }
            }
        }

        if(hasMedicalAllocation || hasWellnessAllocation)
        {
            if(data.calibrate_welless || data.calibrate_medical)
            {
                await PlanHelper.reCalculateCompanyBalance(req, res, next);
                return res.json({
                    status: true,
                    message: "Spending Account successfully updated to Pro Allocation credits."
                })
            }
        }

        return res.json({
            status: true,
            medical: medical,
            wellness: wellness,
            date: date
        });
}

const updateCapPerVisitEmployee = async (req, res, next) =>
{
    let data = req.body;
    delete req.body.customer_id;
    delete req.body.admin_id;
    isValid = await validate.joiValidate(req.body, validate.validateCapUpdate, true)

    if(typeof isValid != 'boolean')
    {
        return res.status(400).json({
            status: false,
            message: isValid.details[0].message
        })
    }

    let { created_at, updated_at } = await global_helper.createDate();
    let walletContainer = await companyModel.getOne('medi_member_wallet', { member_id: parseInt(data.member_id) })

    if(!walletContainer) {
        return res.status(400).json({ status: false, message: 'Member does not have a wallet data.' });
    }

    let result = await companyModel.updateOne('medi_member_wallet', { _id: walletContainer._id }, { cap_amount: data.cap_amount })

    if(!result) {
        return res.status(400).json({ status: false, message: 'Unable to update cap per visit amount' });
    }
    console.log('data', data)
    if(data.admin_id)
    {
        SystemLogLibrary.createAdminLog({
            admin_id: data.admin_id,
            admin_type: "mednefits",
            type: "admin_updated_member_cap_per_visit",
            data: data,
            created_at: created_at,
            updated_at: updated_at
        })
    }
    else
    {
        SystemLogLibrary.createAdminLog({
            admin_id: data.customer_id,
            admin_type: "hr",
            type: "admin_updated_member_cap_per_visit",
            data: data,
            created_at: created_at,
            updated_at: updated_at
        })
    }

    return res.json({
        status: true,
        message: "Cap updated."
    });
}

const confirmPassword = async (req, res, next) =>
{
    let data = req.body;
    if(!data.password) {
        return res.status(400).json({ status: false, message: 'Password is required.' })
    }

    let customerID = parseInt(data.customer_id);
    let password = data.password;

    let check = await companyModel.getOne('medi_customer_hr_accounts', { customer_id: customerID, password: sha256(password) })

    if(check) {
        return res.json({
            status: true,
            message: 'Valid Password'
        })
    }

    return res.status(400).json({
        status: false,
        message: 'Invalid Password.'
    })
}

module.exports = {
    createDependentAccount,
    enrollmentProgress,
    getHRSession,
    getDependentStatus,
    checkPlan,
    getPlanStatus,
    getTotalMembers,
    companyAllocation,
    employeeLists,
    carePlanJson,
    searchEmployee,
    getEmployeeDependents,
    checkEmployeePlanRefundType,
    updateEmployeeDetails,
    updateDependentDetails,
    createEmployeeReplacementSeat,
    withDrawEmployees,
    replaceEmployee,
    getEmployeeSpendingAccountSummary,
    updateCapPerVisitEmployee,
    confirmPassword
}
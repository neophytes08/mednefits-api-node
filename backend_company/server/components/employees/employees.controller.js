require('express-async-errors');
require('dotenv').config();
const APPPATH = require('app-root-path');
const PlanHelper = require(`${APPPATH}/server/helpers/plan.helper.js`);
const SpendingInvoiceLibrary = require(`${APPPATH}/server/helpers/spendingInvoice.helper.js`);
// const config = require(`${APPPATH}/config/config`);
// const sha256 = require('sha256');
const moment = require('moment');
const { map } = require('p-iteration');
const format=require('format-number');
// const ucfirst = require('ucfirst');
const ucwords=require('ucwords');
const companyModel = require('./company.model');

const overviewEnrollmentProgress = (req, res, next) => {

    let data = req.body;
    let customerID = data.customer_id;

    let plan = await employeeModel.aggregate("medi_customer_plans", [
        {$match: {customer_id: customerID}},
        {$sort:{created_at: -1}},
        {$limit:1}
    ]);

    let activePlan = await employeeModel.getMany("medi_customer_active_plans", {customer_plan_id: plan.customer_plan_id});
    let customer = await employeeModel.getOne("medi_customer_purchase", {customer_id: customerID});
    let planStatus = await employeeModel.getOne("medi_customer_plan_status", {customer_plan_id: plan.customer_plan_id});

    let inProgress = parseFloat(planStatus.employee_head_count) - parseFloat(planStatus.employee_enrolled_count);
    let endPlan = moment(new Date(plan.plan_start)).format("YYYY-MM-DD");

    return res.json({
        status: TRUE,
        data: {
            in_progress: inProgress,
            completed: planStatus.enrolled_employees,
            active_plans: activePlan,
            total_employees: planStatus.employees_input,
            plan_end_date: endPlan,
            // added_purchase_status: $added_purchase_status,
            account_type: customer.account_type
        }
    });
}

const employeeLists = (req, res, next) => {

    let data = req.body;
    let limit = parseInt(data.limit);
    let page = parseInt(data.page);
    let skip = (page * limit) - limit;

    let users = await companyModel.aggregation("medi_members", [
        {   $lookup:{
                from: "medi_company_members",
                localField : "member_id",
                foreignField : "member_id",
                as : "medi_company_members"
            },
        },
        {   $unwind: "$medi_company_members" },
        {   $match: { $and: [
                    {"medi_company_members.deleted": 0},
                    {"medi_company_members.customer_id": customerID}
                ] }
        },
        { "$limit": skip + limit },
        { "$skip": skip },
        {   $project: {
                fullname: "$medi_members.fullname",
                email: "$medi_members.email",
                nric: "$medi_members.nric",
                phone_no: "$medi_members.phone_no",
                job_title: "$medi_members.job_title",
                dob: "$medi_members.dob",
                created_at: "$medi_members.created_at",
                company_name: "$medi_company_members.company_name",
                deleted: "$medi_company_members.deleted",
                zip_code: "$medi_members.zip_code",
                bank_account: "$medi_members.bank_account"
            }
        }
    ]);

    // $result = self::checkSession();
    // $account_link = DB::table('customer_link_customer_buy')->where('customer_buy_start_id', $result->customer_buy_start_id)->first();
    // $final_user = [];
    // $paginate = [];

    // $users = DB::table('user')
    // ->join('corporate_members', 'corporate_members.user_id', '=', 'user.UserID')
    // ->join('corporate', 'corporate.corporate_id', '=', 'corporate_members.corporate_id')
    // ->where('corporate.corporate_id', $account_link->corporate_id)
    // ->where('corporate_members.removed_status', 0)
    // ->select('user.UserID', 'user.Name', 'user.Email', 'user.NRIC', 'user.PhoneNo', 'user.Job_Title', 'user.DOB', 'user.created_at', 'corporate.company_name', 'corporate_members.removed_status', 'user.Zip_Code', 'user.bank_account')
    // ->paginate($per_page);


    // $paginate['last_page'] = $users->getLastPage();
    // $paginate['current_page'] = $users->getCurrentPage();
    // $paginate['total_data'] = $users->getTotal();
    // $paginate['from'] = $users->getFrom();
    // $paginate['to'] = $users->getTo();
    // $paginate['count'] = $users->count();
    let ids = null;
    let wallet = null;
    let medicalCreditData = null;
    let wellnessCreditData = null;
    let deletion = null;
    let dependents = null;
    let planTier = null;
    let getEmployeePlan = null;
    let replace = null;
    let activePlan = null;
    let planName = "";
    let expiryDate = null;

    await map(users, user => {
        ids = await StringHelper.getSubAccountsID(user.member_id);
        wallet = await employeeModel.aggregate("medi_member_wallet", [
            {$match: {member_id: memberID}},
            {$sort:{created_at: -1}},
            {$limit:1}
        ]);

        medicalCreditData = PlanHelper.memberMedicalAllocatedCredits(wallet.member_wallet_id, user.member_id);
        wellnessCreditData = PlanHelper.memberWellnessAllocatedCredits(wallet.member_wallet_id, user.member_id);

        deletion = await mongoose.fetchOne("medi_customer_employee_plan_refund_details", {member_id: user.member_id});
        dependents = await mongoose.countCollection("medi_member_covered_dependents", {owner_id: memberID, deleted: 0});

        planTier = await employeeModel.aggregate("medi_customer_plan_tier_users", [
            {
                $lookup:{
                    from: "medi_customer_plan_tiers",
                    localField : "plan_tier_id",
                    foreignField : "plan_tier_id",
                    as : "medi_customer_plan_tiers"
                },
            },
            { $unwind: "$medi_customer_plan_tiers" },
            {
                $match: { $and: [
                        {owner_id: user.member_id},
                        {deleted: 0}
                ] }
            }
        ]);

        getEmployeePlan = await employeeModel.aggregate("medi_member_plan_history", [
            {
                $match: { member_id: memberID }
            },
            {$sort:{created_at: -1}},
            {$limit:1}
        ]);
        getEmployeePlan = getEmployeePlan[0]

        replace = await employeeModel.aggregate("customer_replace_employee", [
            {
                $match: {
                    $and: [
                        {old_id: user.member_id},
                        {active_plan_id: getEmployeePlan.customer_active_plan_id}
                    ]
                }
            },
            {$sort:{created_at: -1}},
            {$limit:1}
        ]);
        replace = replace[0];

        activePlan = await employeeModel.getOne("medi_customer_active_plans", {customer_active_plan_id: getEmployeePlan.customer_active_plan_id});

        if(activePlan.account_type == "stand_alone_plan")
        {
            planName = "Pro Plan";
        }
        else if(activePlan.account_type == "insurance_bundle")
        {
            planName = "Insurance Bundle";
        }
        else if(activePlan.account_type == "trial_plan")
        {
            planName = "Trial Plan";
        }
        else if(activePlan.account_type == "lite_plan")
        {
            planName = "Lite Plan";
        }

        if((Object.keys(replace || {})).length > 0)
        {
            expiryDate = moment(new Date(replace.expired_and_activate)).format("YYYY-MM-DD");
        }
        else
        {
            let planUserHistory = await employeeModel.aggregate("medi_member_plan_history",[
                {
                    $match: {
                        $and:[
                            {member_id: user.member_id},
                            {type: 'started'}
                        ]
                    }
                },
                {$sort:{created_at: -1}},
                {$limit:1}
            ]);
            planUserHistory = planUserHistory[0];

            if((Object.keys(planUserHistory || {})).length > 0)
            {
                await PlanHelper.createUserPlanHistory(user.member_id, customerID);

                //         if(!$plan_user_history) {
                //             // create plan user history
                //             PlanHelper::createUserPlanHistory($user->UserID, $link_account->customer_buy_start_id, $customer_id);
                //             $plan_user_history = DB::table('user_plan_history')
                //             ->where('user_id', $user->UserID)
                //             ->where('type', 'started')
                //             ->orderBy('created_at', 'desc')
                //             ->first();
                //         }
            }

        }

    });


    //     if($replace) {
    //         $expiry_date = date('Y-m-d', strtotime($replace->expired_and_activate));
    //     } else {
    //         $plan_user_history = DB::table('user_plan_history')
    //         ->where('user_id', $user->UserID)
    //         ->where('type', 'started')
    //         ->orderBy('created_at', 'desc')
    //         ->first();

    //         if(!$plan_user_history) {
    //             // create plan user history
    //             PlanHelper::createUserPlanHistory($user->UserID, $link_account->customer_buy_start_id, $customer_id);
    //             $plan_user_history = DB::table('user_plan_history')
    //             ->where('user_id', $user->UserID)
    //             ->where('type', 'started')
    //             ->orderBy('created_at', 'desc')
    //             ->first();
    //         }

    //         $active_plan = DB::table('customer_active_plan')
    //         ->where('customer_active_plan_id', $plan_user_history->customer_active_plan_id)
    //         ->first();

    //         $plan = DB::table('customer_plan')
    //         ->where('customer_plan_id', $active_plan->plan_id)
    //         ->orderBy('created_at', 'desc')
    //         ->first();

    //         $active_plan_first = DB::table('customer_active_plan')
    //         ->where('plan_id', $active_plan->plan_id)
    //         ->first();

    //         if((int)$active_plan_first->plan_extention_enable == 1) {
    //             $plan_user = DB::table('user_plan_type')
    //             ->where('user_id', $user->UserID)
    //             ->orderBy('created_at', 'desc')
    //             ->first();

    //             $active_plan_extension = DB::table('plan_extensions')
    //             ->where('customer_active_plan_id', $active_plan_first->customer_active_plan_id)
    //             ->first();

    //             if($plan_user->fixed == 1 || $plan_user->fixed == "1") {
    //                 $temp_valid_date = date('F d, Y', strtotime('+'.$active_plan_extension->duration, strtotime($active_plan_extension->plan_start)));
    //                 $expiry_date = date('F d, Y', strtotime('-1 day', strtotime($temp_valid_date)));
    //             } else if($plan_user->fixed == 0 | $plan_user->fixed == "0") {
    //                 $expiry_date = date('F d, Y', strtotime('+'.$plan_user->duration, strtotime($plan_user->plan_start)));
    //             }
    //         } else {
    //             $plan_user = DB::table('user_plan_type')
    //             ->where('user_id', $user->UserID)
    //             ->orderBy('created_at', 'desc')
    //             ->first();

    //             $plan = DB::table('customer_plan')
    //             ->where('customer_plan_id', $active_plan->plan_id)
    //             ->first();

    //             if($plan_user->fixed == 1 || $plan_user->fixed == "1") {
    //                 $temp_valid_date = date('F d, Y', strtotime('+'.$active_plan_first->duration, strtotime($plan->plan_start)));
    //                 $expiry_date = date('F d, Y', strtotime('-1 day', strtotime($temp_valid_date)));
    //             } else if($plan_user->fixed == 0 | $plan_user->fixed == "0") {
    //                 $expiry_date = date('F d, Y', strtotime('+'.$plan_user->duration, strtotime($plan_user->plan_start)));
    //             }
    //         }
    //     }

    //     $deletion_text = null;

    //     if($deletion) {
    //         $expiry_date = date('d F Y', strtotime($deletion->date_withdraw));
    //         $deletion_text = "Schedule for deletion: ".date('d F Y', strtotime($deletion->date_withdraw));
    //     } else {
    //         if(date('Y-m-d', strtotime($expiry_date)) < date('Y-m-d')) {
    //             $deletion_text = "Care Plan For this Member is expired: ".$expiry_date;
    //             $deletion = true;
    //         }
    //     }

    //     $credit_balance = self::floatvalue($wallet->balance);

    //     // get pending allocation for medical
    //     $e_claim_amount_pending_medication = DB::table('e_claim')
    //     ->whereIn('user_id', $ids)
    //     ->where('spending_type', 'medical')
    //     ->sum('amount');

    //     // get pending allocation for wellness
    //     $e_claim_amount_pending_wellness = DB::table('e_claim')
    //     ->whereIn('user_id', $ids)
    //     ->where('spending_type', 'wellness')
    //     ->sum('amount');

    //     $medical = array(
    //         'credits_allocation' => number_format($medical_credit_data['allocation'], 2),
    //         'credits_spent' 	=> number_format($medical_credit_data['get_allocation_spent'], 2),
    //         'balance'			=> number_format($medical_credit_data['allocation'] - $medical_credit_data['get_allocation_spent'], 2),
    //         'e_claim_amount_pending_medication' => number_format($e_claim_amount_pending_medication, 2)
    //     );

    //     $wellness = array(
    //         'credits_allocation_wellness'	 => number_format($wellness_credit_data['allocation'], 2),
    //         'credits_spent_wellness' 		=> number_format($wellness_credit_data['get_allocation_spent'], 2),
    //         'balance'						=> number_format($wellness_credit_data['allocation'] - $wellness_credit_data['get_allocation_spent'], 2),
    //         'e_claim_amount_pending_wellness'	=> number_format($e_claim_amount_pending_wellness, 2)
    //     );

    //     $name = explode(" ", $user->Name);

    //     if(!empty($name[0]) && !empty($name[1])) {
    //         $first_name = $name[0];
    //         $last_name = $name[1];
    //     } else {
    //         $first_name = $user->Name;
    //         $last_name = $user->Name;
    //     }
    //
    //
    //     $member_id = str_pad($user->UserID, 6, "0", STR_PAD_LEFT);

    //     $temp = array(
    //         'spending_account'	=> array(
    //             'medical' 	=> $medical,
    //             'wellness'	=> $wellness
    //         ),
    //         'dependents'	  		=> $dependets,
    //         'plan_tier'				=> $plan_tier,
    //         'name'					=> $user->Name,
    //         'first_name'			=> $first_name,
    //         'last_name'				=> $last_name,
    //         'email'					=> $user->Email,
    //         'enrollment_date' 		=> $user->created_at,
    //         'plan_name'				=> $plan_name,
    //         'start_date'			=> $get_employee_plan->plan_start,
    //         'expiry_date'			=> $expiry_date,
    //         'wallet_id'				=> $wallet->wallet_id,
    //         'credits'				=> number_format($credit_balance, 2),
    //         'user_id'				=> $user->UserID,
    //         'member_id'				=> $member_id,
    //         'nric'					=> $user->NRIC,
    //         'phone_no'				=> $user->PhoneNo,
    //         'job_title'				=> $user->Job_Title,
    //         'dob'					=> date('Y-m-d', strtotime($user->DOB)),
    //         'postal_code'			=> $user->Zip_Code,
    //         'bank_account'			=> $user->bank_account,
    //         'company'				=> ucwords($user->company_name),
    //         'employee_plan'			=> $get_employee_plan,
    //         'deletion'				=> $deletion ? TRUE : FALSE,
    //         'deletion_text'			=> $deletion_text
    //     );
    //     array_push($final_user, $temp);
    // }


    // $paginate['data'] = $final_user;

    // return $paginate;
}



module.exports = {
    overviewEnrollmentProgress
}

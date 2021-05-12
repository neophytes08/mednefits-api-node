require('express-async-errors');
require('dotenv').config();
const APPPATH = require('app-root-path');
const PlanHelper = require(`${APPPATH}/server/helpers/plan.helper.js`);
const Bundle = require(`${APPPATH}/server/helpers/bundle.helper.js`);
const clinicHelper = require(`${APPPATH}/server/helpers/clinic.helper.js`);
const moment = require('moment');
const { map } = require('p-iteration');
const format = require('format-number');
const ucwords=require('ucwords');
const employeeModel = require('./home.model');
const _ = require('lodash');

const getEmployeeCarePackage = async (req, res, next) => {
    console.log('fuck')
    let data = req.query;
    let company = await employeeModel.getOne('medi_company_members', { member_id: data.member_id });

    if(company) {
        let data_info = new Object();
        // get company details
        let member = await employeeModel.getOne('medi_members', { member_id: data.member_id });
        let wallet = await employeeModel.getOne('medi_member_wallet', { member_id: data.member_id });
        let plan_history = await employeeModel.aggregation('medi_member_plan_history', [
            {$match: {member_id: data.member_id}},
            {$sort: {created_at: -1}},
            {$sort: {customer_active_plan_id: -1}},
            {$limit: 1}
        ]);
        let info = await employeeModel.getOne('medi_customer_business_information', { customer_id: company.customer_id });

        data.fullname = member.fullname;
        data.company_name = info.company_name;
        data.member_id = data.member_id;
        data.dob = moment(member.dob).format('DD/MM/YYYY');
        data.mobile = `${ member.phone_code }${ member.phone_no }`;
        data.dependent_user = false;
        plan_history = plan_history[0];

        let planAddOn = await PlanHelper.getCompanyAccountTypeEnrollee(company.customer_id);
        let result = await PlanHelper.getEnrolleePackages(plan_history.customer_active_plan_id, planAddOn);
        let plan_type = await PlanHelper.getEmployeePlanType(plan_history.customer_active_plan_id);
        let bundleResult = await Bundle.getBundle(result);
        let plan_dates = await PlanHelper.getEmployeePlanDetails(data.member_id);
        let format_bundles = [];

        for(var x = 0; x < bundleResult.length; x++) {
            let package = await employeeModel.getOne('medi_benefits_care_package', { benefits_care_package_id: bundleResult[x].benefits_care_package_id });
            format_bundles.push(package);
        }

        data.packages = format_bundles;
        data.plan_add_on = planAddOn;
        data.plan_type = plan_type;
        data.start_date = plan_dates.plan_start;
        data.valid_date = plan_dates.plan_end;
        data.valid_start_claim = plan_dates.valid_start_claim;
        data.valid_end_claim = plan_dates.valid_end_claim;

        // get plan tier user
        let plan_tier_user = await employeeModel.getOne('medi_customer_plan_tier_users', { member_id: data.member_id, status: 1 });
        let cap_per_visit = "Not Applicable";

        if(plan_tier_user) {
            // get plan tier details
            let plan_tier = await employeeModel.getOne('medi_customer_plan_tiers', { customer_id: plan_tier_user.member_id, active: 1});
            if(plan_tier) {
                cap_per_visit = 'S$ ' + plan_tier.gp_cap_per_visit.toFixed(2);
            }
        }

        if(wallet.cap_amount > 0) {
            cap_per_visit = 'S$ ' + wallet.cap_amount.toFixed(2);
        }


        data.cap_per_visit = cap_per_visit;
        return res.json(data);

    } else {

    }

    return res.json(company);
}

const getEmployeeCurrentSpending = async (req, res, next) => {
    let id = req.query.member_id
    let spending_type = req.query.spending_type ? req.query.spending_type : 'medical';
    let member = await employeeModel.getOne('medi_members', { member_id: id });
    let wallet = await employeeModel.getOne('medi_member_wallet', { member_id: id })

    creditWallet = await PlanHelper.memberAllocatedCredits(wallet.member_wallet_id, id, spending_type);
    let user_ids = await employeeModel.getIds('medi_member_covered_dependents', { 'owner_id': id }, 'member_id')
    user_ids.push(id);
    console.log('user_ids', user_ids)
    // get last transaction in in-network
    let in_networks = await employeeModel.aggregation('medi_member_in_network_transactions',
        [
            {
                $match: {
                    member_id: {
                        $in: user_ids
                    },
                    spending_type: spending_type
                }
            },
            {$sort:{created_at: -1}},
            {$limit: 3}
        ]
    );

    let out_networks = await employeeModel.aggregation('medi_out_of_network_transactions',
        [
            {
                $match: {
                    member_id: {
                        $in: user_ids
                    }
                }
            },
            {$sort:{created_at: -1}},
            {$limit: 3}
        ]
    );

    let totalCredits = 0;
    let transactionDetails = new Array();
    let outOfNetworkTransactionDetails = new Array();
    let totalConsultation = 0;
    let inNetworkTransactions = 0;
    let consultationStatus = false;
    let mednefitsFee = 0;
    let healthProviderStatus = false;

    let consultationCash = false;
    let consultationCredits = false;
    let serviceCash = false;
    let serviceCredits = false;
    let logsLitePlan = null;
    let mednefitsCredits = 0;
    let cash = 0;
    let procedure = "";
    let clinicName = "";
    let receiptStatus = false;
    let paymentType = "Cash";
    let transactionType = "cash";
    let subAccount = null;
    let subAccountType = null;
    let ownerID = null;
    let dependentRelationship = null;

    // get in-networks
    await map(in_networks, async transaction =>  {
        mednefitsFee = 0;
        var trans = await employeeModel.getOne("medi_member_in_network_transactions",{in_network_transaction_id: transaction.in_network_transaction_id, paid_status: 1, refunded: 0});

        console.log('transaction', trans)
        if(trans != null)
        {
            consultationCash = false;
            consultationCredits = false;
            serviceCash = false;
            serviceCredits = false;

            if(parseInt(trans.deleted) == 0)
            {
                inNetworkTransactions = inNetworkTransactions + parseFloat(trans.credit_cost);

                if(parseInt(trans.lite_plan_enabled) == 1) {
                    consultationStatus = true;

                    logsLitePlan = await employeeModel.getOne("medi_member_wallet_history",{
                        id: transaction.in_network_transaction_id,
                        wallet_type: (trans.spending_type == "medical" ? "medical" : "wellness")
                    });

                    if(logsLitePlan)
                    {
                        if(parseFloat(trans.credit_cost) >= 0 && parseFloat(trans.lite_plan_use_credits) == 0)
                        {
                            totalConsultation = totalConsultation + parseFloat(logsLitePlan.credit);
                            consultationCredits = true;
                            serviceCredits = true;
                        }
                        else if(parseFloat(trans.procedure_cost) && parseFloat(trans.lite_plan_use_credits) == 1)
                        {
                            totalConsultation = totalConsultation + parseFloat(logsLitePlan.credit);
                            consultationCredits = true;
                            serviceCredits = true;
                        }
                        else{
                            totalConsultation = totalConsultation + parseFloat(trans.consultation_fees);
                        }
                    }
                    else{
                        totalConsultation = totalConsultation + parseFloat(trans.consultation_fees);
                    }
                }

                if(parseFloat(trans.credit_cost) > 0)
                {
                    mednefitsCredits = parseFloat(trans.credit_cost);
                    cash = "0.00";
                }
                else
                {
                    mednefitsCredits = "0.00";
                    cash = parseFloat(trans.procedure_cost);
                }

                let imageReceipts = await employeeModel.getMany("medi_in_network_transaction_receipt", {in_network_transaction_id: trans.in_network_transaction_id});
                let clinic = await employeeModel.getOne("medi_health_providers", {
                    health_provider_id: trans.provider_id
                });
                let clinicType = await employeeModel.getOne("medi_health_provider_types", {health_provider_type_id: clinic.provider_type_ids[0]});
                let customer = await employeeModel.getOne("medi_members", {member_id: trans.member_id});
                let procedureTemp = "";
                let services = "";

                if((trans.procedure_ids).length > 0)
                {

                    let seviceList = await employeeModel.aggregation("medi_health_provider_services",[
                        {
                            $match: {
                                health_provider_service_id: {
                                    $in: trans.procedure_ids
                                    }
                                }
                        }
                    ]);

                    _.each(seviceList, function(service, key){
                        if(key == seviceList.length - 2)
                        {
                            procedureTemp = procedureTemp + ucwords(service.service_name) + ' and ';
                        }
                        else
                        {
                            procedureTemp = procedureTemp + ucwords(service.service_name) + ',';
                        }
                        procedure = procedureTemp.replace(/,\s*$/, "");
                    });
                    clinicName = ucwords(clinicType.name) + ' - ' + procedure;
                }
                else
                {
                    let seviceList = await employeeModel.aggregation("medi_health_provider_services",[
                        {
                            $match: {
                                health_provider_service_id: {
                                    $in: trans.procedure_ids
                                    }
                                }
                        },
                        {
                            $limit:1
                        }
                    ]);
                    if(seviceList) {
                        procedure = ucwords(seviceList[0].service_name);
                        clinicName = ucwords(clinicType.name) + ' - ' + procedure;
                    } else {
                        clinicName = ucwords(clinicType.name);
                    }
                }


                let numReceipts = await employeeModel.countCollection("medi_in_network_transaction_receipt", {in_network_transaction_id: trans.in_network_transaction_id});

                receiptStatus = false;
                if(numReceipts > 0)
                {
                    receiptStatus = true;
                }

                let totalAmount = trans.credit_cost;
                let procedureCost = trans.procedure_cost;
                let treatment = trans.credit_cost;
                let consultation = 0;

                if(parseInt(trans.health_provider_done) == 1)
                {
                    receiptStatus = true;
                    healthProviderStatus = true;
                    paymentType = "Cash";
                    transactionType = "cash";

                    if(parseInt(trans.lite_plan_enabled) == 1)
                    {
                        totalAmount = trans.co_paid_amount;
                        procedureCost = "0.00";
                        treatment = 0;
                        consultation = trans.co_paid_amount;
                    }
                }
                else
                {
                    paymentType = "Mednefits Credits";
                    transactionType = "credits";
                    healthProviderStatus = false;

                    if(parseInt(trans.lite_plan_enabled) == 1)
                    {
                        totalAmount = parseFloat(trans.credit_cost) + parseFloat(trans.co_paid_amount);
                        treatment = trans.credit_cost;
                        consultation = trans.co_paid_amount;
                    }
                }

                let clinic_Type = await employeeModel.aggregation("medi_health_provider_types",[
                    {
                        $match: {
                            health_provider_type_id: {
                                $in: clinic.provider_type_ids
                                }
                            }
                    },
                    {
                        $limit:1
                    }
                ]);

                clinicType = clinic_Type[0];
                let findHead = clinicType;

                if(parseInt(clinicType.service_head) != 1)
                {
                    findHead = await employeeModel.getOne(
                        "medi_health_provider_types",
                        { health_provider_type_id: clinicType.service_sub_id }
                    );
                }

                let clinic_type_properties = await clinicHelper.getClinicTypeProperties(findHead);
                let type = clinic_type_properties.type;
                let clinicTypeName = clinic_type_properties.clinicName;
                let image = clinic_type_properties.image;
                if(customer.member_type == "dependents")
                {
                    let tempSub = await employeeModel.getOne("medi_member_covered_dependents", {
                        member_id: customer.member_id
                    });

                    let tempAccount = await employeeModel.getOne("medi_members", {member_id: tempSub.owner_id});
                    subAccount = ucwords(tempAccount.fullname);
                    subAccountType = "dependent";
                    ownerID = tempSub.member_id;
                    dependentRelationship = ucwords(tempSub.relationship);
                }
                else
                {
                    subAccount = false;
                    subAccountType = false;
                    ownerID = customer.member_id;
                    dependentRelationship = false;
                }

                let transactionID = ((trans.in_network_transaction_id).toString()).padStart(6,0)
                transactionDetails.push({
                    clinic_name: clinic.name,
                    clinic_image: clinic.provider_image,
                    total_amount:  parseFloat(totalAmount),
                    procedure_cost: parseFloat(procedureCost),
                    clinic_type_and_service: clinicName,
                    service: procedure,
                    clinic_type_name: clinicTypeName,
                    date_of_transaction: trans.date_of_transaction,
                    member:  ucwords(customer.fullname),
                    transaction_id: ((clinic.name).padStart(6,0)).toUpperCase() + transactionID.toString(),
                    receipt_status: receiptStatus,
                    health_provider_status :  healthProviderStatus,
                    user_id:  trans.member_id,
                    type:  'In-Network',
                    month:  moment(new Date(trans.date_of_transaction)).format("MMMM"),//date('M', strtotime($trans['date_of_transaction'])),
                    day:  moment(new Date(trans.date_of_transaction)).format("DD"),//date('d', strtotime($trans['date_of_transaction'])),
                    time:  moment(new Date(trans.date_of_transaction)).format("hh:mm A"),//date('h:ia', strtotime($trans['date_of_transaction'])),
                    clinic_type:  type,
                    clinic_type_name  :  clinicTypeName,
                    clinic_type_image :  image,
                    owner_account: subAccount,
                    owner_id: ownerID,
                    sub_account_user_type : subAccountType,
                    co_paid: trans.co_paid_amount,
                    payment_type: paymentType,
                    nric:  customer.nric,
                    mednefits_credits: mednefitsCredits,
                    cash: cash,
                    consultation_credits : consultationCredits,
                    consultation: consultation,
                    service_credits:  serviceCredits,
                    transaction_type:  transactionType,
                    treatment: treatment,
                    amount: treatment,
                    spending_type: trans.spending_type,
                    dependent_relationship  : dependentRelationship,
                    lite_plan: (parseInt(trans['lite_plan_enabled']) == 1 ? true : false)
                });
            }
        }
    });

    // get out-of-network
    await map(out_networks, async transaction =>  {
        let status_text = null;

        if(transaction.claim_status == 0) {
            status_text = "Pending";
        } else if(transaction.claim_status == 1) {
            status_text = "Approved";
        } else if(transaction.claim_status == 2) {
            status_text = "Rejected";
        } else {
            status_text = "Pending";
        }

        let customer = await employeeModel.getOne("medi_members", {member_id: transaction.member_id});

        let temp = {
            member: customer.name,
            transaction_id: transaction.out_of_network_transaction_id,
            service: transaction.claim_type,
            merchant: transaction.provider,
            amount: transaction.claim_amount,
            visit_date: `${ transaction.visit_date } ${ transaction.visit_time }`,
            visit_time: transaction.visit_time,
            claim_date: transaction.created_at,
            type: 'E-Claim',
            spending_type: transaction.spending_type,
            status_text: status_text,
            status: transaction.claim_status
        }

        outOfNetworkTransactionDetails.push(temp);
    });
    
    let data = {
        spending_type: spending_type,
        total_allocation: creditWallet.allocation,
        current_spending: creditWallet.getAllocationSpent,
        e_claim_spent: creditWallet.eClaimSpent,
        in_network_spent: creditWallet.inNetworkSpent,
        balance: creditWallet.balance,
        in_network_transactions: transactionDetails,
        out_of_network_transactions: outOfNetworkTransactionDetails
    }

    return res.json(data)
}

const updateUserProfile = async (req, res, next) => {
  console.log('yeeep')
};

module.exports = {
    getEmployeeCarePackage,
    getEmployeeCurrentSpending,
    updateUserProfile
}

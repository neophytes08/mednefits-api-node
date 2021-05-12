require('express-async-errors');
require('dotenv').config();
const APPPATH = require('app-root-path');
const PlanHelper = require(`${APPPATH}/server/helpers/plan.helper.js`);
const Bundle = require(`${APPPATH}/server/helpers/bundle.helper.js`);
const moment = require('moment');
const generate = require('generate-password');
const sha256 = require('sha256');
const jwt = require('jsonwebtoken');
const { map } = require('p-iteration');
const format = require('format-number');
const ucwords = require('ucwords');
const employeeModel = require('./employees.model');
const validate = require('./employees.validator');
const _ = require('lodash');

const getEmployeeCarePackage = async (req, res, next) => {
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
                    }
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

                let type = "";
                let clinicTypeName = "";
                let image = "";
                let findHead = clinicType;

                if(parseInt(clinicType.service_head) != 1)
                {
                    findHead = await employeeModel.getOne(
                        "medi_health_provider_types",
                        { health_provider_type_id: clinicType.service_sub_id }
                    );
                }

                if(findHead.name == "General Practitioner")
                {
                    type = "general_practitioner";
                    clinicTypeName = "General Practitioner";
                    image = "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515238/tidzdguqbafiq4pavekj.png";
                }
                else if(findHead.name == "Dental Care")
                {
                    type = "dental_care";
                    clinicTypeName = "Dental Care";
                    image = "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515231/lhp4yyltpptvpfxe3dzj.png";
                }
                else if(findHead.name == "Traditional Chinese Medicine")
                {
                    type = "tcm";
                    clinicTypeName = "Traditional Chinese Medicine";
                    image = "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515256/jyocn9mr7mkdzetjjmzw.png";
                }
                else if(findHead.name == "Health Screening")
                {
                    type = "health_screening";
                    clinicTypeName = "Health Screening";
                    image = "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515243/v9fcbbdzr6jdhhlba23k.png";
                }
                else if(findHead.name == "Wellness")
                {
                    type = "wellness";
                    clinicTypeName = "Wellness";
                    image = "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515261/phvap8vk0suwhh2grovj.png";
                }
                else if(findHead.name == "Health Specialist")
                {
                    type = "health_specialist";
                    clinicTypeName = "Health Specialist";
                    image = "ttps://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515247/toj22uow68w9yf4xnn41.png";
                }

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
                    member:  ucwords(customer.name),
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
  let data = req.body;
  let member_id = parseInt(req.body.member_id);
  delete data.member_id;
  delete data.admin_id;

  if(_.isEmpty(data)) {
    return res.status(400).json({ status: false, message: 'Nothing is updated.' })
  }
  console.log('data',data);
  isValid = await validate.joiValidate(data, validate.updateEmployee, true)
  console.log('isValid', isValid)
  if(typeof isValid != 'boolean')
  {
      return res.status(400).json({
          status: false,
          message: isValid.details[0].message
      })
  }
  console.log('member_id', member_id)
  let update = await employeeModel.updateOne('medi_members', { member_id: member_id }, data)
  console.log('update', update)
  if(update) {
    return res.json({ status: true, message: 'Profile updated successfully' })
  } else {
    return res.status(400).json({ status: false, message: 'Failed to update profile data.' })
  }
  console.log(password);
 let password = generator.generate({
   length: 10,
   numbers: true
 });

  return res.send('ok')
};

const newAllergy = async ( req, res, next) => {

    console.log('req.body', req.body);
    let data = req.body;
    delete data.admin_id;
    // delete data.member_id;
    let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
    let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");
    let allergy_name = req.body.allergy_name;
    let member_id = parseInt(req.body.member_id);

  console.log('data', data);
  isValid = await validate.joiValidate(data, validate.createAllergy, true)
  console.log('isValid', isValid)
  if(typeof isValid != 'boolean')
  {
    return res.status(400).json({
      status: false,
      message: isValid.details[0].message
    })
  }

  let allergy = await employeeModel.saveOne('medi_member_allergies', {allergy_name: allergy_name, member_id: member_id, createdAt: createdAt, updatedAt: updatedAt}, data)
  console.log('allergy', allergy);
  if(allergy) {
    return res.json({ status: true, message: 'New allergy Added.' })
  } else {
    return res.status(400).json({ status: false, message: 'Failed to add new allergy.' })
  }
};

const newMedication = async ( req, res, next) => {

    console.log('req.body', req.body);
    let data = req.body;
    delete data.admin_id;
    // delete data.member_id;
    let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
    let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");
    let medication_name = req.body.medication_name;
    let medication_dosage = req.body.medication_dosage;
    let member_id = parseInt(req.body.member_id);

  console.log('data', data);
  isValid = await validate.joiValidate(data, validate.createMedication, true)
  console.log('isValid', isValid)
  if(typeof isValid != 'boolean')
  {
    return res.status(400).json({
      status: false,
      message: isValid.details[0].message
    })
  }

  let medication = await employeeModel.saveOne('medi_member_medications', {medication_name: medication_name,medication_dosage: medication_dosage, member_id: member_id, createdAt: createdAt, updatedAt: updatedAt}, data)
  console.log('medication', medication);
  if(medication) {
    return res.json({ status: true, message: 'New medication Added.' })
  } else {
    return res.status(400).json({ status: false, message: 'Failed to add new medication.' })
  }
};

const newCondition = async ( req, res, next) => {

    console.log('req.body', req.body);
    let data = req.body;
    delete data.admin_id;
    // delete data.member_id;
    let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
    let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");
    let condition_name = req.body.condition_name;
    let date = moment().format("YYYY-MM-DD HH:mm:ss");
    let active = req.body.active;
    let member_id = parseInt(req.body.member_id);

  console.log('data', data);
  isValid = await validate.joiValidate(data, validate.createCondition, true)
  console.log('isValid', isValid)
  if(typeof isValid != 'boolean')
  {
    return res.status(400).json({
      status: false,
      message: isValid.details[0].message
    })
  }

  let condition = await employeeModel.saveOne('medi_member_conditions', {condition_name: condition_name, date: date, member_id: member_id, active: active, createdAt: createdAt, updatedAt: updatedAt}, data)
  console.log('condition', condition);
  if(condition) {
    return res.json({ status: true, message: 'New condition Added.' })
  } else {
    return res.status(400).json({ status: false, message: 'Failed to add new condition.' })
  }
};

const newMedicalHistory = async ( req, res, next) => {

    console.log('req.body', req.body);
    let data = req.body;
    delete data.admin_id;
    // delete data.member_id;
    let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
    let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");
    let condition_name = req.body.condition_name;
    let date = moment().format("YYYY-MM-DD HH:mm:ss");
    let member_id = parseInt(req.body.member_id);
    let visit_type = req.body.visit_type;
    let doctor_name = req.body.doctor_name;
    let clinic_name = req.body.clinic_name;
    let note = req.body.note;

  console.log('data', data);
  isValid = await validate.joiValidate(data, validate.createMedicalHistory, true)
  console.log('isValid', isValid)
  if(typeof isValid != 'boolean')
  {
    return res.status(400).json({
      status: false,
      message: isValid.details[0].message
    })
  }

  let medHistory = await employeeModel.saveOne('medi_member_medical_histories', {visit_type: visit_type, doctor_name: doctor_name, clinic_name: clinic_name, member_id: member_id, note: note, date: date, createdAt: createdAt, updatedAt: updatedAt}, data)
  console.log('medHistory', medHistory);
  if(medHistory) {
    return res.json({ status: true, message: 'New medical history added.' })
  } else {
    return res.status(400).json({ status: false, message: 'Failed to add new medical history.' })
  }
};

const getMemberProfile = async (req, res, next) => {
      let data = req.query;
      let user = new Object();
      let member = await employeeModel.getOne("medi_members", { member_id: data.member_id});
      let allergies = await employeeModel.getOne("medi_member_allergies", { member_id: data.member_id});
      let medication = await employeeModel.getOne("medi_member_medications", { member_id: data.member_id});
      let history = await employeeModel.getOne("medi_member_medical_histories", { member_id: data.member_id});
      let condition = await employeeModel.getOne("medi_member_conditions", { member_id: data.member_id});

      let data_temp = {
        profile: {
          member_id: member.member_id,
          fullname: member.fullname,
          nric: member.nric,
          email: member.email,
          image: member.image,
          weight: member.weight,
          height: member.height,
          phone_no: member.phone_no,
          dob: member.dob,
          blood_type: member.blood_type
        },
        allergies: {
          member_id: allergies.member_id,
          allergy_name: allergies.allergy_name,
          createdAt: allergies.createdAt
        },
        medications: {
          member_id: medication.member_id,
          medication_name: medication.medication_name,
          medication_dosage: medication.medication_dosage,
          createdAt: medication.createdAt
        },
        medical_history:{
          member_id: history.member_id,
          visit_type: history.visit_type,
          doctor_name: history.doctor_name,
          clinic_name: history.clinic_name,
          note: history.note,
          date: history.date,
          createdAt: history.createdAt
        },
        condition: {
          member_id: condition.member_id,
          condition_name: condition.condition_name,
          date: condition.date,
          active: condition.active,
          createdAt: condition.createdAt
        },
      }
      return res.json(data_temp);
}
// const searchClinic = async (req, res, next) => {
//   let data = req.query;
//   let clinicID = parseInt(data.customer_id);
//   let finalClinic = new Array();
//
//   let clinicData = new  Array(), x = 0, count = 0, members = null, companyMembers = new Object();
//   let options = {
//     page: req.query.page ? req.query.page : 1,
//     limit: req.query.limit ? req.query.limit : 5,
//   };
//
//   if(data.search) {
//     clinicList = await employeeModel.aggregation('medi_health_providers',
//     [
//       {
//         match: { $text: { $search: data.search } }
//       },
//       {
//         $lookup: {
//           from: 'medi_health_providers',
//           localField: 'health_provider_id',
//           foreignField: 'health_provider_id',
//           as: 'clinic'
//         }
//       },
//       { $unwind: '$members' },
//       {
//         $match: {'clinic.health_provider_id': clinicID}
//       }
//     ]
// )};
//  return res.json(clinicData);
// }

const getClinicCategoryList = async (req, res, next) => {
  let data = req.query;
  // delete data.member_id;
  // delete data.admin_id;
  let provider = new Object();
  // let health_provider_type_id = data.health_provider_type_id;
  let clinic = await employeeModel.getOne("medi_health_provider_types", { id: data._id});

  let temp_data = {
    clinic_types: [{
      clinicTypeId: clinic.health_provider_type_id,
      name: clinic.name,
      image_url: clinic.image_url
  }],


  }
  console.log('name', clinic);
  return res.json(temp_data);

};

// const resetPassword = async (req, res, next) =>
// {
//    let data = req.body;
//    let member_id = parseInt(req.body.member_id);
//    let password = sha256(req.body.password);
//    delete data.admin_id;
//    delete data.member_id;
//
//    data.password = password;
//    console.log('data',data);
//    isValid = await validate.joiValidate(data, validate.changePass, true)
//    console.log('isValid', isValid)
//    if(typeof isValid != 'boolean')
//    {
//        return res.status(400).json({
//            status: false,
//            message: isValid.details[0].message
//        })
//    }
//    let change = await employeeModel.updateOne('medi_members', {member_id: member_id}, data)
//    console.log('change', change)
//    if(change) {
//      data.password = password;
//      return res.json({ status: true, message: 'successfully updated password' })
//    } else {
//      return res.status(400).json({ status: false, message: 'Failed to update password' })
//    }
//
//    return res.send('ok')
//  };

 const getMedicalWellnessList = async (req, res, next) => {
   let data = req.query;
   let clinic = await employeeModel.getMany('medi_health_types',

   {type: "wellness"});

   if(clinic) {
      let clinic_info = new Object();
   let data_info = {

   }
 }
 return res.json(clinic);

};
// // Temporary Create medi_health_types
//  const mediHealthTypes = async ( req, res, next) => {
//
//      console.log('req.body', req.body);
//      let data = req.body;
//      delete data.admin_id;
//      delete data.member_id;
//      let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
//      let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");
//      let health_type_id = parseInt(req.body.health_type_id);
//      let type_name = req.body.type_name;
//      let type = req.body.type;
//
//    console.log('data', data);
//    isValid = await validate.joiValidate(data, validate.createClinicTypes, true)
//    console.log('isValid', isValid)
//    if(typeof isValid != 'boolean')
//    {
//      return res.status(400).json({
//        status: false,
//        message: isValid.details[0].message
//      })
//    }
//
//    let type_clinic = await employeeModel.saveOne('medi_health_types', {health_type_id: health_type_id, type_name: type_name, type: type, createdAt: createdAt, updatedAt: updatedAt}, data)
//    console.log('type_clinic', type_clinic);
//    if(type_clinic) {
//      return res.json({ status: true, message: 'added' })
//    } else {
//      return res.status(400).json({ status: false, message: 'failed' })
//    }
//  };


const getDependentLists = async(req, res, next) => {
    let data = req.query;
    let member = await employeeModel.getOne('medi_members', { member_id: data.member_id });
    let users = new Array();
    let dependents = await employeeModel.getMany('medi_member_covered_dependents', { owner_id: data.member_id, deleted: 0 })

    users.push({
        member_id: member.member_id,
        fullname: ucwords(member.fullname),
        dob: moment(member.dob).format("M/M/YYYY"),
        type: 'Owner'
    })

    for(var x = 0; x < dependents.length; x++) {
        member = await employeeModel.getOne('medi_members', { member_id: dependents[x].member_id });
        users.push({
            member_id: member.member_id,
            fullname: ucwords(member.fullname),
            dob: moment(member.dob).format("M/M/YYYY"),
            type: ucwords(dependents[x].relationship)
        })
    }
    return res.json({ status: true, data: users });
}

module.exports = {
    getEmployeeCarePackage,
    getEmployeeCurrentSpending,
    updateUserProfile,
    newAllergy,
    newCondition,
    newMedication,
    newMedicalHistory,
    getMemberProfile,
    getClinicCategoryList,
    // resetPassword,
    getMedicalWellnessList
    // mediHealthTypes
    // searchClinic
}

require('express-async-errors');
require('dotenv').config();
const APPPATH = require('app-root-path');
const PlanHelper = require(`${APPPATH}/server/helpers/plan.helper.js`);
const Bundle = require(`${APPPATH}/server/helpers/bundle.helper.js`);
const eClaimHelper = require(`${APPPATH}/server/helpers/e_claim.helper.js`);
const clinicHelper = require(`${APPPATH}/server/helpers/clinic.helper.js`);
const moment = require('moment');
const { map } = require('p-iteration');
const format = require('format-number');
const ucwords=require('ucwords');
const employeeModel = require('./activity.model');
const _ = require('lodash');
const validate = require('./activity.validator');

const getActivity = async(req, res, next) => {
	let query = {
		start: req.query.start,
		end: req.query.end,
		spending_type: req.query.spending_type
	}

	isValid = await validate.joiValidate(query, validate.activityQuery, true)
	
    if(typeof isValid != 'boolean')
    {
        return res.status(400).json({ status: false, message: isValid.details[0].message })
    }

    let start = moment(new Date(query.start)).format("YYYY-MM-DD HH:mm:ss");
    let end = moment(new Date(query.end)).add('23', 'hours').add('59', 'minutes').add('59', 'seconds').format("YYYY-MM-DD HH:mm:ss");
    // console.log('start', start)
    // console.log('end', end)
    let id = req.query.member_id
    let member = await employeeModel.getOne('medi_members', { member_id: id });
    let wallet = await employeeModel.getOne('medi_member_wallet', { member_id: id })

    creditWallet = await PlanHelper.memberActivityAllocatedCredits(wallet.member_wallet_id, id, query.spending_type, start);
    // return res.json(creditWallet);
    let user_ids = await employeeModel.getIds('medi_member_covered_dependents', { 'owner_id': id }, 'member_id')
    user_ids.push(id);

    // get transactions in in-network
    let in_networks = await employeeModel.aggregation('medi_member_in_network_transactions',
        [
            {
                $addFields: {
                    convertedDate: { $toDate: "$created_at" }
                }
            },
            {
                $match: {
                    member_id: {
                        $in: user_ids
                    },
                    created_at: {
                    	$gte: start,
                    	$lte: end
                    }
                }
            },
            {$sort:{created_at: -1}}
        ]
    );

    // get transactions in out-network
    let out_networks = await employeeModel.aggregation('medi_out_of_network_transactions',
        [
            {
                $addFields: {
                    convertedDate: { $toDate: "$created_at" }
                }
            },
            {
                $match: {
                    member_id: {
                        $in: user_ids
                    },
                    created_at: {
                        $gte: start,
                        $lte: end
                    }
                }
            },
            {$sort:{created_at: -1}}
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
    let out_of_network_spent = 0;
    let in_network_spent = 0;
    // get in-networks
    for(var x = 0; x < in_networks.length; x++) {
        let transaction = in_networks[x];
        mednefitsFee = 0;
        var trans = await employeeModel.getOne("medi_member_in_network_transactions",{in_network_transaction_id: transaction.in_network_transaction_id});
        
        if(trans != null)
        {
            consultationCash = false;
            consultationCredits = false;
            serviceCash = false;
            serviceCredits = false;

            if(parseInt(trans.deleted) == 0)
            {
                inNetworkTransactions = inNetworkTransactions + parseFloat(trans.credit_cost);
                in_network_spent += parseFloat(trans.credit_cost);
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
                            in_network_spent += parseFloat(logsLitePlan.credit);
                        }
                        else if(parseFloat(trans.procedure_cost) && parseFloat(trans.lite_plan_use_credits) == 1)
                        {
                            totalConsultation = totalConsultation + parseFloat(logsLitePlan.credit);
                            consultationCredits = true;
                            serviceCredits = true;
                            in_network_spent += parseFloat(logsLitePlan.credit);
                        }
                        else{
                            totalConsultation = totalConsultation + parseFloat(trans.consultation_fees);
                            in_network_spent += parseFloat(trans.consultation_fees);
                        }
                    }
                    else{
                        totalConsultation = totalConsultation + parseFloat(trans.consultation_fees);
                        in_network_spent += parseFloat(trans.consultation_fees);
                    }
                }
            } else {
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
                            consultationCredits = true;
                            serviceCredits = true;
                        }
                        else if(parseFloat(trans.procedure_cost) && parseFloat(trans.lite_plan_use_credits) == 1)
                        {
                            consultationCredits = true;
                            serviceCredits = true;
                        }
                    }
                }
            }

            if(parseFloat(trans.credit_cost) > 0)
            {
                mednefitsCredits = parseFloat(trans.credit_cost);
                cash = 0;
            }
            else
            {
                mednefitsCredits = 0;
                cash = parseFloat(trans.procedure_cost);
            }

            let imageReceipts = await employeeModel.getMany("medi_in_network_transaction_receipt", {in_network_transaction_id: trans.in_network_transaction_id});
            let clinic = await employeeModel.getOne("medi_health_providers", {
                health_provider_id: trans.provider_id
            });
            let clinicType = await employeeModel.getOne("medi_health_provider_types", {health_provider_type_id: clinic.provider_type_ids[0]});
            let customer = await employeeModel.getOne("medi_members", {member_id: trans.member_id});
            // console.log('clinic', clinic);
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

            let findHead = clinicType;

            if(parseInt(clinicType.service_head) != 1)
            {
                findHead = await employeeModel.getOne(
                    "medi_health_provider_types",
                    { health_provider_type_id: clinicType.service_sub_id }
                );
            } else {
                findHead = clinicType;
            }

            if(!findHead) {
                findHead = clinicType;
            }


            let clinic_type_properties = await clinicHelper.getClinicTypeProperties(findHead);
            let type = clinic_type_properties.type;
            let clinicTypeName = clinic_type_properties.clinicName;
            let image = clinic_type_properties.image;
                
            if(customer.member_type == "dependent")
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

            let transactionID = ((trans.in_network_transaction_id).toString()).padStart(6,0);
            transactionDetails.push({
                transaction_id: trans.transaction_id,
                clinic_name: clinic.name,
                clinic_image: clinic.provider_image,
                total_amount:  parseFloat(totalAmount),
                procedure_cost: parseFloat(procedureCost),
                clinic_type_and_service: clinicName,
                service: procedure,
                clinic_type_name: clinicTypeName,
                date_of_transaction: trans.date_of_transaction,
                member: ucwords(customer.fullname),
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

    // out of network
    for(var e = 0; e < out_networks.length; e++) {
        let e_claim_data = new Object();
        let id = "MN" + (out_networks[e].out_of_network_transaction_id.toString()).padStart(6,0);
        let docs = await employeeModel.getMany('medi_out_of_network_files', { out_of_network_id: out_networks[e].out_of_network_transaction_id } );
        let status_text = null;
        let doc_files = new Array();
        let member = await employeeModel.getOne('medi_members', { member_id: out_networks[e].member_id });

        for(var d = 0; d < docs.length; d++) {
            let file = new Object();
            file.out_of_network_file_id = docs[d].out_of_network_file_id;
            file.out_of_network_file_id = docs[d].out_of_network_id;
            file.file_type = docs[d].file_type;

            if(docs[d].file_type == "pdf" || docs[d].file_type == "xls" || docs[d].file_type == "xlsx") {
                file.file_url = await eClaimHelper.getPresignedUrl(docs[d].file_name);
            } else {
                file.file_url = docs[d].file_name;
            }

            doc_files.push(file);
        }

        if(out_networks[e].claim_status == 0) {
            status_text = 'Pending';
        } else if(out_networks[e].claim_status == 1) {
            status_text = 'Approved';
            out_of_network_spent += parseFloat(out_networks[e].claim_amount);
        } else if(out_networks[e].claim_status == 2) {
            status_text = 'Rejected';
        } else {
            status_text = 'Pending';
        }

        e_claim_data.transaction_id = id;
        e_claim_data.member = member.fullname;
        e_claim_data.merchant = out_networks[e].provider;
        e_claim_data.service = out_networks[e].claim_type;
        e_claim_data.amount = out_networks[e].claim_amount;
        e_claim_data.visit_date = out_networks[e].visit_date;
        e_claim_data.claim_date = out_networks[e].created_at;
        e_claim_data.time = out_networks[e].visit_time;
        e_claim_data.files = out_networks[e].doc_files;
        e_claim_data.rejected_reason = out_networks[e].status_reason;
        e_claim_data.rejected_date = out_networks[e].status_date != "Invalid date" ? out_networks[e].status_date : null;
        e_claim_data.spending_type = out_networks[e].spending_type;
        e_claim_data.approved_date = out_networks[e].status_date != "Invalid date" ? out_networks[e].status_date : null;
        e_claim_data.remarks = out_networks[e].status_reason;
        e_claim_data.status = out_networks[e].claim_status;
        e_claim_data.status_text = status_text;
        outOfNetworkTransactionDetails.push(e_claim_data);
    }

    return res.json({
        total_allocation: creditWallet.allocation,
        balance: creditWallet.balance,
        total_spent: in_network_spent + out_of_network_spent,
        in_network_spent: in_network_spent,
        out_of_network_spent: out_of_network_spent,
        in_network_transactions: transactionDetails,
        out_of_network_transactions: outOfNetworkTransactionDetails
    });
}

module.exports = {
    getActivity
}
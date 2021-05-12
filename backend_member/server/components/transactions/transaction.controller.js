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
const transactionModel = require('./transaction.model');
const _ = require('lodash');

const getInNetworkTransactions = async(req, res, next) => {
	let id = req.query.member_id;
	let user_ids = await transactionModel.getIds('medi_member_covered_dependents', { 'owner_id': id }, 'member_id')
  user_ids.push(id);

  // get transactions in in-network
  let in_networks = await transactionModel.aggregation('medi_member_in_network_transactions',
    [
      {
        $match: {
          member_id: {
            $in: user_ids
          }
        }
      },
      {$sort:{created_at: -1}}
    ]
  );

  // get transactions in out-network
  let out_networks = await transactionModel.aggregation('medi_out_of_network_transactions',
    [
      {
          $match: {
              member_id: {
                  $in: user_ids
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

  for(var x = 0; x < in_networks.length; x++) {
      let transaction = in_networks[x];
      mednefitsFee = 0;
      var trans = await transactionModel.getOne("medi_member_in_network_transactions",{in_network_transaction_id: transaction.in_network_transaction_id, paid_status: 1, refunded: 0});
      
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

                  logsLitePlan = await transactionModel.getOne("medi_member_wallet_history",{
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
                  logsLitePlan = await transactionModel.getOne("medi_member_wallet_history",{
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

          let imageReceipts = await transactionModel.getMany("medi_in_network_transaction_receipt", {in_network_transaction_id: trans.in_network_transaction_id});
          let clinic = await transactionModel.getOne("medi_health_providers", {
              health_provider_id: trans.provider_id
          });
          let clinicType = await transactionModel.getOne("medi_health_provider_types", {health_provider_type_id: clinic.provider_type_ids[0]});
          let customer = await transactionModel.getOne("medi_members", {member_id: trans.member_id});
          // console.log('clinic', clinic);
          let procedureTemp = "";
          let services = "";

          if((trans.procedure_ids).length > 0)
          {
          
              let seviceList = await transactionModel.aggregation("medi_health_provider_services",[
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
              let seviceList = await transactionModel.aggregation("medi_health_provider_services",[
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


          let numReceipts = await transactionModel.countCollection("medi_in_network_transaction_receipt", {in_network_transaction_id: trans.in_network_transaction_id});

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
              findHead = await transactionModel.getOne(
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
              let tempSub = await transactionModel.getOne("medi_member_covered_dependents", {
                  member_id: customer.member_id
              });

              let tempAccount = await transactionModel.getOne("medi_members", {member_id: tempSub.owner_id});
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
      let docs = await transactionModel.getMany('medi_out_of_network_files', { out_of_network_id: out_networks[e].out_of_network_transaction_id } );
      let status_text = null;
      let doc_files = new Array();
      let member = await transactionModel.getOne('medi_members', { member_id: out_networks[e].member_id });

      // for(var d = 0; d < docs.length; d++) {
      //     let file = new Object();
      //     file.out_of_network_file_id = docs[d].out_of_network_file_id;
      //     file.out_of_network_file_id = docs[d].out_of_network_id;
      //     file.file_type = docs[d].file_type;

      //     if(docs[d].file_type == "pdf" || docs[d].file_type == "xls" || docs[d].file_type == "xlsx") {
      //         file.file_url = await eClaimHelper.getPresignedUrl(docs[d].file_name);
      //     } else {
      //         file.file_url = docs[d].file_name;
      //     }

      //     doc_files.push(file);
      // }

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
      // e_claim_data.files = out_networks[e].doc_files;
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
    in_network_transactions: transactionDetails,
    out_of_network_transactions: outOfNetworkTransactionDetails
  });
}

const getInNetworkDetails = async(req, res, next) => {
	if(!req.query.transaction_id) {
		return res.status(400).json({ status: false, message: 'Transactiom ID is required.' });
	}

	let id = parseInt(req.query.transaction_id.replace(/[^0-9\.]/g, ''), 10);
	let totalCredits = 0;
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
  let in_network_spent = 0;

    var trans = await transactionModel.getOne("medi_member_in_network_transactions",{in_network_transaction_id: id});
    
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

                logsLitePlan = await transactionModel.getOne("medi_member_wallet_history",{
                    id: trans.in_network_transaction_id,
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
                logsLitePlan = await transactionModel.getOne("medi_member_wallet_history",{
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

        let imageReceipts = await transactionModel.getMany("medi_in_network_transaction_receipt", {in_network_transaction_id: trans.in_network_transaction_id});
        let clinic = await transactionModel.getOne("medi_health_providers", {
            health_provider_id: trans.provider_id
        });
        let clinicType = await transactionModel.getOne("medi_health_provider_types", {health_provider_type_id: clinic.provider_type_ids[0]});
        let customer = await transactionModel.getOne("medi_members", {member_id: trans.member_id});
        // console.log('clinic', clinic);
        let procedureTemp = "";
        let services = "";

        if((trans.procedure_ids).length > 0)
        {
        
            let seviceList = await transactionModel.aggregation("medi_health_provider_services",[
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
            let seviceList = await transactionModel.aggregation("medi_health_provider_services",[
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


        let numReceipts = await transactionModel.countCollection("medi_in_network_transaction_receipt", {in_network_transaction_id: trans.in_network_transaction_id});

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
            findHead = await transactionModel.getOne(
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
            let tempSub = await transactionModel.getOne("medi_member_covered_dependents", {
                member_id: customer.member_id
            });

            let tempAccount = await transactionModel.getOne("medi_members", {member_id: tempSub.owner_id});
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
        return res.json({
        	status: true,
        	data: {
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
        	}
      	});
    } else {
    	return res.status(404).json({ status: false, message: 'Transaction does not exist.' });
    }

	return res.json(id);
}

const getOutNetworkDetails = async(req, res, next) => {
	if(!req.query.transaction_id) {
		return res.status(400).json({ status: false, message: 'Transaction ID is required.' });
	}

	let e_claim_id = parseInt(req.query.transaction_id.replace(/[^0-9\.]/g, ''), 10);

	let e_claim = await transactionModel.getOne('medi_out_of_network_transactions', { out_of_network_transaction_id: e_claim_id })
	console.log('e_claim', e_claim)
	if(!e_claim) {
		return res.status(400).json({ status: false, message: 'Out-of-Network does not exist.' });
	}

	let e_claim_data = new Object();
	let id = "MN" + (e_claim.out_of_network_transaction_id.toString()).padStart(6,0);
	let docs = await transactionModel.getMany('medi_out_of_network_files', { out_of_network_id: e_claim.out_of_network_transaction_id } );
	let status_text = null;
	let doc_files = new Array();
	let member = await transactionModel.getOne('medi_members', { member_id: e_claim.member_id });

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

	if(e_claim.claim_status == 0) {
	    status_text = 'Pending';
	} else if(e_claim.claim_status == 1) {
	    status_text = 'Approved';
	} else if(e_claim.claim_status == 2) {
	    status_text = 'Rejected';
	} else {
	    status_text = 'Pending';
	}

	e_claim_data.transaction_id = id;
	e_claim_data.member = member.fullname;
	e_claim_data.merchant = e_claim.provider;
	e_claim_data.service = e_claim.claim_type;
	e_claim_data.amount = e_claim.claim_amount;
	e_claim_data.visit_date = e_claim.visit_date;
	e_claim_data.claim_date = e_claim.created_at;
	e_claim_data.time = e_claim.visit_time;
	e_claim_data.files = doc_files;
	e_claim_data.rejected_reason = e_claim.status_reason;
	e_claim_data.rejected_date = e_claim.status_date != "Invalid date" ? e_claim.status_date : null;
	e_claim_data.spending_type = e_claim.spending_type;
	e_claim_data.approved_date = e_claim.status_date != "Invalid date" ? e_claim.status_date : null;
	e_claim_data.remarks = e_claim.status_reason;
	e_claim_data.status = e_claim.claim_status;
	e_claim_data.status_text = status_text;

	return res.json({ status: true, data: e_claim_data });
}

module.exports = {
	getInNetworkTransactions,
	getInNetworkDetails,
	getOutNetworkDetails
}
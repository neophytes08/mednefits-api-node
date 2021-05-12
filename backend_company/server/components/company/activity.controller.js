require('express-async-errors');
require('dotenv').config();
const fs = require('fs');
const APPPATH = require('app-root-path');
const validate = require('./company.validator');
const config = require(`${APPPATH}/config/config`);
const sha256 = require('sha256');
const moment = require('moment');
const { map } = require('p-iteration');
const companyModel = require('./company.model');
const ucfirst = require('ucfirst');
const format = require('format-number');
const PlanHelper = require(`${APPPATH}/server/helpers/plan.helper.js`);
const clinicHelper = require(`${APPPATH}/server/helpers/clinic.helper.js`);
const eClaimHelper = require(`${APPPATH}/server/helpers/e_claim.helper.js`);
const _ = require('lodash');
const ucwords = require('ucwords');
// const getHrActivity = async (req, res, next) => {

// 	let data = req.body;
// 	let startDate = moment(new Date()).format("YYYY-MM-DD");
// 	let endDate = SpendingInvoiceLibrary.getEndDate(data.end);
// 	let spendingType = data.spending_type || "medical";
// 	let paginate = new Array();

// 	let transactionDetails = new Array();
// 	let customerId = data.customer_id;
// 	let eClaim = null;
// 	let member = null;
// 	let eClaimResultStatus = false;
// 	let docFiles = new Array();
// 	let eClaimReceiptStatus = false;
// 	let id = null;
// 	// let paginate = new Object();

// 	// $input = Input::all();
// 	// $start = date('Y-m-d', strtotime($input['start']));
// 	// $end = SpendingInvoiceLibrary::getEndDate($input['end']);
// 	// $spending_type = isset($input['spending_type']) ? $input['spending_type'] : 'medical';
// 	// $paginate = [];

// 	// $session = self::checkSession();
// 	// $e_claim = [];
// 	// $transaction_details = [];

// 	let inNetworkSpent = 0;
// 	let eClaimSpent = 0;
// 	let eClaimPending = 0;
// 	let healthScreeningBreakdown = 0;
// 	let generalPractitionerBreakdown = 0;
// 	let dentalCareBreakdown = 0;
// 	let tcmBreakdown = 0;
// 	let healthSpecialistBreakdown = 0;
// 	let wellnessBreakdown = 0;
// 	let allocation = 0;
// 	let totalCredits = 0;
// 	let totalCash = 0;
// 	let deletedEmployeeAllocation = 0;
// 	let deletedTransactionCash = 0;
// 	let deletedTransactionCredits = 0;
// 	let totalEClaimSpent = 0;

// 	let totalInNetworkTransactions = 0;
// 	let totalDeletedInNetworkTransactions = 0;
// 	let totalSearchCash = 0;
// 	let totalSearchCredits = 0;
// 	let totalInNetworkSpent = 0;
// 	let totalDeductedAllocation = 0;
// 	let breakDownCalculation = 0;

// 	let totalCreditsTransactions = 0;
// 	let totalCashTransactions = 0;
// 	let totalCreditsTransactionsDeleted = 0;
// 	let totalCashTransactionsDeleted = 0;

// 	let totalnNetworkSpentCreditsTransaction = 0;
// 	let totalInNetworkSpentCashTransaction = 0;
// 	let totalLitePlanConsultation = 0;
// 	let litePlan = false;
// 	let totalInNetworkSpentCreditsTransaction = 0;
// 	let refundText = "";

//     //     // get all hr employees, spouse and dependents
// 	// $account = DB::table('customer_link_customer_buy')->where('customer_buy_start_id', $session->customer_buy_start_id)->first();
// 	// $lite_plan = StringHelper::liteCompanyPlanStatus($session->customer_buy_start_id);
// 	// $corporate_members = DB::table('corporate_members')
// 	// ->where('corporate_id', $account->corporate_id)
// 	// ->paginate(10);

// 	let corporateMembersContainer = await companyModel.getItemEqual({
// 		table: "medi_company_members",
// 		conditions: {
// 			whereField: "customer_id",
// 			whereValue: customerId
// 		}
// 	});

// 	// $paginate['current_page'] = $corporate_members->getCurrentPage();
// 	// $paginate['from'] = $corporate_members->getFrom();
// 	// $paginate['last_page'] = $corporate_members->getLastPage();
// 	// $paginate['per_page'] = $corporate_members->getPerPage();
// 	// $paginate['to'] = $corporate_members->getTo();
// 	// $paginate['total'] = $corporate_members->getTotal();

// 	// if($spending_type == 'medical') {
// 	// 	$table_wallet_history = 'wallet_history';
// 	// } else {
// 	// 	$table_wallet_history = 'wellness_wallet_history';
// 	// }

// 	let ids = null;
// 	let transactionId = "";
// 	let statusText = "";
// 	let eClaimResult = null;
// 	let transactions = null;
// 	let consultationCash = false;
// 	let consultationCredits = false;
// 	let serviceCash = false;
// 	let serviceCredits = false;
// 	let logsLitePlan = null;
// 	let clinic = null;
// 	let customer = null;
// 	let clinicType = null;
// 	let procedureTemp = "";
// 	let serviceLists = null;
// 	let clinicName = null;

// 	let receiptData = null;
// 	let receiptStatus = null;
// 	let receiptData = null;
// 	let healthProviderStatus = false;
// 	let type = "";
// 	let findHead = null;

// 	let tempSub = null;
// 	let tempAccount = null;
// 	let subAccount = null;
// 	let subAccountType = null;
// 	let ownerId = null;
// 	let paymentType = "";
// 	let transactionType = "";
// 	let cash = 0;
// 	let bankAccountNumber = 0;
// 	let bankName = 0;
// 	let bankCode = 0;
// 	let bankBrh = 0;
// 	let docs = null;

// 	await map(corporateMembersContainer.Items, async memberElement => {
// 		memberElement = memberElement.attrs;
// 		ids = await StringHelper.getSubAccountsID(memberElement.member_id);

// 		eClaimResult = await companyModel.getItemEqual({
// 			table: "medi_out_of_network",
// 			conditions: [
// 				{
// 					in: {
// 						whereField: "member_id",
// 						whereValue: ids
// 					}
// 				},{
// 					whereField: "spending_type",
// 					whereValue: spendingType
// 				},{
// 					between: {
// 						whereField: "created_at",
// 						whereValue1: moment(new Date(startDate)).format("z"),
// 						whereValue2: moment(new Date(endDate)).format("z")
// 					}
// 				},{
// 					whereField: "claim_status",
// 					whereValue: 1
// 				}
// 			],
// 			descending: true
// 		});

// 		transactions = await companyModel.getItemEqual({
// 			table: "medi_in_network_transaction_history",
// 			conditions: [
// 				{
// 					in: {
// 						whereField: "member_id",
// 						whereValue: ids
// 					}
// 				},{
// 					whereField: "spending_type",
// 					whereValue: spendingType
// 				},{
// 					whereField: "paid_status",
// 					whereValue: 1
// 				},{
// 					between: {
// 						whereField: "created_at",
// 						whereValue1: moment(new Date(startDate)).format("z"),
// 						whereValue2: moment(new Date(endDate)).format("z")
// 					}
// 				}
// 			],
// 			descending: true
// 		});

// 		await map(transactions, async transactionsElement => {
// 			transactionsElement = transactionsElement.attrs;
// 			consultationCash = false;
// 			consultationCredits = false;
// 			serviceCash = false;
// 			serviceCredits = false;

// 			if(parseInt(transactionsElement.deleted) == 0)
// 			{
// 				inNetworkSpent = inNetworkSpent + parseFloat(transactionsElement.credit_cost);
// 				totalInNetworkTransactions = totalInNetworkTransactions + 1;

// 				if(parseInt(transactionsElement.lite_plan_enabled) == 1)
// 				{
// 					logsLitePlan = await companyModel.getItemEqual({
// 						table: "medi_member_wallet_history",
// 						conditions: [
// 							{
// 								whereField: "wallet_type",
// 								whereValue: (spendingType == "medical" ? "medical" : "wellness")
// 							},
// 							{
// 								whereField: "type",
// 								whereValue: "deducted_from_mobile_payment"
// 							},
// 							{
// 								whereField: "lite_plan_enabled",
// 								whereValue: 1
// 							}
// 						],
// 						limit: 1
// 					});

// 					if(logsLitePlan.Count > 0 && parseFloat(transactionsElement.credit_cost) > 0 && parseFloat(transactionsElement.lite_plan_use_credits) == 0)
// 					{
// 						inNetworkSpent = inNetworkSpent + parseFloat(logsLitePlan.credit);
// 						consultationCredits = true;
// 						serviceCredits = true;
// 						totalLitePlanConsultation = totalLitePlanConsultation + parseFloat(logsLitePlan.credit);
// 					}
// 					else if(logsLitePlan.Count > 0 && parseFloat(transactionsElement.procedure_cost) >= 0 && parseFloat(transactionsElement.lite_plan_use_credits) == 1)
// 					{
// 						inNetworkSpent = inNetworkSpent + parseFloat(logsLitePlan.credit);
// 						consultationCredits = true;
// 						serviceCredits = true;
// 						totalLitePlanConsultation = totalLitePlanConsultation + parseFloat(logsLitePlan.credit);
// 					}
// 					else if(parseFloat(transactionsElement.credit_cost) > 0 && parseFloat(transactionsElement.lite_plan_use_credits) == 0)
// 					{
// 						totalLitePlanConsultation = totalLitePlanConsultation + transactionsElement.consultation_fees;
// 					}
// 				}
// 				else{
// 					totalDeletedInNetworkTransactions = totalDeletedInNetworkTransactions + 1;

// 					if(parseInt(transactionsElement.lite_plan_enabled) == 1)
// 					{
// 						logsLitePlan = await companyModel.getItemEqual({
// 							table: "medi_member_wallet_history",
// 							conditions: [
// 								{
// 									whereField: "wallet_type",
// 									whereValue: (spendingType == "medical" ? "medical" : "wellness")
// 								},
// 								{
// 									whereField: "type",
// 									whereValue: "deducted_from_mobile_payment"
// 								},
// 								{
// 									whereField: "lite_plan_enabled",
// 									whereValue: 1
// 								}
// 							],
// 							limit: 1
// 						});

// 						if(logsLitePlan.Count > 0 && parseFloat(transactionsElement.credit_cost) > 0 && parseFloat(transactionsElement.lite_plan_use_credits) == 0)
// 						{
// 							consultationCredits = true;
// 							serviceCredits = true;
// 						}
// 						else if(logsLitePlan.Count > 0 && parseFloat(transactionsElement.procedure_cost) >= 0 && parseFloat(transactionsElement.lite_plan_use_credits) == 1)
// 						{
// 							inNetworkSpent = inNetworkSpent + parseFloat(logsLitePlan.credit);
// 							consultationCredits = true;
// 							serviceCredits = true;
// 							totalLitePlanConsultation = totalLitePlanConsultation + parseFloat(logsLitePlan.credit);
// 						}
// 					}
// 				}
// 			}

// 			clinic = await companyModel.getItemEqual({
// 				table: "medi_health_providers",
// 				conditions: {
// 					whereField: "provider_id",
// 					whereValue: transactionsElement.provider_id
// 				},
// 				limit: 1
// 			});
// 			clinic = clinic.Items[0].attrs;

// 			clinicType = await companyModel.getItemEqual({
// 				table: "medi_health_provider_types",
// 				conditions: {
// 					in: {
// 						whereField: "provider_type_id",
// 						whereValue: transactionsElement.provider_type_ids
// 					}
// 				},
// 				limit: 1
// 			});
// 			clinicType = clinicType.Items[0].attrs;

// 			customer = await companyModel.getItemEqual({
// 				table: "medi_members",
// 				conditions: {
// 					whereField: "member_id",
// 					whereValue: transactionsElement.member_id
// 				},
// 				limit: 1
// 			});
// 			customer = customer.Items[0].attrs;
// 			procedureTemp = "";
			
// 			serviceLists = await companyModel.getItemEqual({
// 				table: "medi_health_provider_services",
// 				conditions: {
// 					in: {
// 						whereField: "provider_service_id",
// 						whereValue: transactionsElement.procedure_id
// 					}
// 				},
// 				attributes: ["service_name"]
// 			});

// 			let serviceNames = _.map(serviceLists.Items, serviceElement => {
// 				return serviceElement.attrs.service_name;
// 			});

// 			if(serviceNames.length > 1 )
// 			{
// 				clinicName = serviceNames.pop();
// 				clinicName = serviceNames.join(", ") + " and " + clinicName
// 			}

// 			receipt = await companyModel.getItemEqual({
// 				table: "medi_in_network_transaction_receipt",
// 				conditions: {
// 					in_network_transaction_id: transactionsElement.in_network_transaction_id
// 				}
// 			});
			
// 			receiptData = null;
// 			if(receipt.Count > 0)
// 			{
// 				receiptStatus = true;
// 				receiptData = receipt;
// 			}
// 			else
// 			{
// 				receiptStatus = false;
// 			}

// 			healthProviderStatus = (parseInt(transactionsElement.direct_payment) == 1 ? true : false)
// 			type = "";

// 			if(parseInt(clinicType.service_head) == 1)
// 			{
// 				if(clinicType.name == "General Practitioner")
// 				{
// 					type = "general_practitioner";
// 					if(parseInt(transactionsElement.deleted) == 0)
// 					{
// 						generalPractitionerBreakdown = generalPractitionerBreakdown + parseFloat(transactionsElement.credit_cost);
// 						if((parseInt(transactionsElement.deleted) == 0 && parseInt(transactionsElement.lite_plan_enabled) == 1 && parseInt(transactionsElement.credit_cost) > 0) || (parseInt(transactionsElement.deleted) == 0 && parseInt(transactionsElement.lite_plan_enabled) == 1 && parseFloat(transactionsElement.procedure_cost) > 0 && parseInt(transactionsElement.lite_plan_credit_use == 1))) {
// 							generalPractitionerBreakdown = generalPractitionerBreakdown + transactionsElement.consultation_fees;
// 						}
// 					}
// 				}
// 				else if(clinicType.name == "Dental Care") {
// 					type = "dental_care";
// 					if(parseInt(transactionsElement.deleted) == 0) {
// 						dentalCareBreakdown = dentalCareBreakdown + transactionsElement.credit_cost;
// 					}
// 				} 
// 				else if(clinicType.name == "Traditional Chinese Medicine") {
// 					type = "tcm";
// 					if(parseInt(transactionsElement.deleted) == 0) {
// 						tcmBreakdown = tcmBreakdown = transactionsElement.credit_cost;
// 					}
// 				} 
// 				else if(clinicType.name == "Health Screening") {
// 					type = "health_screening";
// 					if(parseInt(transactionsElement.deleted)== 0) {
// 						healthScreeningBreakdown = healthScreeningBreakdown + transactionsElement.credit_cost;
// 					}
// 				} 
// 				else if(clinicType.name == "Wellness") {
// 					type = "wellness";
// 					if(parseInt(transactionsElement.deleted) == 0) {
// 						wellnessBreakdown = wellnessBreakdown + transactionsElement.credit_cost;
// 					}
// 				} else if(clinicType.name == "Health Specialist") {
// 					type = "health_specialist";
// 					if(parseInt(transactionsElement.deleted) == 0) {
// 						healthSpecialistBreakdown = healthSpecialistBreakdown + transactionsElement.credit_cost;
// 					}
// 				}
// 			}
// 			else
// 			{
// 				findHead = await companyModel.getItemEqual({
// 					table: "medi_health_provider_types",
// 					conditions: {
// 						provider_type_id: clinicType.service_sub_id
// 					},
// 					limit: 1
// 				});
// 				findHead = findHead.Items[0].attrs;
				
// 				if(clinicType.name == "General Practitioner")
// 				{
// 					type = "general_practitioner";
// 					if(parseInt(transactionsElement.deleted) == 0)
// 					{
// 						generalPractitionerBreakdown = generalPractitionerBreakdown + parseFloat(transactionsElement.credit_cost);
// 						if((parseInt(transactionsElement.deleted) == 0 && parseInt(transactionsElement.lite_plan_enabled) == 1 && parseInt(transactionsElement.credit_cost) > 0) || (parseInt(transactionsElement.deleted) == 0 && parseInt(transactionsElement.lite_plan_enabled) == 1 && parseFloat(transactionsElement.procedure_cost) > 0 && parseInt(transactionsElement.lite_plan_credit_use == 1))) {
// 							generalPractitionerBreakdown = generalPractitionerBreakdown + transactionsElement.consultation_fees;
// 						}
// 					}
// 				}
// 				else if(clinicType.name == "Dental Care") {
// 					type = "dental_care";
// 					if(parseInt(transactionsElement.deleted) == 0) {
// 						dentalCareBreakdown = dentalCareBreakdown + transactionsElement.credit_cost;
// 					}
// 				} 
// 				else if(clinicType.name == "Traditional Chinese Medicine") {
// 					type = "tcm";
// 					if(parseInt(transactionsElement.deleted) == 0) {
// 						tcmBreakdown = tcmBreakdown = transactionsElement.credit_cost;
// 					}
// 				} 
// 				else if(clinicType.name == "Health Screening") {
// 					type = "health_screening";
// 					if(parseInt(transactionsElement.deleted)== 0) {
// 						healthScreeningBreakdown = healthScreeningBreakdown + transactionsElement.credit_cost;
// 					}
// 				} 
// 				else if(clinicType.name == "Wellness") {
// 					type = "wellness";
// 					if(parseInt(transactionsElement.deleted) == 0) {
// 						wellnessBreakdown = wellnessBreakdown + transactionsElement.credit_cost;
// 					}
// 				} else if(clinicType.name == "Health Specialist") {
// 					type = "health_specialist";
// 					if(parseInt(transactionsElement.deleted) == 0) {
// 						healthSpecialistBreakdown = healthSpecialistBreakdown + transactionsElement.credit_cost;
// 					}
// 				}
// 			}

// 			if(customer.member_type == 5 && (customer.access_type == 2 || customer.access_type == 3))
// 			{
// 				tempSub = await companyModel.getItemEqual({
// 					table: "medi_member_covered_dependents",
// 					conditions: {
// 						whereField: "member_id",
// 						whereValue: customer.member_id
// 					},
// 					limit: 1
// 				});
// 				tempSub = tempSub.Items[0].attrs;

// 				tempAccount =  await companyModel.getItemEqual({
// 					table: "medi_members",
// 					conditions: {
// 						whereField: "member_id",
// 						whereValue: tempSub.owner_id
// 					},
// 					limit: 1
// 				});
// 				tempAccount = tempAccount.Items[0].attrs;

// 				subAccount = tempAccount.fullname;
// 				subAccountType = tempSub.user_type;
// 				ownerId = tempSub.owner_id;
// 			}
// 			else
// 			{
// 				subAccount = false;
// 				subAccountType = false;
// 				ownerId = customer.member_id;
// 			}

// 			totalAmount = transactionsElement.procedure_cost;

// 			if(parseInt(transactionsElement.direct_payment) == 1)
// 			{
// 				paymentType = "Cash";
// 				transactionType = "cash"
// 				cash = transactionsElement.procedure_cost;

// 				if(parseInt(transactionsElement.deleted) == 0)
// 				{
// 					totalCash = totalCash + transactionsElement.procedure_cost;
// 				}
// 				else if(parseInt(transactionsElement.deleted) == 1)
// 				{
// 					deletedTransactionCash = deletedTransactionCash + transactionsElement.procedure_cost;
// 				}

// 				if(litePlan && parseInt(transactionsElement.lite_plan_enabled) == 1)
// 				{
// 					totalAmount = parseFloat(transactionsElement.procedure_cost) + parseFloat(transactionsElement.consultation_fees);
// 				}
// 			}
// 			else
// 			{
// 				paymentType = "Mednefits Credits";
// 				transactionType = "credits"
// 				cash = transactionsElement.procedure_cost;

// 				if(parseInt(transactionsElement.deleted) == 0)
// 				{
// 					totalCash = totalCash + transactionsElement.credit_cost;
// 				}
// 				else if(parseInt(transactionsElement.deleted) == 1)
// 				{
// 					deletedTransactionCash = deletedTransactionCash + transactionsElement.credit_cost;
// 				}

// 				if(litePlan && parseInt(transactionsElement.lite_plan_enabled) == 1)
// 				{
// 					totalAmount = parseFloat(transactionsElement.procedure_cost) + parseFloat(transactionsElement.consultation_fees);
// 				}
// 			}

// 			if(parseInt(transactionsElement.direct_payment) == 1 && parseInt(transactionsElement.deleted) == 0)
// 			{
// 				totalSearchCash = totalSearchCash + transactionsElement.procedure_cost;
// 				totalInNetworkSpentCashTransaction = totalInNetworkSpentCashTransaction + transactionsElement.procedure_cost;
// 				totalCashTransactions = totalCashTransactions + 1;

// 				if(parseInt(transactionsElement.lite_plan_enabled) == 1)
// 				{
// 					totalInNetworkSpent = parseFloat(totalInNetworkSpent) + parseFloat(transactionsElement.procedure_cost) + parseFloat(transactionsElement.consultation_fees);
// 				}
// 				else
// 				{
// 					totalInNetworkSpent = parseFloat(totalInNetworkSpent) + parseFloat(transactionsElement.procedure_cost);
// 				}
// 			}
// 			else if(parseInt(transactionsElement.credit_cost) > 0 && parseInt(transactionsElement.deleted) == 0)
// 			{
// 				if(parseInt(transactionsElement.lite_plan_enabled) == 1)
// 				{
// 					totalInNetworkSpent = totalInNetworkSpent + parseFloat(transactionsElement.credit_cost) + parseFloat(transactionsElement.consultation_fees);
// 				}
// 				else
// 				{
// 					totalInNetworkSpent = totalInNetworkSpent + parseFloat(transactionsElement.credit_cost);
// 				}

// 				totalSearchCredits = totalSearchCredits + parseFloat(transactionsElement.credit_cost);
// 				totalInNetworkSpentCreditsTransaction = totalInNetworkSpentCreditsTransaction + parseFloat(transactionsElement.credit_cost);
// 				totalCreditsTransactions = totalCreditsTransactions + 1;
// 			}

// 			refundText = "NO";

// 			if(parseInt(transactionsElement.refunded) == 1 && parseInt(transactionsElement.deleted) == 1)
// 			{
// 				statusText = "REFUNDED";
// 				refundText = "YES";
// 			}
// 			else if(parseInt(transactionsElement.refunded) == 1 && parseInt(transactionsElement.deleted) == 1)
// 			{
// 				statusText = "REMOVED";
// 				refundText = "YES";
// 			}
// 			else
// 			{
// 				statusText = false;
// 			}

// 			transactionId = ((transactionsElement.in_network_transaction_id).toString()).padStart(6,0);

// 			transactionDetails.push({
// 				clinic_name: clinic.name,
// 				clinic_image: clinic.provider_image,
// 				amount: $total_amount,
// 				procedure_cost: transactionsElement.procedure_cost,
// 				clinic_type_and_service: clinicName,
// 				procedure: procedure,
// 				date_of_transaction: moment(new Date(transactionsElement.date_of_transaction)).format("DD MM,YYYY HH:MMA"),//date('d F Y, h:ia', strtotime($trans->date_of_transaction)),
// 				member: customer.fullname,
// 				transaction_id: ((clinic.name).toUpperCase()).substr(0,3) + transactionId,
// 				trans_id: transactionsElement.out_of_network_id,
// 				receipt_status: receiptStatus,
// 				files: receiptData,
// 				health_provider_status: healthProviderStatus,
// 				user_id: transactionsElement.member_id,
// 				type: paymentType,
// 				month: moment(new Date(transactionsElement.date_of_transaction)).format("MM"),//date('M', strtotime($trans->date_of_transaction)),
// 				day: moment(new Date(transactionsElement.date_of_transaction)).format("DD"),
// 				time: moment(new Date(transactionsElement.date_of_transaction)).format("HH:MMA"),
// 				clinic_type: type,
// 				owner_account: subAccount,
// 				employee_dependent_name: subAccount || null,
// 				owner_id: ownerId,
// 				sub_account_user_type: subAccountType,
// 				co_paid: transactionsElement.co_paid_amount,
// 				refunded: (transactionsElement.refunded ? true : false),
// 				refund_text: refundText,
// 				cash: cash,
// 				status_text: statusText,
// 				spending_type: transactionsElement.spending_type,
// 				consultation: (parseInt(transactionsElement.lite_plan_enabled) == 1 ? transactionsElement.consultation_fees : "0.00"),
// 				lite_plan: (parseInt(transactionsElement.lite_plan_enabled) == 1 ? true : false),
// 				consultation_credits: consultationCredits,
// 				service_credits: serviceCredits,
// 				transaction_type: transactionType,
// 				logs_lite_plan: logsLitePlan || null
// 			});
// 		});

// 		await map(eClaimResult.Items, async eClaimElement => {
// 			eClaimElement = eClaimElement.attrs;

// 			if(parseInt(eClaimElement.claim_status) == 0)
// 			{
// 				statusText = "Pending";
// 				eClaimPending = eClaimPending + parseFloat(eClaimElement.claim_amount);
// 			}
// 			else if(parseInt(eClaimElement.claim_status) == 1)
// 			{
// 				statusText = "Approved";
// 				eClaimSpent = eClaimSpent + parseFloat(eClaimElement.claim_amount);
// 				totalEClaimSpent = totalEClaimSpent + parseFloat(eClaimElement.claim_amount);
// 			}
// 			else if(parseInt(eClaimElement.claim_status) == 2)
// 			{
// 				statusText = "Rejected";
// 			}
// 			else
// 			{
// 				statusText = "Pending";
// 			}

// 			if(parseInt(eClaimElement.claim_status) == 1)
// 			{
// 				member = await companyModel.getItemPartition({
// 					table: "medi_members",
// 					indexValue: eClaimElement.member_id,
// 					limit: 1
// 				});
// 				member = member.Items[0].attrs;

// 				if(parseInt(member.member_type) == 5 && (parseInt(member.account_type) == 2 || parseInt(member.access_type) == 3))
// 				{
// 					tempSub = await companyModel.getItemEqual({
// 						table: "medi_member_covered_dependents",
// 						conditions: {
// 							whereField: "member_id",
// 							whereValue: member.member_id
// 						},
// 						limit: 1
// 					});
// 					tempSub = tempSub.Items[0].attrs;

// 					tempAccount = companyModel.getItemEqual({
// 						table: "medi_members",
// 						conditions: {
// 							whereField: "member_id",
// 							whereValue: tempSub.owner_id
// 						},
// 						limit: 1
// 					});
// 					tempAccount = tempAccount.Items[0].attrs;

// 					subAccount = ucfirst(tempAccount.fullname);
// 					subAccountType = tempSub.user_type;
// 					ownerId = tempSub.owner_id;
// 					bankAccountNumber = tempAccount.bank_account_number;
// 					bankName = tempAccount.bank_name;
// 					bankCode = tempAccount.bank_code;
// 					bankBrh = tempAccount.bank_brh;
// 				}
// 				else
// 				{
// 					subAccount = false;
// 					subAccountType = false;
// 					ownerId = member.member_id;
// 					bankAccountNumber = member.bank_account_number;
// 					bankName = member.bank_name;
// 					bankCode = member.bank_code;
// 					bankBrh = member.bank_brh;
// 				}

// 				docs = await companyModel.getItemEqual({
// 					table: "medi_out_of_network_files",
// 					conditions: {
// 						whereField: "out_of_network_id",
// 						whereValue: eClaimElement.out_of_network_id
// 					}
// 				});

// 				if(docs.Count > 0)
// 				{
// 					eClaimResultStatus = true;
// 					docFiles = new Array();

// 					await map(docs.Items, async docsElement => {
// 						docsElement = docsElement.attrs;

// 						if(docsElement.file_type == "pdf" || docsElement.file_type == "xls" || docsElement.file_type == "xlsx")
// 						{
// 							fil = `${APPPATH}/views/uploads/receipts/${docsElement.file_name}`;
// 						}
// 						else if(docsElement.file_type == "image")
// 						{
// 							fil = docsElement.file_name;
// 						}

// 						docFiles.push({
// 							e_claim_doc_id: docsElement.out_of_network_file_id,
// 							e_claim_id: docsElement.out_of_network_id,
// 							file: fil,
// 							file_type: docsElement.file_type
// 						})
// 					})
// 				}
// 				else
// 				{
// 					eClaimReceiptStatus = false;
// 					docFiles = false;
// 				}

// 				id = ((eClaimElement.out_of_network_id).toString()).padStart(6,0);

// 				eClaim.push({
// 					status: eClaimResult.claim_status,
// 					status_text: statusText,
// 					claim_date: moment(new Date(eClaimResult.created_at)).format("DD MM, YYYY HH:MMA"),
// 					approved_date: moment(new Date(eClaimResult.approved_date)).format("DD MM, YYYY"),
// 					time: eClaimElement.visite_time,
// 					service: eClaimElement.claim_amount,
// 					merchant: eClaimElement.claim_tyoe,
// 					amount: eClaimElement.claim_amount,
// 					member: ucfirst(member.fullname),
// 					type: 'E-Claim',
// 					transaction_id: 'MNF' + id,
// 					visit_date: moment(new Date(eClaimElement.visit_date)).format("DD MMMM, YYYY") + eClaimElement.visite_time,
// 					owner_id: ownerId,
// 					sub_account_type: subAccountType,
// 					sub_account: subAccount,
// 					employee_dependent_name: (subAccount ? subAccount : null),
// 					month: moment(new Date(eClaimResult.approved_date)).format("MM"),
// 					day: moment(new Date(eClaimResult.approved_date)).format("DD"),
// 					time: moment(new Date(eClaimResult.approved_date)).format("hh:mmA"),
// 					receipt_status: eClaimReceiptStatus,
// 					files: docFiles,
// 					spending_type: ucfirst(eClaimResult.spending_type),
// 					bank_account_number: bankAccountNumber,
// 					bank_name: bankName,
// 					bank_code: bankCode,
// 					bank_brh: bankBrh,
// 					nric: member.nric
// 				});
// 			}

// 		})
// 	});

// 	let totalSpent = eClaimSpent + inNetworkSpent; 

// 	paginate.data = {
// 		total_spent: format(totalSpent, {noSeparator: true}),// number_format($total_spent, 2),
// 		total_spent_format_number: totalSpent,//$total_spent,
// 		in_network_spent: format(inNetworkSpent, {noSeparator: true}),// number_format($in_network_spent, 2),
// 		e_claim_spent: format(eClaimSpent, {noSeparator: true}),// number_format($e_claim_spent, 2),
// 		in_network_transactions: transactionDetails,// $transaction_details,
// 		in_network_spending_format_number: inNetworkSpent,// $in_network_spent,
// 		e_claim_spending_format_number: totalEClaimSpent,// $total_e_claim_spent,
// 		e_claim_transactions: eClaim,// $e_claim,
// 		total_in_network_spent: format(totalInNetworkSpent, {noSeparator: true}),// number_format($total_in_network_spent, 2),
// 		total_in_network_spent_format_number: totalInNetworkSpent,
// 		total_lite_plan_consultation:  totalLitePlanConsultation,
// 		total_in_network_transactions: totalInNetworkTransactions,
// 		spending_type: spendingType,
// 		lite_plan: litePlan
// 	}
	
// 	return paginate;
// }

// const getActivityOutNetworkTransactions = async (req, res, next) => {

// 	let data = req.body;
// 	let startDate = moment(new Date(data.start)).format("YYYY-MM-DD");
// 	let endDate = moment(new Date(data.endDate)).format("YYYY-MM-DD");
// 	let customerId = data.customer_id;

// 	let spendingType = data.spending_type || "medical";
// 	let eClaim = new Array();
// 	let paginate = new Object();
// 	let userId = data.user_id;
// 	let userIds = null;
// 	let eClaimResult = null;
// 	let statusText = "";
// 	let dependentRelationship = "";
// 	let ownerId = null;
// 	let docs = null;

// 	let tempSub = null;
// 	let tempAccount = null;
// 	let subAccount = null;
// 	let subAccountType = null;
	
// 	let account = await companyModel.getItemPartition({
// 		table: "medi_customer_purchase",
// 		indexValue: customerId,
// 		limit: 1
// 	});
// 	account = account.Items[0].attrs;

	
// 	if(userId == "" || userId.length > 0)
// 	{
// 		let corporateContainer = await companyModel.getItemEqual({
// 			table: "medi_company_members",
// 			conditions: {
// 				whereField: "customer_id",
// 				whereValue: account.customer_id
// 			},
// 			attributes: ["member_id"]
// 		});

// 		if(corporateContainer.Count > 0)
// 		{
// 			let corporateIds = _.uniqBy(corporateContainer.Items, function (item) {
// 				return item.attrs.member_id;
// 			});

// 			eClaimResult = await companyModel({
// 				table: "medi_out_of_network",
// 				conditions: [
// 					{
// 						in: {
// 							whereField: "member_id",
// 							whereValue: corporateIds
// 						}
// 					},
// 					{
// 						whereField: "spending_type",
// 						whereValue: spendingType
// 					},
// 					{
// 						whereField: "claim_status",
// 						whereValue: 1
// 					},
// 					{
// 						between: {
// 							whereField: "created_at",
// 							whereValue1: moment(new Date(startDate)).format("z"),
// 							whereValue2: moment(new Date(endDate)).format("z")
// 						}
// 					}
// 				],
// 				descending: true
// 			});
// 		}
// 	}
// 	else
// 	{
// 		let corporateIds = await PlanHelper.getCompanyMemberIds(customerId, res);

// 		if(corporateIds.length > 0)
// 		{
// 			eClaimResult = await companyModel({
// 				table: "medi_out_of_network",
// 				conditions: [
// 					{
// 						in: {
// 							whereField: "member_id",
// 							whereValue: corporateIds
// 						}
// 					},
// 					{
// 						whereField: "spending_type",
// 						whereValue: spendingType
// 					},
// 					{
// 						whereField: "claim_status",
// 						whereValue: 1
// 					},
// 					{
// 						between: {
// 							whereField: "created_at",
// 							whereValue1: moment(new Date(startDate)).format("z"),
// 							whereValue2: moment(new Date(endDate)).format("z")
// 						}
// 					}
// 				],
// 				descending: true
// 			});
// 		}
// 	}
	
// 	paginate['current_page'] = $e_claim_result->getCurrentPage();
// 	paginate['from'] = $e_claim_result->getFrom();
// 	paginate['last_page'] = $e_claim_result->getLastPage();
// 	paginate['per_page'] = $e_claim_result->getPerPage();
// 	paginate['to'] = $e_claim_result->getTo();
// 	paginate['total'] = $e_claim_result->getTotal();

// 	await map(eClaimResult, async eClaimElement => {
// 		eClaimElement = eClaimElement.attrs;

// 		if(parseInt(eClaimElement.claim_status) == 0)
// 		{
// 			statusText = "Pending";
// 		}
// 		else if(parseInt(eClaimElement.claim_status) == 1)
// 		{
// 			statusText = "Approved";
// 		}
// 		else if(parseInt(eClaimElement.claim_status) == 2)
// 		{
// 			statusText = "Rejected";
// 		}
// 		else
// 		{
// 			statusText = "Pending";
// 		}
		
// 		if(parseInt(eClaimElement.claim_status) == 1)
// 		{
// 			member = await companyModel.getItemEqual({
// 				table: "medi_members",
// 				conditions: {
// 						whereField: "member_id",
// 						whereValue: eClaimElement.member_id
// 				},
// 				limit: 1
// 			});
// 			member = member.Items[0].attrs;

			
// 			if(member.member_type == 5 && (member.access_type == 2 || member.access_type == 3))
// 			{
// 				tempSub = await companyModel.getItemEqual({
// 					table: "medi_member_covered_dependents",
// 					conditions: {
// 						whereField: "member_id",
// 						whereValue: member.member_id
// 					},
// 					limit: 1
// 				});
// 				tempSub = tempSub.Items[0].attrs;

// 				tempAccount =  await companyModel.getItemEqual({
// 					table: "medi_members",
// 					conditions: {
// 						whereField: "member_id",
// 						whereValue: tempSub.owner_id
// 					},
// 					limit: 1
// 				});
// 				tempAccount = tempAccount.Items[0].attrs;

// 				subAccount = ucfirst(tempAccount.fullname);
// 				subAccountType = tempSub.user_type;
// 				ownerId = tempSub.owner_id;
// 				dependentRelationship = tempSub.relationship ? ucfirst(tempSub.relationship) : "Dependent";
// 			}
// 			else
// 			{
// 				subAccount = false;
// 				subAccountType = false;
// 				ownerId = customer.member_id;
// 				dependentRelationship = false;
// 			}

// 			docs = await companyModel.getItemEqual({
// 				table: "medi_out_of_network_files",
// 				conditions: {
// 					whereField: "out_of_network_id",
// 					whereValue: eClaimElement.out_of_network_id
// 				}
// 			});

			
// 			if(docs.Count > 0)
// 			{
// 				eClaimResultStatus = true;
// 				docFiles = new Array();

// 				await map(docs.Items, async docsElement => {
// 					docsElement = docsElement.attrs;

// 					if(docsElement.file_type == "pdf" || docsElement.file_type == "xls" || docsElement.file_type == "xlsx")
// 					{
// 						fil = `${APPPATH}/views/uploads/receipts/${docsElement.file_name}`;
// 					}
// 					else if(docsElement.file_type == "image")
// 					{
// 						fil = docsElement.file_name;
// 					}

// 					docFiles.push({
// 						e_claim_doc_id: docsElement.out_of_network_file_id,
// 						e_claim_id: docsElement.out_of_network_id,
// 						file: fil,
// 						file_type: docsElement.file_type
// 					})
// 				})
// 			}
// 			else
// 			{
// 				eClaimReceiptStatus = false;
// 				docFiles = false;
// 			}

// 			id = ((eClaimElement.out_of_network_id).toString()).padStart(6,0);

// 			eClaim.push({
// 				status: eClaimResult.claim_status,
// 				status_text: statusText,
// 				claim_date: moment(new Date(eClaimResult.created_at)).format("DD MM, YYYY HH:MMA"),
// 				approved_date: moment(new Date(eClaimResult.approved_date)).format("DD MM, YYYY"),
// 				time: eClaimElement.visite_time,
// 				service: eClaimElement.claim_amount,
// 				merchant: eClaimElement.claim_tyoe,
// 				amount: eClaimElement.claim_amount,
// 				member: ucfirst(member.fullname),
// 				type: 'E-Claim',
// 				transaction_id: 'MNF' + id,
// 				visit_date: moment(new Date(eClaimElement.visit_date)).format("DD MMMM, YYYY") + eClaimElement.visite_time,
// 				owner_id: ownerId,
// 				sub_account_type: subAccountType,
// 				sub_account: subAccount,
// 				employee_dependent_name: (subAccount ? subAccount : null),
// 				month: moment(new Date(eClaimResult.approved_date)).format("MM"),
// 				day: moment(new Date(eClaimResult.approved_date)).format("DD"),
// 				time: moment(new Date(eClaimResult.approved_date)).format("hh:mmA"),
// 				receipt_status: eClaimReceiptStatus,
// 				files: docFiles,
// 				spending_type: ucfirst(eClaimResult.spending_type),
// 				dependent_relationship: dependentRelationship
// 			});
// 		}
// 	})

// 	paginate['data'] = eClaim;
// 	paginate['status'] = true;

// 	return res.json({
// 		paginate: paginate
// 	});
// }

// const getActivityInNetworkTransactions = async(req, res, next) =>
// {
// 	let data = req. body;
// 	let customerId = data.customer_id;
// 	let startDate = moment(new Date(data.start)).format("YYYY-MM-DD");
// 	let endDate = moment(new Date(data.end)).format("YYYY-MM-DD");
// 	let spendingType = data.spending_type || "medical";

// 	let account = await companyModel.getItemEqual({
// 		table: "medi_customer_purchase",
// 		conditions: {
// 			whereField: "customer_id",
// 			whereValue: customerId
// 		},
// 		limit: 1
// 	});
// 	account = account.Items[0].attrs;

// 	let litePlan = false;
// 	litePlan = await StringHelper.liteCompanyPlanStatus(customerId, res);
// 	let transactionDetails = new Array();
// 	let inNetworkSpent = 0;
// 	let healthScreeningBreakdown = null;
// 	let clinic = null;
// 	let clinicType = null;
// 	let customer = null;
// 	let procedureTemp = null;
// 	let procedure = null;
// 	// $input = Input::all();
// 	// $session = self::checkSession();
// 	// $customer_id = $session->customer_buy_start_id;

// 	// $start = date('Y-m-d', strtotime($input['start']));
// 	// $end = SpendingInvoiceLibrary::getEndDate($input['end']);
// 	// $spending_type = isset($input['spending_type']) ? $input['spending_type'] : 'medical';

// 	// $account = DB::table('customer_link_customer_buy')->where('customer_buy_start_id', $customer_id)->first();
// 	// $lite_plan = false;
// 	// $lite_plan = StringHelper::liteCompanyPlanStatus($customer_id);
// 	// $transaction_details = [];
// 	// $in_network_spent = 0;
// 	// $health_screening_breakdown = 0;
// 	let generalPractitionerBreakdown = 0;
// 	let dentalCareBreakdown = 0;
// 	let tcmBreakdown = 0;
// 	let healthSpecialistBreakdown = 0;
// 	let wellnessBreakdown = 0;
// 	let allocation = 0;
// 	let totalCredits = 0;
// 	let totalCash = 0;
// 	let deletedEmployeeAllocation = 0;
// 	let deletedTransactionCash = 0;
// 	let deletedTransactionCredits = 0;

// 	let totalInNetworkTransactions = 0;
// 	let totalDeletedInNetworkTransactions = 0;
// 	let totalSearchCash = 0;
// 	let totalSearchCredits = 0;
// 	let totalInNetworkSpent = 0;
// 	let totalDeductedAllocation = 0;
// 	let breakDownCalculation = 0;

// 	let totalCreditsTransactions = 0;
// 	let totalCashTransactions = 0;
// 	let totalCreditsTransactionsDeleted = 0;
// 	let totalCashTransactionsDeleted = 0;

// 	let totalInNetworkSpentCreditsTransaction = 0;
// 	let totalInNetworkSpentCashTransaction = 0;
// 	let totalLitePlanConsultation = 0;
// 	let paginate = new Object();
// 	let transactions = null;
// 	let memberIds = null;

// 	if(data.user_id == "" || (data.user_id).length > 0)
// 	{
// 		let companyMembersContainer = await companyModel.getItemEqual({
// 			table: "medi_company_members",
// 			conditions: [
// 				{
// 					whereField: "customer_id",
// 					whereValue: account.customer_id
// 				}
// 			]
// 		});

// 		memberIds = _.uniqBy(companyMembersContainer.Items, function (item) {
// 			return item.attrs.member_id;
// 		});
// 	}
// 	else
// 	{
// 		memberIds = await PlanHelper.getCompanyMemberIds(customerId, res);
// 	}
			
// 	transactions = await companyModel.getItemPartition({
// 		table: "medi_in_network_transaction_history",
// 		secondaryIndex: true,
// 		indexName: "spendingTypeIndex",
// 		indexValue: spendingType,
// 		conditions: [
// 			[
// 				{
// 					whereField: "member_id",
// 					whereCondition: "in",
// 					whereValue: `(${memberIds.join(`,`)}`,
// 					whereAppend: "AND"
// 				},{
// 					whereField: "paid_status",
// 					whereValue: 1,
// 					whereAppend: "AND"
// 				},
// 				{
// 					whereField: "transaction_made",
// 					whereCondition: "between",
// 					whereValue: `${moment(new Date(startDate)).format(`YYYY-MM-DD`)} AND  ${moment(new Date(endDate)).format(`YYYY-MM-DD`)}`,
// 				}
// 			]
// 		],
// 		descending: true
// 	});

// 	// if(!empty($input['user_id']) && $input['user_id'] != null) {
// 	// 	$transactions = DB::table('corporate_members')
// 	// 	->join('transaction_history', 'transaction_history.UserID', '=', 'corporate_members.user_id')
// 	// 	->where('corporate_members.corporate_id', $account->corporate_id)
// 	// 	->where('corporate_members.user_id', $input['user_id'])
// 	// 	->where('transaction_history.spending_type', $spending_type)
// 	// 	->where('transaction_history.paid', 1)
// 	// 	->where('transaction_history.date_of_transaction', '>=', $start)
// 	// 	->where('transaction_history.date_of_transaction', '<=', $end)
// 	// 	->orderBy('transaction_history.date_of_transaction', 'desc')
// 	// 	->paginate($input['per_page']);
// 	// } else {
// 	// 	$user_ids = PlanHelper::getCompanyMemberIds($customer_id);
// 	// 	$transactions = DB::table('transaction_history')
// 	// 	->where('spending_type', $spending_type)
// 	// 	->whereIn('UserID', $user_ids)
// 	// 	->where('paid', 1)
// 	// 	->where('date_of_transaction', '>=', $start)
// 	// 	->where('date_of_transaction', '<=', $end)
// 	// 	->orderBy('date_of_transaction', 'desc')
// 	// 	->paginate($input['per_page']);
// 	// }

// 	paginate['current_page'] = $transactions->getCurrentPage();
// 	paginate['from'] = $transactions->getFrom();
// 	paginate['last_page'] = $transactions->getLastPage();
// 	paginate['per_page'] = $transactions->getPerPage();
// 	paginate['to'] = $transactions->getTo();
// 	paginate['total'] = $transactions->getTotal();

// 	// if($spending_type == 'medical') {
// 	// 	$table_wallet_history = 'wallet_history';
// 	// } else {
// 	// 	$table_wallet_history = 'wellness_wallet_history';
// 	// }

// 	await map(transactions.Items, async transactionElement => {
// 		transactionElement = transactionElement.attrs;

// 		if(parseFloat(transactionElement.procedure_cost) >= 0 && parseInt(transactionElement.paid_status) == 1)
// 		{
// 			if(parseInt(transactionElement.deleted) == 0)
// 			{
// 				inNetworkSpent = inNetworkSpent + parseFloat(transactionElement.credit_cost);
// 				++totalInNetworkTransactions;

// 				if(parseInt(transactionElement.lite_plan_enabled) == 1)
// 				{
// 					logsLitePlan = await companyModel.getItemPartition({
// 						table: "medi_member_wallet_history",
// 						secondaryIndex: true,
// 						indexName: "WalletTypeIndex",
// 						indexValue: spendingType,
// 						conditions: [
// 							[
// 								{
// 									whereField: "spend",
// 									whereValue: "deducted_from_mobile_payment",
// 									whereAppend: "AND"
// 								},
// 								{
// 									whereField: "id",
// 									whereValue: transactionElement.in_network_transaction_id,
// 									whereAppend: "AND"
// 								},
// 								{
// 									whereField: "lite_plan_enabled",
// 									whereValue: 1,
// 									whereAppend: "AND"
// 								}
// 							]
// 						],
// 						limit: 1
// 					});

// 					if(logsLitePlan.Count > 0 && transactionElement.credit_cost > 0 && parseInt(transactionElement.lite_plan_credit_use) == 0)
// 					{
// 						logsLitePlan = logsLitePlan.Items[0].attrs;
// 						inNetworkSpent = inNetworkSpent + parseFloat(logsLitePlan.credit);
// 						consultationCredits = true;
// 						serviceCredits = true;
// 						totalLitePlanConsultation = totalLitePlanConsultation + parseFloat(transactionElement.consultation_fees);
// 						consultation = parseFloat(logsLitePlan.credit);
// 					}
// 					else if(logsLitePlan.Count > 0 && transactionElement.procedure_cost >= 0 && parseInt(transactionElement.lite_plan_credit_use) == 1)
// 					{
// 						inNetworkSpent = inNetworkSpent + parseFloat(logsLitePlan.credit);
// 						consultationCredits = true;
// 						serviceCredits = true;
// 						totalLitePlanConsultation = totalLitePlanConsultation + parseFloat(transactionElement.consultation_fees);
// 						consultation = parseFloat(logsLitePlan.credit);
// 					}
// 					else
// 					{
// 						totalLitePlanConsultation = totalLitePlanConsultation + parseFloat(transactionElement.consultation_fees);
// 						consultation = consultation + parseFloat(transactionElement.consultation_fees);
// 					}
// 				}
// 			}
// 			else
// 			{
// 				++totalDeletedInNetworkTransactions;
// 				if( parseFloat(transactionElement.lite_plan_enabled) == 1) {

// 					logsLitePlan = await companyModel.getItemPartition({
// 						table: "medi_member_wallet_history",
// 						secondaryIndex: true,
// 						indexName: "WalletTypeIndex",
// 						indexValue: spendingType,
// 						conditions: [
// 							[
// 								{
// 									whereField: "spend",
// 									whereValue: "deducted_from_mobile_payment",
// 									whereAppend: "AND"
// 								},
// 								{
// 									whereField: "id",
// 									whereValue: transactionElement.in_network_transaction_id,
// 									whereAppend: "AND"
// 								},
// 								{
// 									whereField: "lite_plan_enabled",
// 									whereValue: 1,
// 									whereAppend: "AND"
// 								}
// 							]
// 						],
// 						limit: 1
// 					});

// 					if(logsLitePlan.Count > 0 && parseFloat(transactionElement.credit_cost) > 0 && parseInt(transactionElement.lite_plan_credit_use) === 0) {
// 						consultationCredits = true;
// 						serviceCredits = true;
// 					} else if(logsLitePlan.Count > 0 && parsreFloat(transactionElement.procedure_cost) >= 0 && parseInt(transactionElement.lite_plan_credit_use) === 1){
// 						consultationCredits = true;
// 						serviceCredits = true;
// 					}
// 				}
// 			}

// 			clinic = await companyModel.getItemPartition({
// 				table: "medi_health_providers",
// 				indexValue: transactionElement.provider_id,
// 				limit: 1
// 			});
// 			clinic = clinic.Items[0].attrs;

// 			clinicType = await companyModel.getItemPartition({
// 				table: "medi_health_provider_types",
// 				indexValue: "provider_type_id",
// 				limit: 1
// 			});
// 			clinicType = clinicType.Items[0].attrs;

// 			customer = await companyModel.getItemPartition({
// 				table: "medi_members",
// 				indexValue: transactionElement.member_id,
// 				limit: 1
// 			});
// 			customer = customer.Items[0].attrs;
// 			procedureTemp = "";
// 			procedure = "";

// 			if((transactionElement.procedure_id).length > 0)
// 			{
// 				let serviceLists = await companyModel.getItemEqual({
// 					table: "medi_health_provider_services",
// 					conditions: {
// 						in: {
// 							whereField: "provider_service_id",
// 							whereValue: transactionElement.procedure_id
// 						}
// 					}
// 				});

// 				clinicName = serviceLists.pop();
// 				clinicName = serviceLists.join(", ") + " and " + clinicName
// 			}
// 			else
// 			{
// 				let serviceLists = await companyModel.getItemEqual({
// 					table: "medi_health_provider_services",
// 					conditions: {
// 						in: {
// 							whereField: "provider_service_id",
// 							whereValue: transactionElement.procedure_id
// 						}
// 					},
// 					limit: 1
// 				});

// 				if(serviceLists.Count > 0)
// 				{
// 					serviceLists = serviceLists.Items[0].attrs;
// 					clinicName = ucfirst(clinicType.name) + " - " + clinicName;
// 				}
// 				else
// 				{
// 					clinicName = ucfirst(clinicType.name);
// 				}
// 			}		

// 			let receipts = await companyModel.getItemPartition({
// 				table: "medi_in_network_transaction_receipt",
// 				secondaryIndex: true,
// 				indexName: "InNetworkTransactionIdIndex",
// 				indexValue: transactionElement.in_network_transaction_id
// 			});

// 			docFiles = new Array();
			
// 			if(receipts.Count > 0)
// 			{
// 				await map(receipts, async receiptElement => {
// 					if(receiptElement.file_type == "pdf" || receiptElement.file_type == "xls" || receiptElement.file_type == "xlsx")
// 					{
// 						fil = EClaimHelper.createPreSignedUrl(receiptElement.file_name);
// 					}
// 					else if(receiptElement.file_type == "image")
// 					{
// 						fil = FileHelper.formatImageAutoQualityCustomer(receiptElement.file_name, 40);
// 					}

// 					docFiles.push({
// 						tranasaction_doc_id: receiptElement.transaction_receipt_id,
// 						transaction_id: receiptElement.in_network_transaction_id,
// 						file: fil,
// 						file_type: receiptElement.file_type
// 					});
// 				});
// 				receiptStatus = true;
// 			}
// 			else
// 			{
// 				receiptStatus = false;
// 			}


// 			healthSpecialistBreakdown = ((parseInt(transactionElement.direct_payment) == 1) ? true : false);
// 			type = "";

// 			if(parseInt(clinicType.service_head) == 1)
// 			{
// 				if(clinicType.name == "General Practitioner")
// 				{
// 					type = "general_practitioner";
// 					if(parseInt(transactionElement.deleted) == 0)
// 					{
// 						generalPractitionerBreakdown += transactionElement.credit_cost;
// 						if(parseInt(transactionElement.deleted) == 0 && parseInt(transactionElement.lite_plan_enabled) == 1 && (parseFloat(transactionElement.credit_cost) > 0  || (parseFloat(transactionElement.procedure_cost) > 0 && transactionElement.lite_plan_credit_use == 1) )) 
// 						{
// 							generalPractitionerBreakdown += parseFloat(transactionElement.consultation_fees);
// 						}
// 					}
// 				}
// 				else if(clinicType.name == "Dental Care") {
// 					type = "dental_care";
// 					if(parseInt(transactionsElement.deleted) == 0) {
// 						dentalCareBreakdown = dentalCareBreakdown + transactionsElement.credit_cost;
// 					}
// 				} 
// 				else if(clinicType.name == "Traditional Chinese Medicine") {
// 					type = "tcm";
// 					if(parseInt(transactionsElement.deleted) == 0) {
// 						tcmBreakdown = tcmBreakdown = transactionsElement.credit_cost;
// 					}
// 				} 
// 				else if(clinicType.name == "Health Screening") {
// 					type = "health_screening";
// 					if(parseInt(transactionsElement.deleted)== 0) {
// 						healthScreeningBreakdown = healthScreeningBreakdown + transactionsElement.credit_cost;
// 					}
// 				} 
// 				else if(clinicType.name == "Wellness") {
// 					type = "wellness";
// 					if(parseInt(transactionsElement.deleted) == 0) {
// 						wellnessBreakdown = wellnessBreakdown + transactionsElement.credit_cost;
// 					}
// 				} else if(clinicType.name == "Health Specialist") {
// 					type = "health_specialist";
// 					if(parseInt(transactionsElement.deleted) == 0) {
// 						healthSpecialistBreakdown = healthSpecialistBreakdown + transactionsElement.credit_cost;
// 					}
// 				}
// 			}
// 			else
// 			{
// 				findHead = await companyModel.getItemEqual({
// 					table: "medi_health_provider_types",
// 					conditions: {
// 						provider_type_id: clinicType.service_sub_id
// 					},
// 					limit: 1
// 				});
// 				findHead = findHead.Items[0].attrs;
				
// 				if(clinicType.name == "General Practitioner")
// 				{
// 					type = "general_practitioner";
// 					if(parseInt(transactionsElement.deleted) == 0)
// 					{
// 						generalPractitionerBreakdown = generalPractitionerBreakdown + parseFloat(transactionsElement.credit_cost);
// 						if((parseInt(transactionsElement.deleted) == 0 && parseInt(transactionsElement.lite_plan_enabled) == 1 && parseInt(transactionsElement.credit_cost) > 0) || (parseInt(transactionsElement.deleted) == 0 && parseInt(transactionsElement.lite_plan_enabled) == 1 && parseFloat(transactionsElement.procedure_cost) > 0 && parseInt(transactionsElement.lite_plan_credit_use == 1))) {
// 							generalPractitionerBreakdown = generalPractitionerBreakdown + transactionsElement.consultation_fees;
// 						}
// 					}
// 				}
// 				else if(clinicType.name == "Dental Care") {
// 					type = "dental_care";
// 					if(parseInt(transactionsElement.deleted) == 0) {
// 						dentalCareBreakdown = dentalCareBreakdown + transactionsElement.credit_cost;
// 					}
// 				} 
// 				else if(clinicType.name == "Traditional Chinese Medicine") {
// 					type = "tcm";
// 					if(parseInt(transactionsElement.deleted) == 0) {
// 						tcmBreakdown = tcmBreakdown = transactionsElement.credit_cost;
// 					}
// 				} 
// 				else if(clinicType.name == "Health Screening") {
// 					type = "health_screening";
// 					if(parseInt(transactionsElement.deleted)== 0) {
// 						healthScreeningBreakdown = healthScreeningBreakdown + transactionsElement.credit_cost;
// 					}
// 				} 
// 				else if(clinicType.name == "Wellness") {
// 					type = "wellness";
// 					if(parseInt(transactionsElement.deleted) == 0) {
// 						wellnessBreakdown = wellnessBreakdown + transactionsElement.credit_cost;
// 					}
// 				} else if(clinicType.name == "Health Specialist") {
// 					type = "health_specialist";
// 					if(parseInt(transactionsElement.deleted) == 0) {
// 						healthSpecialistBreakdown = healthSpecialistBreakdown + transactionsElement.credit_cost;
// 					}
// 				}
// 			}

// 			if(customer.member_type == 5 && (customer.access_type == 2 || customer.access_type == 3))
// 			{
// 				tempSub = await companyModel.getItemEqual({
// 					table: "medi_member_covered_dependents",
// 					conditions: {
// 						whereField: "member_id",
// 						whereValue: customer.member_id
// 					},
// 					limit: 1
// 				});
// 				tempSub = tempSub.Items[0].attrs;

// 				tempAccount =  await companyModel.getItemEqual({
// 					table: "medi_members",
// 					conditions: {
// 						whereField: "member_id",
// 						whereValue: tempSub.owner_id
// 					},
// 					limit: 1
// 				});
// 				tempAccount = tempAccount.Items[0].attrs;

// 				subAccount = tempAccount.fullname;
// 				subAccountType = tempSub.user_type;
// 				ownerId = tempSub.owner_id;
// 				dependentRelationship = tempSub.relationship ? ucfirst(tempSub.relationship) : 'Dependent';
// 			}
// 			else
// 			{
// 				subAccount = false;
// 				subAccountType = false;
// 				ownerId = customer.member_id;
// 				dependentRelationship = false;
// 			}

// 			halfCredits = false;
// 			totalAmount = format(transactionElement.procedure_cost, {noSeparator: false});

// 			if(parseInt(transactionElement.direct_payment) == 1)
// 			{
// 				paymentType = "Cash";
// 				transactionType = "cash";
// 				if(parseInt(transactionElement.lite_plan_enabled) == 1) {
// 					if(parseInt(transactionElement.half_credits) == 1) {
// 						totalAmount = transactionElement.credit_cost + transactionElement.consultation_fees;
// 						cash = transactionElement.cash_cost;
// 					} else {
// 						totalAmount = transactionElement.procedure_cost + transactionElement.consultation_fees;
// 						cash = transactionElement.procedure_cost;
// 					}
// 				} else {
// 					if(parseInt(transactionElement.half_credits) == 1) {
// 						cash = transactionElement.cash_cost;
// 					} else {
// 						cash = transactionElement.procedure_cost;
// 					}
// 				}
// 			}
// 			else
// 			{
// 				if(transactionElement.credit_cost > 0 && transactionElement.cash_cost > 0) {
// 				  paymentType = 'Mednefits Credits + Cash';
// 				  halfCredits = true;
// 				} else {
// 				  paymentType = 'Mednefits Credits';
// 				}
// 				transactionType = "credits";
				
// 				if(parseInt(transactionElement.lite_plan_enabled) == 1) {
// 					if(parseInt(transactionElement.half_credits) == 1) {
// 						totalAmount = transactionElement.credit_cost + transactionElement.cash_cost + transactionElement.consultation_fees;
// 						cash = transactionElement.cash_cost;
// 					} else {
// 						totalAmount = transactionElement.credit_cost + transactionElement.cash_cost + transactionElement.consultation_fees;
						
// 						if(transactionElement.credit_cost > 0) {
// 							cash = 0;
// 						} else {
// 							cash = transactionElement.procedure_cost - transactionElement.consultation_fees;
// 						}
// 					}
// 				} else {
// 					totalAmount = transactionElement.procedure_cost;
// 					if(parseInt(transactionElement.half_credits) == 1) {
// 						cash = transactionElement.cash_cost;
// 					} else {
// 						if(transactionElement.credit_cost > 0) {
// 							cash = 0;
// 						} else {
// 							cash = transactionElement.procedure_cost;
// 						}
// 					}
// 				}
// 			}

// 			billAmount = 0;
			
// 			if(parseInt(transactionElement.half_credits) == 1) {
// 				if(parseInt(transactionElement.lite_plan_enabled) == 1) {
// 					if(parseInt(transactionElement.direct_payment)== 1) {
// 						billAmount = transactionElement.procedure_cost;
// 					} else {
// 						billAmount = transactionElement.procedure_cost - transactionElement.consultation_fees;
// 					}
// 				} else {
// 					billAmount = transactionElement.procedure_cost;
// 				}
// 			} else {
// 				if(parseInt(transactionElement.lite_plan_enabled) == 1) {
// 					if(parseInt(transactionElement.lite_plan_credit_use) == 1) {
// 						billAmount = transactionElement.procedure_cost;
// 					} else {
// 						if((transactionElement.direct_payment) == 1) {
// 							billAmount = transactionElement.procedure_cost;
// 						} else {
// 						billAmount = transactionElement.credit_cost + transactionElement.cash_cost;
// 						}
// 					}
// 				} else {
// 					billAmount = transactionElement.procedure_cost;
// 				}
// 			}

// 			if( parseInt(transactionElement.direct_payment) == 1 && parseInt(transactionElement.deleted) == 0) {
// 				totalSearchCash = totalSearchCash + parseFloat(transactionElement.procedure_cost);
// 				totalInNetworkSpentCashTransaction = totalInNetworkSpentCashTransaction + parseFloat(transactionElement.procedure_cost);
// 				++totalCashTransactions;
// 				if(parseInt(transactionElement.lite_plan_enabled) == 1) {
// 					totalInNetworkSpent += transactionElement.procedure_cost + transactionElement.consultation_fees;
// 				} else {
// 					totalInNetworkSpent += transactionElement.procedure_cost;
// 				}
// 			} else if(parseFloat(transactionElement.credit_cost) > 0 && parseInt(transactionElement.deleted) == 0) {
// 				if(parseInt(transactionElement.lite_plan_enabled) == 1) {
// 					totalInNetworkSpent += transactionElement.credit_cost + transactionElement.consultation_fees;
// 				} else {
// 					totalInNetworkSpent += transactionElement.credit_cost;
// 				}
// 				totalSearchCredits += transactionElement.credit_cost;
// 				totalInNetworkSpentCreditsTransaction = transactionElement.credit_cost;
// 				++totalCreditsTransactions;
// 			}

// 			refundText = "NO";

// 			if(parseInt(transactionElement.refunded) == 1 &&  parseInt(transactionElement.deleted) == 1) {
// 				statusText = 'REFUNDED';
// 				refundText = 'YES';
// 			} else if(parseInt(transactionElement.direct_payment) == 1 && parseInt(transactionElement.deleted)== 1) {
// 				statusText = 'REMOVED';
// 				refundText = 'YES';
// 			} else {
// 				statusText = false;
// 			}

// 			paidByCredits = transactionElement.credit_cost;
// 			if(parseInt(transactionElement.lite_plan_enabled) == 1) {
// 				if(consultationCredits) {
// 					paidByCredits += $consultation;
// 				}
// 			}

// 			transactionId = ((transactionsElement.in_network_transaction_id).toString()).padStart(6,0);

// 			transactionDetails.push({
// 				clinic_name: clinic.name,
// 				clinic_image: clinic.provider_image,
// 				amount: totalAmount,
// 				procedure_cost: format(billAmount, {noSeparator: false}),
// 				clinic_type_and_service: clinicName,
// 				procedure: $procedure,
// 				date_of_transaction: moment(new Date(transactionElement.date_of_transaction)).format("DD MMMM YYYY, HH:MMA"),
// 				member: ucfirst(customer.fullname),
// 				transaction_id: ((clinic.name).toUpperCase()).substr(0,3) + transactionId,
// 				trans_id: transactionElement.transaction_id,
// 				receipt_status: receiptStatus,
// 				health_provider_status: healthProviderStatus,
// 				user_id: transactionElement.member_id,
// 				type: paymentType,
// 				month: moment(new Date(transactionElement.date_of_transaction)).format("MM"),
// 				day: moment(new Date(transactionElement.date_of_transaction)).format("DD"),
// 				time: moment(new Date(transactionElement.date_of_transaction)).format("HH:MMA"),
// 				clinic_type: type,
// 				owner_account: subAccount,
// 				owner_id: ownerId,
// 				sub_account_user_type: subAccountType,
// 				co_paid: transactionElement.consultation_fees,
// 				refunded: (parseInt(transactionElement.refunded) ? true : false),
// 				refund_text: refundText,
// 				cash: cash,
// 				status_text: statusText,
// 				consultation: (parseInt(transactionElement.lite_plan_enabled) == 1 ? format(transactionElement.consultation_fees, {noSeparator: false}) : "0.00"),
// 				lite_plan: (parseInt(transactionElement.lite_plan_enabled) == 1 ? true : false),
// 				consultation_credits: consultationCredits,
// 				service_credits: serviceCredits,
// 				transaction_type: transactionType,
// 				logs_lite_plan: (logsLitePlan ? logsLitePlan : null),
// 				dependent_relationship: dependentRelationship,
// 				cap_transaction: halfCredits,
// 				cap_per_visit: format(transactionElement.cap_per_visit, {noSeparator: false}),
// 				paid_by_cash: format(transactionElement.cash_cost, {noSeparator: false}),
// 				paid_by_credits: format(paidByCredits, {noSeparator: false}),
// 				currency_symbol: (transactionElement.currency_type == "myr" ? "RM" : "S$"),
// 				files: docFiles
// 			});
// 		}
// 	});

// 	paginate['data'] = transactionDetails;
// 	paginate['status'] = true;

// 	return res.json({
// 		status: true,
// 		paginate: paginate
// 	});
// }

const _companyAllocation = async(customerCreditReset, walletType, customerID, start, end) => {
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
                        {"medi_customer_wallet_histories.created_at": { $gt: start}},
                        {"medi_customer_wallet_histories.created_at": { $lt: end}},
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

    console.log('joinResult', joinResult);

    if(joinResult.length > 0) {
        return joinResult[0].totalMWAllocation;
    }
    return false;
}


const getCompanyTotalAllocation = async (req, res, next) => {
	let data = req.query;
  isValid = await validate.joiValidate(data, validate.getAllocation, true)
  
  if(typeof isValid != 'boolean')
  {
      return res.status(400).json({
          status: false,
          message: isValid.details[0].message
      })
  }

  let customerID = parseInt(data.customer_id);
  let start = moment(data.start_date).format('YYYY-MM-DD');
  let end = moment(data.end_date).add(59, 'minutes').format('YYYY-MM-DD hh:mm:ss');

  console.log('start', start);
  console.log('end', end);
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


  let allocation = await _companyAllocation(customerCreditResetMedical, data.spending_type, customerID, start, end);
  return res.json({ status: true, allocation: allocation, spending_type: data.spending_type });
}

const getHrActivity = async (req, res, next) => {
	let data = req.query;

	if(!data.start || !data.end) {
		return res.status(400).json({ status: false, message: 'Start Date or End Date is required.' });
	}

	if(!data.spending_type) {
		return res.status(400).json({ status: false, message: 'Spending Type is required.' });
	}

	let options = {
	  page: req.query.page ? req.query.page : 1,
	  limit: req.query.limit ? req.query.limit : 10,
	};
	let customerID = parseInt(data.customer_id);
  let start = moment(data.start).format('YYYY-MM-DD');
  let end = moment(data.end).add(59, 'minutes').format('YYYY-MM-DD HH:mm:ss');
  let format = [];
  let total_balance = 0;
  let total_allocated_credits = 0;
  let totalCredits = 0;
  let total_spent = 0;
  let transactionDetails = new Array();
  let outOfNetworkTransactionDetails = new Array();
  let totalConsultation = 0;
  let inNetworkTransactions = 0;
  let consultationStatus = false;
  let mednefitsFee = 0;
  let healthProviderStatus = false;
  let litePlan = false;
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
  let members = null;

  if(data.member_id) {
  	console.log('hello paginate')
  	members = await companyModel.paginate('medi_company_members', { member_id: data.member_id }, options);
  } else {
  	members = await companyModel.paginate('medi_company_members', { customer_id: customerID }, options);
  }

  console.log('members', members);
  for(var a = 0; a < members.docs.length; a++) {
  	let id = members.docs[a].member_id;
  	let member = await companyModel.getOne('medi_members', { member_id: id });
    let wallet = await companyModel.getOne('medi_member_wallet', { member_id: id })

    // creditWallet = await PlanHelper.memberActivityAllocatedCredits(wallet.member_wallet_id, id, data.spending_type, start);
    // total_balance += creditWallet.balance;
    // total_allocated_credits += creditWallet.allocation;
    let user_ids = await companyModel.getIds('medi_member_covered_dependents', { 'owner_id': id }, 'member_id')
    user_ids.push(id);
    // get transactions in in-network
	  let in_networks = await companyModel.aggregation('medi_member_in_network_transactions',
  	[
        {
            $addFields: {
                convertedDate: { $toDate: "$date_of_transaction" }
            }
        },
        {
            $match: {
                member_id: {
                    $in: user_ids
                },
                spending_type: data.spending_type,
                date_of_transaction: {
                	$gte: start,
                	$lte: end
                }
            }
        },
        {$sort:{created_at: -1}}
      ]
	  );

	  // get transactions in out-network
	  let out_networks = await companyModel.aggregation('medi_out_of_network_transactions',
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
	              spending_type: data.spending_type,
	              created_at: {
                	$gte: start,
                	$lte: end
                }
	          }
	      },
	      {$sort:{created_at: -1}}
	    ]
	  );

	  for(var x = 0; x < in_networks.length; x++) {
	      let transaction = in_networks[x];
	      mednefitsFee = 0;
	      var trans = await companyModel.getOne("medi_member_in_network_transactions",{in_network_transaction_id: transaction.in_network_transaction_id});
	      
	      if(trans)
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

	                  logsLitePlan = await companyModel.getOne("medi_member_wallet_history",{
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
	                    litePlan = true;
	                  }
	                  else{
	                      totalConsultation = totalConsultation + parseFloat(trans.consultation_fees);
	                      in_network_spent += parseFloat(trans.consultation_fees);
	                  }
	              }
	          } else {
	              if(parseInt(trans.lite_plan_enabled) == 1) {
	                  consultationStatus = true;
	                  logsLitePlan = await companyModel.getOne("medi_member_wallet_history",{
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

	          let imageReceipts = await companyModel.getMany("medi_in_network_transaction_receipt", {in_network_transaction_id: trans.in_network_transaction_id});
	          let clinic = await companyModel.getOne("medi_health_providers", {
	              health_provider_id: trans.provider_id
	          });
	          let clinicType = await companyModel.getOne("medi_health_provider_types", {health_provider_type_id: clinic.provider_type_ids[0]});
	          let customer = await companyModel.getOne("medi_members", {member_id: trans.member_id});
	          // console.log('clinic', clinic);
	          let procedureTemp = "";
	          let services = "";

	          if((trans.procedure_ids).length > 0)
	          {
	          
	              let seviceList = await companyModel.aggregation("medi_health_provider_services",[
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
	              let seviceList = await companyModel.aggregation("medi_health_provider_services",[
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


	          let numReceipts = await companyModel.countCollection("medi_in_network_transaction_receipt", {in_network_transaction_id: trans.in_network_transaction_id});

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
	              findHead = await companyModel.getOne(
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
	              let tempSub = await companyModel.getOne("medi_member_covered_dependents", {
	                  member_id: customer.member_id
	              });

	              let tempAccount = await companyModel.getOne("medi_members", {member_id: tempSub.owner_id});
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

		for(var e = 0; e < out_networks.length; e++) {
		  let e_claim_data = new Object();
		  let id = "MN" + (out_networks[e].out_of_network_transaction_id.toString()).padStart(6,0);
		  let docs = await companyModel.getMany('medi_out_of_network_files', { out_of_network_id: out_networks[e].out_of_network_transaction_id } );
		  let status_text = null;
		  let doc_files = new Array();
		  let member = await companyModel.getOne('medi_members', { member_id: out_networks[e].member_id });

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

    user_ids = [];
  }

  delete members.data;
  let temp_data = {
  	total_consultation: totalConsultation,
  	total_spent: out_of_network_spent + in_network_spent,
  	total_in_network_spent: in_network_spent,
  	total_out_of_network: out_of_network_spent,
  	in_network_transactions: transactionDetails,
  	out_of_network_transactions: outOfNetworkTransactionDetails,
  	spending_type: data.spending_type,
  	lite_plan: litePlan,
  	current_page: members.page,
  	total: members.totalPages,
  	nextPage: members.nextPage,
  	prevPage: members.prevPage,
  	limit: members.limit

  }
  return res.json(temp_data);
}

const getActivityTransactions = async (req, res, next) => {
	let data = req.query;

	if(!data.start || !data.end) {
		return res.status(400).json({ status: false, message: 'Start Date or End Date is required.' });
	}

	if(!data.spending_type) {
		return res.status(400).json({ status: false, message: 'Spending Type is required.' });
	}

	var options = {
	  page: req.query.page ? parseInt(req.query.page) : 1,
	  limit: req.query.limit ? parseInt(req.query.limit) : 5,
	  skip: null
	};

	let skip = (options.page - 1) * options.limit;
	console.log('skip', skip)
	let customerID = parseInt(data.customer_id);
  let start = moment(data.start).format('YYYY-MM-DD');
  let end = moment(data.end).add(59, 'minutes').format('YYYY-MM-DD HH:mm:ss');
  let format = [];
  let total_balance = 0;
  let total_allocated_credits = 0;
  let totalCredits = 0;
  let total_spent = 0;
  let transactionDetails = new Array();
  let totalConsultation = 0;
  let inNetworkTransactions = 0;
  let consultationStatus = false;
  let mednefitsFee = 0;
  let healthProviderStatus = false;
  let litePlan = false;
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
  let members = null;
  let new_ids = new Array();

  isValid = await validate.joiValidate({ type: data.type }, validate.activityType, true)
   
  if(typeof isValid != 'boolean')
  {
      return res.status(400).json({
          status: false,
          message: isValid.details[0].message
      })
  }

  if(data.member_id) {
  	members = await companyModel.getIds('medi_company_members', { member_id: data.member_id }, 'member_id');
  	// members = await companyModel.paginate('medi_company_members', { member_id: data.member_id }, options);
  } else {
  	// members = await companyModel.paginate('medi_company_members', { customer_id: customerID }, options);
  	members = await companyModel.getIds('medi_company_members', { customer_id: customerID }, 'member_id');
  }

  // return res.json(members)
  for(var me = 0; me < members.length; me++) {
  	new_ids.push(members[me]);
  	let user_ids = await companyModel.getIds('medi_member_covered_dependents', { 'owner_id': members[me] }, 'member_id')
  	for(var ui = 0; ui < user_ids.length; ui++) {
    	new_ids.push(user_ids[ui]);
  	}
  }

  if(data.type == "in_network") {
	  var in_networks = await companyModel.aggregation('medi_member_in_network_transactions',
			[
	      {
	          $addFields: {
	              convertedDate: { $toDate: "$date_of_transaction" }
	          }
	      },
	      {
	          $match: {
	              member_id: {
	                  $in: new_ids
	              },
	              spending_type: data.spending_type,
	              date_of_transaction: {
	              	$gte: start,
	              	$lte: end
	              }
	          }
	      },
	      {$sort:{created_at: -1}},
	      { $facet    : {
		        metadata: [ { $count: "total" }, { $addFields: { page: options.page } } ],
		        data: [ { $skip: skip }, { $limit: options.limit } ] // add projection here wish you re-shape the docs
		    } }
	    ]
	  );
	  for(var x = 0; x < in_networks[0].data.length; x++) {
	      let transaction = in_networks[0].data[x];
	      mednefitsFee = 0;
	      var trans = await companyModel.getOne("medi_member_in_network_transactions",{in_network_transaction_id: transaction.in_network_transaction_id});
	      
	      if(trans)
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

	                  logsLitePlan = await companyModel.getOne("medi_member_wallet_history",{
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
	                    litePlan = true;
	                  }
	                  else{
	                      totalConsultation = totalConsultation + parseFloat(trans.consultation_fees);
	                      in_network_spent += parseFloat(trans.consultation_fees);
	                  }
	              }
	          } else {
	              if(parseInt(trans.lite_plan_enabled) == 1) {
	                  consultationStatus = true;
	                  logsLitePlan = await companyModel.getOne("medi_member_wallet_history",{
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

	          let imageReceipts = await companyModel.getMany("medi_in_network_transaction_receipt", {in_network_transaction_id: trans.in_network_transaction_id});
	          let clinic = await companyModel.getOne("medi_health_providers", {
	              health_provider_id: trans.provider_id
	          });
	          let clinicType = await companyModel.getOne("medi_health_provider_types", {health_provider_type_id: clinic.provider_type_ids[0]});
	          let customer = await companyModel.getOne("medi_members", {member_id: trans.member_id});
	          // console.log('clinic', clinic);
	          let procedureTemp = "";
	          let services = "";

	          if((trans.procedure_ids).length > 0)
	          {
	          
	              let seviceList = await companyModel.aggregation("medi_health_provider_services",[
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
	              let seviceList = await companyModel.aggregation("medi_health_provider_services",[
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


	          let numReceipts = await companyModel.countCollection("medi_in_network_transaction_receipt", {in_network_transaction_id: trans.in_network_transaction_id});

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
	              findHead = await companyModel.getOne(
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
	              let tempSub = await companyModel.getOne("medi_member_covered_dependents", {
	                  member_id: customer.member_id
	              });

	              let tempAccount = await companyModel.getOne("medi_members", {member_id: tempSub.owner_id});
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
  } else {
  	// // get transactions in out-network
	  var in_networks = await companyModel.aggregation('medi_out_of_network_transactions',
	    [
        {
            $addFields: {
                convertedDate: { $toDate: "$created_at" }
            }
        },
        {
            $match: {
                member_id: {
                    $in: new_ids
                },
                spending_type: data.spending_type,
                created_at: {
                	$gte: start,
                	$lte: end
                }
            }
        },
        {$sort:{created_at: -1}},
        { $facet    : {
		        metadata: [ { $count: "total" }, { $addFields: { page: options.page } } ],
		        data: [ { $skip: skip }, { $limit: options.limit } ] // add projection here wish you re-shape the docs
		    } }
      ]
	  );

	  for(var e = 0; e < in_networks[0].data.length; e++) {
			let e_claim = in_networks[0].data[e];
		  let e_claim_data = new Object();
		  let id = "MN" + (e_claim.out_of_network_transaction_id.toString()).padStart(6,0);
		  let docs = await companyModel.getMany('medi_out_of_network_files', { out_of_network_id: e_claim.out_of_network_transaction_id } );
		  let status_text = null;
		  let doc_files = new Array();
		  let member = await companyModel.getOne('medi_members', { member_id: e_claim.member_id });

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
		      out_of_network_spent += parseFloat(e_claim.claim_amount);
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
		  e_claim_data.files = e_claim.doc_files;
		  e_claim_data.rejected_reason = e_claim.status_reason;
		  e_claim_data.rejected_date = e_claim.status_date != "Invalid date" ? e_claim.status_date : null;
		  e_claim_data.spending_type = e_claim.spending_type;
		  e_claim_data.approved_date = e_claim.status_date != "Invalid date" ? e_claim.status_date : null;
		  e_claim_data.remarks = e_claim.status_reason;
		  e_claim_data.status = e_claim.claim_status;
		  e_claim_data.status_text = status_text;
		  transactionDetails.push(e_claim_data);
		}
  }
	
	  
	  // return res.json(out_networks)
	  

	

  //   user_ids = [];
  // }
  console.log(in_networks[0])
  let temp_data = {
  	transactions: transactionDetails,
  	spending_type: data.spending_type,
  	lite_plan: litePlan,
  	total: in_networks[0].metadata ? in_networks[0].metadata[0].total : 0,
  	page: in_networks[0].metadata ? in_networks[0].metadata[0].page : 1,

  }
  return res.json(temp_data);
}

module.exports = {
	getHrActivity,
	getActivityTransactions,
	// getActivityInNetworkTransactions,
	getCompanyTotalAllocation
}
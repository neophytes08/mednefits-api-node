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

module.exports = {
	// getHrActivity,
	// getActivityOutNetworkTransactions,
	// getActivityInNetworkTransactions,
	getCompanyTotalAllocation
}
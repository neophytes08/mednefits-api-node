require('express-async-errors');
require('dotenv').config();
const APPPATH = require('app-root-path');
const sql = require(`${APPPATH}/config/mysql.config`);
const moment = require('moment');
const sha256 = require('sha256');
const companyModel = require('./data_migration.model');
const global_helper = require(`${APPPATH}/server/helpers/global.helper.js`);
const unserliaze = require('locutus/php/var/unserialize');
const _ = require("underscore.string");
const setupPaginator = require('knex-paginator');
setupPaginator(sql);

const createHrMigration = async (req, res, next) => {
	if(req.body.id) {
		var customer = await sql.table("medi_customer_buy_start").where('customer_buy_start_id', req.body.id)
	} else {
		var customer = await sql.table("medi_customer_buy_start")
	}

	let x = 0, count = customer.length, format = [], done = 0;

	for(; x < count; x++) {
		// customer purchase data and check if already exist in mongoo
		let check = await companyModel.getOne('medi_customer_purchase', { customer_id: customer[x].customer_buy_start_id });
		if(!check) {
			console.log('creating customer data migration...');
			var account = await sql.table("medi_customer_link_customer_buy")
			.where("customer_buy_start_id", customer[x].customer_buy_start_id)
			.first()
			let plans = [];
			let temp = {
				customer_id: customer[x].customer_buy_start_id,
				cover_type: customer[x].cover_type == "team/corporate" ? 1 : 0,
				status: customer[x].status,
				agree_status: customer[x].agree_status == "true" ? 1 : 0,
				peak_status: customer[x].peak_status,
				wallet: customer[x].wallet,
				qr: customer[x].qr_payment,
				spending_notification: customer[x].spending_notification,
				send_account_email_date: customer[x].send_account_email_date,
				cc_emails: await unserliaze(customer[x].cc_emails),
				test_account: customer[x].test_account,
				deleted: customer[x].deleted,
				deleted_at: customer[x].deleted_at,
				spending_default_invoice_day: customer[x].spending_default_invoice_day,
				invoice_step: customer[x].invoice_step,
				unlimited_medical_credits: customer[x].unlimited_medical_credits,
				unlimited_wellness_credits: customer[x].unlimited_wellness_credits,
				medical_enable: customer[x].medical_enable,
				wellness_enable: customer[x].wellness_enable,
				access_e_claim: customer[x].access_e_claim,
				currency_type: "sgd",
				currency_value: 0,
				created_at: moment(customer[x].created_at).format("YYYY-MM-DD HH:mm:ss"),
				updated_at: moment(customer[x].updated_at).format("YYYY-MM-DD HH:mm:ss")
			}

			// save customer purchase
			await companyModel.saveOne("medi_customer_purchase", temp)
			// get company business information
			let business_information = await sql.table("medi_customer_business_information")
			.where("customer_buy_start_id", customer[x].customer_buy_start_id)
			.first()
			let business_contact = await sql.table("medi_customer_business_contact")
			.where("customer_buy_start_id", customer[x].customer_buy_start_id)
			.first()

			let contact_lists = await sql.table("medi_company_contacts")
			.where("customer_id", customer[x].customer_buy_start_id)

			for(crl = 0; crl < contact_lists.length; crl++) {
				var crl_data = {
					company_contact_id: contact_lists[crl].medi_company_contact_id,
					customer_id: contact_lists[crl].customer_id,
					first_name: contact_lists[crl].first_name,
					last_name: contact_lists[crl].last_name,
					email: contact_lists[crl].email,
					phone: contact_lists[crl].phone,
					job_title: contact_lists[crl].job_title,
					active: contact_lists[crl].active,
					send_email_communication: contact_lists[crl].send_email_communication,
					send_email_billing: contact_lists[crl].send_email_billing,
					created_at: moment(contact_lists[crl].created_at).format("YYYY-MM-DD HH:mm:ss"),
					updated_at: moment(contact_lists[crl].updated_at).format("YYYY-MM-DD HH:mm:ss")
				}

				await companyModel.saveOne("medi_company_contacts", crl_data)
			}

			let businessInformation = {
				customer_business_information_id: business_information.customer_business_information_id,
				customer_id: customer[x].customer_buy_start_id,
				company_name: business_information.company_name,
				company_address: business_information.company_address,
				nature_of_busines: business_information.nature_of_business,
				postal_code: business_information.postal_code,
				establish: business_information.establishment,
				created_at: moment(business_information.created_at).format("YYYY-MM-DD HH:mm:ss"),
				updated_at: moment(business_information.updated_at).format("YYYY-MM-DD HH:mm:ss"),
				contact: {
					first_name: business_contact.first_name,
					last_name: business_contact.last_name,
					address: business_contact.address,
					job_title: business_contact.job_title,
					email: business_contact.work_email,
					phone: business_contact.phone,
					hr_email: business_contact.hr_email,
					billing_recipient: business_contact.send_email_billing,
					send_email_billing: business_contact.send_email_billing,
					send_email_communication: business_contact.send_email_communication
				}
			}

			// save customer business information
			await companyModel.saveOne("medi_customer_business_information", businessInformation)
			let customer_billing_concact = await sql.table("medi_customer_billing_contact")
			.where("customer_buy_start_id", customer[x].customer_buy_start_id)
			.first()

			// // 
			let customerBillingContact = {
				customer_billing_contact_id: customer_billing_concact.customer_billing_contact_id,
				customer_id: customer[x].customer_buy_start_id,
				billing_name: customer_billing_concact.billing_name,
				billing_address: customer_billing_concact.billing_address,
				billing_first_name: customer_billing_concact.first_name,
				billing_last_name: customer_billing_concact.last_name,
				billing_email: customer_billing_concact.billing_email,
				billing_phone: customer_billing_concact.phone,
				billing_postal_code: customer_billing_concact.postal,
				bill_send_email_bill_related: customer_billing_concact.send_email_billing,
				bill_send_email_comm_related: customer_billing_concact.send_email_communication,
				created_at: moment(customer_billing_concact.created_at).format("YYYY-MM-DD HH:mm:ss"),
				updated_at: moment(customer_billing_concact.updated_at).format("YYYY-MM-DD HH:mm:ss"),
			}

      // save customer billing contact
      await companyModel.saveOne("medi_customer_billing_contact", customerBillingContact)

      let customer_hr_dashboard = await sql.table("medi_customer_hr_dashboard")
      .where("customer_buy_start_id", customer[x].customer_buy_start_id)
      .first()
      if(customer_hr_dashboard) {
      	let customerHRDashboard = {
      		hr_account_id: customer_hr_dashboard.hr_dashboard_id,
      		customer_id: customer[x].customer_buy_start_id,
      		email: customer_hr_dashboard.email, 
      		password: sha256('mednefits'),
      		type: 'hr',
      		reset_token: customer_hr_dashboard.remember_token,
      		active: customer_hr_dashboard.active,
      		created_at: moment(customer_hr_dashboard.created_at).format("YYYY-MM-DD HH:mm:ss"),
      		updated_at: moment(customer_hr_dashboard.updated_at).format("YYYY-MM-DD HH:mm:ss"),
      	}
      	// save customer hr account
      	await companyModel.saveOne("medi_customer_hr_accounts", customerHRDashboard)
      }
      

      // get customer plans
      let customer_plans = await sql.table("medi_customer_plan")
      .where("customer_buy_start_id", customer[x].customer_buy_start_id)
      for(var p = 0; p < customer_plans.length; p++) {

      	let plan = {
      		customer_plan_id: customer_plans[p].customer_plan_id,
      		customer_id: customer_plans[p].customer_buy_start_id,
      		plan_start: moment(customer_plans[p].plan_start).format("YYYY-MM-DD"),
      		plan_end: moment(customer_plans[p].plan_end).format("YYYY-MM-DD"),
      		account_type: customer_plans[p].account_type,
      		secondary_account_type: customer_plans[p].secondary_account_type,
      		plan_extension_enable: customer_plans[p].plan_extention_enable,
      		created_at: moment(customer_plans[p].created_at).format("YYYY-MM-DD HH:mm:ss"),
      		updated_at: moment(customer_plans[p].updated_at).format("YYYY-MM-DD HH:mm:ss"),
      	}

				// save customer plan
				await companyModel.saveOne("medi_customer_plans", plan)

				// get dependents
				let dependents = await sql.table("medi_dependent_plans")
				.where("customer_plan_id", customer_plans[p].customer_plan_id)

				for(var d = 0; d < dependents.length; d++) {
					
					let dependentPlans = {
						dependent_plan_id: dependents[d].dependent_plan_id,
						customer_plan_id: dependents[d].customer_plan_id,
						customer_id: customer_plans[p].customer_buy_start_id,
						customer_active_plan_id: dependents[d].customer_active_plan_id,
						total_dependents: dependents[d].total_dependents,
						plan_start: moment(dependents[d].plan_start).format("YYYY-MM-DD"),
						duration: dependents[d].duration,
						enable: 1,
						account_type: dependents[d].account_type,
						secondary_account_type: dependents[d].secondary_account_type || null,
						new_head_count: dependents[d].new_head_count,
						type: dependents[d].type,
						tagged_active_plan_invoice: dependents[d].tagged,
						created_at: moment(dependents[d].created_at).format("YYYY-MM-DD HH:mm:ss"),
						updated_at: moment(dependents[d].updated_at).format("YYYY-MM-DD HH:mm:ss"),
					}

          // save customer dependent plan
          await companyModel.saveOne("medi_dependent_plans", dependentPlans)

          let dependent_invoice = await sql.table("medi_dependent_invoice")
          .where("dependent_plan_id", dependents[d].dependent_plan_id)
          .first();

          
          let dependentInvoices = {
          	dependent_invoice_id: dependent_invoice.dependent_invoice_id,
          	dependent_plan_id: dependent_invoice.dependent_plan_id,
          	invoice_number: dependent_invoice.invoice_number,
          	invoice_date: moment(dependent_invoice.invoice_date).format("YYYY-MM-DD"),
          	invoice_due: moment(dependent_invoice.invoice_due).format("YYYY-MM-DD"),
          	total_dependents: dependent_invoice.total_dependents,
          	individual_price: dependent_invoice.individual_price,
          	plan_start: moment(dependent_invoice.plan_start).format("YYYY-MM-DD"),
          	currency_type: "sgd",
          	currency_value: 0,
          	isPaid: 0,
          	billing_information: {},
          	created_at: moment(dependent_invoice.created_at).format("YYYY-MM-DD HH:mm:ss"),
          	updated_at: moment(dependent_invoice.updated_at).format("YYYY-MM-DD HH:mm:ss"),
          }

          if(dependents[d].payment_status == 1) {
          	dependentInvoices.transaction_trail = new Object();
          	dependentInvoices.transaction_trail.payment_type = "cheque";
          	dependentInvoices.transaction_trail.transaction_date = dependent_invoice.paid_date ? moment(dependent_invoice.paid_date).format("YYYY-MM-DD") : null;
          	dependentInvoices.transaction_trail.referrence_no = null;
          	dependentInvoices.transaction_trail.remarks = dependent_invoice.remarks;
          	dependentInvoices.transaction_trail.paid_amount = dependent_invoice.paid_amount ? dependent_invoice.paid_amount : 0
          }
          console.log('dependentInvoices', dependentInvoices)
          // save customer dependent plan invoice
          await companyModel.saveOne("medi_dependent_invoices", dependentInvoices)
					// get dependent plan withdraw
					let dependentPlanWithdraws = await sql.table("medi_dependent_plan_withdraw")
					.where("dependent_plan_id", dependents[d].dependent_plan_id)

					for(var dp = 0; dp < dependentPlanWithdraws.length; dp++) {
						let dependentPlanWithdrawData = {
							dependent_plan_withdraw_id: dependentPlanWithdraws[dp].dependent_plan_withdraw_id,
							dependent_payment_refund_id: dependentPlanWithdraws[dp].dependent_payment_refund_id,
							member_id: dependentPlanWithdraws[dp].user_id,
							dependent_plan_id: dependentPlanWithdraws[dp].dependent_plan_id,
							date_withdraw: moment(dependentPlanWithdraws[dp].date_withdraw).format("YYYY-MM-DD"),
							amount: dependentPlanWithdraws[dp].amount,
							currency_type: "sgd",
							currency_value: 0,
							status: dependentPlanWithdraws[dp].status,
							paid: dependentPlanWithdraws[dp].paid,
							date_started: dependentPlanWithdraws[dp].date_started,
							has_no_user: dependentPlanWithdraws[dp].has_no_user,
							unused: dependentPlanWithdraws[dp].unused,
							created_at: moment(dependentPlanWithdraws[dp].created_at).format("YYYY-MM-DD HH:mm:ss"),
							updated_at: moment(dependentPlanWithdraws[dp].updated_at).format("YYYY-MM-DD HH:mm:ss")
						}

						// save dependent plan withdraw details
						await companyModel.saveOne("medi_dependent_plan_withdraws", dependentPlanWithdrawData)
					}

					let dependentPlanWithdrawPayment = await sql.table("medi_dependent_payment_refund")
					.where("dependent_plan_id", dependents[d].dependent_plan_id)

					for(var dpp = 0; dpp < dependentPlanWithdrawPayment.length; dpp++) {
						let dependentPlanWithdrawPaymentData = {
							dependent_payment_refund_id: dependentPlanWithdrawPayment[dpp].dependent_payment_refund_id,
							dependent_plan_id: dependentPlanWithdrawPayment[dpp].dependent_plan_id,
							invoice_number: dependentPlanWithdrawPayment[dpp].cancellation_number,
							invoice_date: moment(dependentPlanWithdrawPayment[dpp].created_at).format("YYYY-MM-DD"),
							invoice_due: moment(dependentPlanWithdrawPayment[dpp].created_at).add("1", "month").format("YYYY-MM-DD"),
							refund_date: moment(dependentPlanWithdrawPayment[dpp].date_refund).format("YYYY-MM-DD"),
							refund_amount: dependentPlanWithdrawPayment[dpp].payment_amount,
							status: dependentPlanWithdrawPayment[dpp].status,
							currency_type: "sgd",
							currency_value: 0,
							billing_information: {
								contact_name: `${ customerBillingContact.billing_first_name } ${ customerBillingContact.billing_last_name }`,
								contact_number: customerBillingContact.billing_phone,
								contact_address: customerBillingContact.billing_address,
								contact_email: customerBillingContact.billing_email
							},
							trail_transaction: {
								payment_type: "cheque",
								transaction_date: dependentPlanWithdrawPayment[dpp].date_paid && dependentPlanWithdrawPayment[dpp].date_paid != "0000-00-00" ? moment(dependentPlanWithdrawPayment[dpp].date_paid).format("YYYY-MM-DD") : null,
								referrence_no: null,
								remarks: dependentPlanWithdrawPayment[dpp].payment_remarks,
								paid_amount: dependentPlanWithdrawPayment[dpp].paid_amount
							},
							created_at: moment(dependentPlanWithdrawPayment[dpp].created_at).format("YYYY-MM-DD HH:mm:ss"),
							updated_at: moment(dependentPlanWithdrawPayment[dpp].updated_at).format("YYYY-MM-DD HH:mm:ss")
						}
						// save dependent plan withdraw payment details
						await companyModel.saveOne("medi_dependent_payment_refunds", dependentPlanWithdrawPaymentData)
					}

					// get dependent plan replace
					let dependentPlanReplace = await sql.table("medi_customer_replace_dependent")
					.where("dependent_plan_id", dependents[d].dependent_plan_id)

					for(var dpr = 0; dpr < dependentPlanReplace.length; dpr++) {
						let dependentPlanReplaceData = {
							customer_replace_dependent_id: dependentPlanReplace[dpr].customer_replace_dependent_id,
							member_id: dependentPlanReplace[dpr].old_id,
							new_id: dependentPlanReplace[dpr].new_id,
							customer_id: customer[x].customer_buy_start_id,
							dependent_plan_id: dependentPlanReplace[dpr].dependent_plan_id,
							plan_tier_id:  dependentPlanReplace[dpr].plan_tier_id,
							expired_date: moment(dependentPlanReplace[dpr].expired_date).format("YYYY-MM-DD"),
							first_name: dependentPlanReplace[dpr].first_name,
							last_name: dependentPlanReplace[dpr].first_name,
							nric: dependentPlanReplace[dpr].nric,
							postal_code: dependentPlanReplace[dpr].postal_code,
							dob: moment(dependentPlanReplace[dpr].dob).format("YYYY-MM-DD"),
							start_date: moment(dependentPlanReplace[dpr].start_date).format("YYYY-MM-DD"),
							relationship: dependentPlanReplace[dpr].relationship,
							deactivate_dependent_status: dependentPlanReplace[dpr].deactivate_dependent_status,
							replace_status: dependentPlanReplace[dpr].replace_status,
							status: dependentPlanReplace[dpr].status,
							created_at: moment(dependentPlanReplace[dpr].created_at).format("YYYY-MM-DD HH:mm:ss"),
							updated_at: moment(dependentPlanReplace[dpr].updated_at).format("YYYY-MM-DD HH:mm:ss"),
						}
						// save customer dependent plan replace account
						await companyModel.saveOne("medi_customer_replace_dependent", dependentPlanReplaceData)
					}

					let customerDependentTempEnrollment = await sql.table("medi_dependent_temp_enrollment")
					.where("dependent_plan_id", dependents[d].dependent_plan_id)

					for(var cdte = 0; cdte < customerDependentTempEnrollment.length; cdte++) {
						var unserliaze_data = await unserliaze(customerDependentTempEnrollment[cdte].error_logs);
						var new_unserialize = {
							"mobile_error": unserliaze_data.mobile_error,
							"mobile_message": unserliaze_data.mobile_message,
							"first_name_error": unserliaze_data.first_name_error,
							"first_name_message": unserliaze_data.first_name_message,
							"last_name_error": unserliaze_data.last_name_error,
							"last_name_message": unserliaze_data.last_name_message,
							"dob_error": unserliaze_data.dob_error,
							"dob_message": unserliaze_data.dob_message,
							"postal_code_error": unserliaze_data.postal_code_error,
							"postal_code_message": unserliaze_data.postal_code_message,
							"nric_error": unserliaze_data.nric_error,
							"nric_message": unserliaze_data.nric_message,
							"start_date_error": unserliaze_data.start_date_error,
							"start_date_message": unserliaze_data.start_date_message,
							"start_date_result": unserliaze_data.start_date_result,
							"credits_medical_error": unserliaze_data.credits_medical_error,
							"credits_medical_message": unserliaze_data.credits_medical_message,
							"credit_wellness_amount": unserliaze_data.credit_wellness_amount,
							"credits_wellness_error": unserliaze_data.credits_wellness_error,
							"credits_wellnes_message": unserliaze_data.credits_wellnes_message,
							"error_status": unserliaze_data.error
						};
						let customerTempEnrollmentDependentData = {
							dependent_temp_enrollment_id: customerDependentTempEnrollment[cdte].dependent_temp_id,
							employee_temp_id: customerDependentTempEnrollment[cdte].employee_temp_id,
							plan_tier_id: customerDependentTempEnrollment[cdte].plan_tier_id,
							first_name: customerDependentTempEnrollment[cdte].first_name,
							last_name: customerDependentTempEnrollment[cdte].last_name,
							nric: customerDependentTempEnrollment[cdte].nric,
							dob: customerDependentTempEnrollment[cdte].dob && customerDependentTempEnrollment[cdte].dob != "0000-00-00" ? moment(customerDependentTempEnrollment[cdte].dob, "MM/DD/YYYY").format("YYYY-MM-DD") : null,
							plan_start: customerDependentTempEnrollment[cdte].plan_start ? moment(customerDependentTempEnrollment[cdte].plan_start, "MM/DD/YYYY").format("YYYY-MM-DD") : null,
							error_logs: new_unserialize,
							enrolled_status: customerDependentTempEnrollment[cdte].enrolled_status == "true" ? 1 : 0,
							created_at: moment(customerDependentTempEnrollment[cdte].created_at).format("YYYY-MM-DD HH:mm:ss"),
							updated_at: moment(customerDependentTempEnrollment[cdte].updated_at).format("YYYY-MM-DD HH:mm:ss")
						}
						// save customer dependent plan replace account
						await companyModel.saveOne("medi_dependent_temp_enrollment", customerTempEnrollmentDependentData)
					}
				}
			}
			// get customer active plans
			let customer_active_plans = await sql.table("medi_customer_active_plan")
			.where("customer_start_buy_id", customer[x].customer_buy_start_id)
			for(var c = 0; c < customer_active_plans.length; c++) {
				
				let customerActivePlans = {
					customer_active_plan_id: customer_active_plans[c].customer_active_plan_id,
					customer_id: customer_active_plans[c].customer_start_buy_id,
					customer_plan_id: customer_active_plans[c].plan_id,
					expired: customer_active_plans[c].status == "expired" ? 1 : 0,
					employees: customer_active_plans[c].employees,
					plan_start: moment(customer_active_plans[c].plan_start).format("YYYY-MM-DD"),
					duration: customer_active_plans[c].duration,
					new_head_count: customer_active_plans[c].new_head_count,
					account_type: customer_active_plans[c].account_type,
					secondary_account_type: customer_active_plans[c].secondary_account_type,
					deleted: customer_active_plans[c].deleted,
					deleted_at: customer_active_plans[c].deleted_at,
					plan_extension_enable: customer_active_plans[c].plan_extention_enable,
					created_at: moment(customer_active_plans[c].created_at).format("YYYY-MM-DD HH:mm:ss"),
					updated_at: moment(customer_active_plans[c].updated_at).format("YYYY-MM-DD HH:mm:ss")
				}

		        // save customer active plan
		        await companyModel.saveOne("medi_customer_active_plans", customerActivePlans)

				// get customer active plan withdraw employees
				let plan_withdraw_empoyees = await sql.table("medi_customer_plan_withdraw")
				.where("customer_active_plan_id", customer_active_plans[c].customer_active_plan_id)
				
				for(var p = 0; p < plan_withdraw_empoyees.length; p++) {
					
					let PlanWithdrawEmployees = {
						customer_employee_plan_refund_detail_id: plan_withdraw_empoyees[p].plan_withdraw_id,
						customer_employee_plan_payment_refund_id: plan_withdraw_empoyees[p].payment_refund_id,
						customer_active_plan_id: plan_withdraw_empoyees[p].customer_active_plan_id,
						employee_id: plan_withdraw_empoyees[p].user_id,
						date_withdraw: moment(plan_withdraw_empoyees[p].date_withdraw).format("YYYY-MM-DD"),
						amount: plan_withdraw_empoyees[p].amount,
						currency_type: "sgd",
						currency_value: 0,
						status: plan_withdraw_empoyees[p].refund_status,
						paid: plan_withdraw_empoyees[p].paid,
						vacate_seat: plan_withdraw_empoyees[p].vacate_seat,
						keep_seat: plan_withdraw_empoyees[p].keep_seat,
						date_started: plan_withdraw_empoyees[p].date_started,
						has_no_user: plan_withdraw_empoyees[p].has_no_user,
						unused: plan_withdraw_empoyees[p].unused,
						created_at: moment(plan_withdraw_empoyees[p].created_at).format("YYYY-MM-DD HH:mm:ss"),
						updated_at: moment(plan_withdraw_empoyees[p].updated_at).format("YYYY-MM-DD HH:mm:ss")
					}
					await companyModel.saveOne("medi_customer_employee_plan_refund_details", PlanWithdrawEmployees)
				}
				let plan_withdraw_payment_details = await sql.table("medi_payment_refund")
				.where("customer_active_plan_id", customer_active_plans[c].customer_active_plan_id)
				// get customer active plan withdraw payment details
				for(var pwpd = 0; pwpd < plan_withdraw_payment_details.length; pwpd++) {
					
					let PlanWithdrawPaymentDetails = {
						customer_employee_plan_payment_refund_id: plan_withdraw_payment_details[pwpd].payment_refund_id,
						customer_active_plan_id: plan_withdraw_payment_details[pwpd].customer_active_plan_id,
						invoice_number: plan_withdraw_payment_details[pwpd].cancellation_number,
						invoice_date: moment(plan_withdraw_payment_details[pwpd].created_at).format("YYYY-MM-DD"),
						invoice_due_date: moment(plan_withdraw_payment_details[pwpd].created_at).add("1", "month").format("YYYY-MM-DD"),
						refund_date: moment(plan_withdraw_payment_details[pwpd].date_refund).format("YYYY-MM-DD"),
						refund_amount: plan_withdraw_payment_details[pwpd].payment_amount,
						status: plan_withdraw_payment_details[pwpd].status,
						currency_type: "sgd",
						currency_value: 0,
						billing_information: {
							contact_name: `${ customerBillingContact.billing_first_name } ${ customerBillingContact.billing_last_name }`,
							contact_number: customerBillingContact.billing_phone,
							contact_address: customerBillingContact.billing_address,
							contact_email: customerBillingContact.billing_email
						},
						created_at: moment(plan_withdraw_payment_details[pwpd].created_at).format("YYYY-MM-DD HH:mm:ss"),
						updated_at: moment(plan_withdraw_payment_details[pwpd].updated_at).format("YYYY-MM-DD HH:mm:ss")
					}

					if(plan_withdraw_payment_details[pwpd].status == 1) {
						PlanWithdrawPaymentDetails.trail_transaction = new Object();
						PlanWithdrawPaymentDetails.trail_transaction.payment_type = "cheque";
						PlanWithdrawPaymentDetails.trail_transaction.transaction_date = null;
						PlanWithdrawPaymentDetails.trail_transaction.referrence_no = null;
						PlanWithdrawPaymentDetails.trail_transaction.remarks = plan_withdraw_payment_details[pwpd].payment_remarks;
						PlanWithdrawPaymentDetails.trail_transaction.paid_amount = plan_withdraw_payment_details[pwpd].payment_amount;
					}

					await companyModel.saveOne("medi_customer_employee_plan_payment_refunds", PlanWithdrawPaymentDetails)
				}

				// get customer replace employee
				let customer_replace_employees = await sql.table("medi_customer_replace_employee")
				.where("active_plan_id", customer_active_plans[c].customer_active_plan_id)
				
				for(var cr = 0; cr < customer_replace_employees.length; cr++) {
					
					let CustomerReplaceEmployee = {
						customer_replace_employee_id: customer_replace_employees[cr].customer_replace_employee_id,
						member_id: customer_replace_employees[cr].old_id,
						new_member_id: customer_replace_employees[cr].new_id,
						active_plan_id: customer_replace_employees[cr].active_plan_id,
						expired_and_activate: moment(customer_replace_employees[cr].expired_and_activate).format("YYYY-MM-DD"),
						start_date: customer_replace_employees[cr].start_date ? moment(customer_replace_employees[cr].start_date).format("YYYY-MM-DD") : null,
						first_name: customer_replace_employees[cr].first_name,
						last_name: customer_replace_employees[cr].last_name,
						nric: customer_replace_employees[cr].nric,
						email: customer_replace_employees[cr].email,
						dob: customer_replace_employees[cr].dob,
						mobile: customer_replace_employees[cr].mobile,
						postal_code: customer_replace_employees[cr].postal_code,
						deactive_employee_status: customer_replace_employees[cr].deactive_employee_status,
						status: customer_replace_employees[cr].status,
						medical: customer_replace_employees[cr].medical,
						wellness: customer_replace_employees[cr].wellness,
						replace_status: customer_replace_employees[cr].replace_status,
						created_at: moment(customer_replace_employees[cr].created_at).format("YYYY-MM-DD HH:mm:ss"),
						updated_at: moment(customer_replace_employees[cr].updated_at).format("YYYY-MM-DD HH:mm:ss")
					}
					// save customer replace employee
					await companyModel.saveOne("medi_customer_replace_employee", CustomerReplaceEmployee)
				}
			}
			
			// no plan extension
			let active_plan_invoices = await sql.table("medi_corporate_invoice")
			.where("customer_id", customer[x].customer_buy_start_id)
			.where("plan_extention_enable", 0)

			for(var a = 0; a < active_plan_invoices.length; a++) {
				let payment = await sql.table("medi_customer_cheque_logs")
				.where("invoice_id", active_plan_invoices[a].corporate_invoice_id)
				.first();

				let customer_active_plan = await sql.table("medi_customer_active_plan")
				.where("customer_active_plan_id", active_plan_invoices[a].customer_active_plan_id)
				.first();
				if(customer_active_plan) {
						let activePlanInvoices = {
							active_plan_invoice_id: active_plan_invoices[a].corporate_invoice_id,
							customer_id: active_plan_invoices[a].customer_id,
							customer_active_plan_id: active_plan_invoices[a].customer_active_plan_id,
							employees: active_plan_invoices[a].employees,
							invoice_number: active_plan_invoices[a].invoice_number,
							plan_start: moment(customer_active_plan.plan_start).format("YYYY-MM-DD"),
							duration: customer_active_plan.duration,
	            individual_price: active_plan_invoices[a].individual_price, //dummy
	            invoice_date: moment(active_plan_invoices[a].invoice_date).format("YYYY-MM-DD"),// dummy
	            invoice_due_date: moment(active_plan_invoices[a].invoice_due).format("YYYY-MM-DD"),// dummy
	            refund: 0,
	            currency_type: 'sgd',
	            currency_value: 0,
	            isPaid: customer_active_plan.paid == "true" ? 1 : 0,
	            created_at: moment(active_plan_invoices[a].created_at).format("YYYY-MM-DD HH:mm:ss"),
	            updated_at: moment(active_plan_invoices[a].updated_at).format("YYYY-MM-DD HH:mm:ss"),
	          }

	          if(payment) {
	          	activePlanInvoices.transaction_trail = new Object();
	          	activePlanInvoices.transaction_trail.payment_type = "cheque";
	          	activePlanInvoices.transaction_trail.transaction_date = payment.date_received ? moment(payment.date_received).format("YYYY-MM-DD") : null;
	          	activePlanInvoices.transaction_trail.referrence_no = payment.referrence_no ? payment.referrence_no : null;
	          	activePlanInvoices.transaction_trail.paid_amount = payment.paid_amount ? payment.paid_amount : 0;
	          }

		        // save customer active plan invoices
		        await companyModel.saveOne("medi_active_plan_invoices", activePlanInvoices)
		      }
		    }

			// with plan extensions
			let active_plan_invoice_extensions = await sql.table("medi_corporate_invoice")
			.join("medi_plan_extension_plan_invoice", "medi_plan_extension_plan_invoice.invoice_id", "=", "medi_corporate_invoice.corporate_invoice_id")
			.where("medi_corporate_invoice.customer_id", customer[x].customer_buy_start_id)
			.where("medi_corporate_invoice.plan_extention_enable", 1)
			
			for(var e = 0; e < active_plan_invoice_extensions.length; e++) {
				let payment = await sql.table("medi_customer_cheque_logs")
				.where("invoice_id", active_plan_invoice_extensions[e].corporate_invoice_id)
				.first();

				let extension = await sql.table("medi_plan_extensions")
				.where("customer_active_plan_id", active_plan_invoice_extensions[e].customer_active_plan_id)
				.first();

				
				let activePlanExtension = {
					active_plan_extensions_id: extension.plan_extention_id,
					customer_id: active_plan_invoice_extensions[e].customer_id,
					customer_active_plan_id: active_plan_invoice_extensions[e].customer_active_plan_id,
					plan_start: moment(extension.plan_start).format("YYYY-MM-DD"),
					invoice_date: moment(extension.invoice_date).format("YYYY-MM-DD"),
					invoice_due_date: moment(extension.invoice_due).format("YYYY-MM-DD"),
					duration: extension.duration,
					individual_price: extension.individual_price,
					paid: extension.paid,
					active: extension.active,
					enable: extension.enable,
					account_type: extension.account_type,
					secondary_account_type: extension.secondary_account_type,
					created_at: moment(active_plan_invoice_extensions[e].created_at).format("YYYY-MM-DD HH:mm:ss"),
					updated_at: moment(active_plan_invoice_extensions[e].updated_at).format("YYYY-MM-DD HH:mm:ss")
				}

	            // save customer active plan invoices extension
	            await companyModel.saveOne("medi_active_plan_extensions", activePlanExtension)


	            let activePlanExtensionInvoice = {
	            	active_plan_extension_invoices_id: active_plan_invoice_extensions[e].corporate_invoice_id,
	            	active_plan_extensions_id: extension.plan_extention_id,
	            	customer_id: active_plan_invoice_extensions[e].customer_id,
	            	employees: active_plan_invoice_extensions[e].employees,
	            	invoice_number: active_plan_invoice_extensions[e].invoice_number,
	            	plan_start: moment(extension.plan_start).format("YYYY-MM-DD"),
	            	duration: extension.duration,
	            	individual_price: extension.individual_price,
	            	invoice_date: moment(extension.invoice_date).format("YYYY-MM-DD"),
	            	invoice_due: moment(extension.invoice_due).format("YYYY-MM-DD"),
	            	refund: 0,
	            	paid: extension.paid,
	            	currency_type: "sgd",
	            	currency_value: 0,
	            	created_at: moment(active_plan_invoice_extensions[e].created_at).format("YYYY-MM-DD HH:mm:ss"),
	            	updated_at: moment(active_plan_invoice_extensions[e].updated_at).format("YYYY-MM-DD HH:mm:ss")
	            }

	            if(payment) {
	            	activePlanExtensionInvoice.transaction_trail = new Object();
	            	activePlanExtensionInvoice.transaction_trail.payment_type = "cheque";
	            	activePlanExtensionInvoice.transaction_trail.transaction_date = payment.date_received ? moment(payment.date_received).format("YYYY-MM-DD") : null;
	            	activePlanExtensionInvoice.transaction_trail.referrence_no = payment.referrence_no ? payment.referrence_no : null;
	            	activePlanExtensionInvoice.transaction_trail.paid_amount = payment.paid_amount ? payment.paid_amount : 0;
	            }

		        // save customer active plan invoices extension invoice
		        await companyModel.saveOne("medi_active_plan_extension_invoices", activePlanExtensionInvoice)
		      }

			// customer plan status
			let customer_plan_status = await sql.table("medi_customer_plan_status")
			.where("customer_id", customer[x].customer_buy_start_id)

			for(var s = 0; s < customer_plan_status.length; s++) {
				
				let customerPlanStatus = {
					customer_plan_status_id: customer_plan_status[s].customer_plan_status_id,
					customer_id: customer_plan_status[s].customer_id,
					customer_plan_id: customer_plan_status[s].customer_plan_id,
					employee_head_count: customer_plan_status[s].employees_input,
					employee_enrolled_count: customer_plan_status[s].enrolled_employees,
					account_type: customer_plan_status[s].account_type,
					created_at: moment(customer_plan_status[s].created_at).format("YYYY-MM-DD HH:mm:ss"),
					updated_at: moment(customer_plan_status[s].updated_at).format("YYYY-MM-DD HH:mm:ss")
				}

		        // save customer plan status
		        await companyModel.saveOne("medi_customer_plan_status", customerPlanStatus)
		      }

			// get dependent plan status
			let dependent_status = await sql.table("medi_dependent_plan_status")
			.where("customer_id", customer[x].customer_buy_start_id)

			for(var d = 0; d < dependent_status.length; d++) {
				
				let dependentPlanStatus = {
					dependent_plan_status_id: dependent_status[d].dependent_plan_status_id,
					customer_id: dependent_status[d].customer_id,
					customer_plan_id: dependent_status[d].customer_plan_id,
					dependent_head_count: dependent_status[d].total_dependents,
					dependent_enrolled_count: dependent_status[d].total_enrolled_dependents,
					account_type: dependent_status[d].account_type,
					secondary_account_type: dependent_status[d].secondary_account_type,
					created_at: moment(dependent_status[d].created_at).format("YYYY-MM-DD HH:mm:ss"),
					updated_at: moment(dependent_status[d].updated_at).format("YYYY-MM-DD HH:mm:ss")
				}
	            // save customer dependent plan status
	            await companyModel.saveOne("medi_dependent_plan_status", dependentPlanStatus)
	          }

			// // get company wallet
			let customer_wallet = await sql.table("medi_customer_credits")
			.where("customer_id", customer[x].customer_buy_start_id)
			.first();
			
			let customerWallets = {
				customer_wallet_id: customer_wallet.customer_credits_id,
				customer_id: customer_wallet.customer_id,
				medical_balance: customer_wallet.balance,
				wellness_balance: customer_wallet.wellness_credits,
				unlimited_medical_credits: customer_wallet.unlimited_medical_credits,
				unlimited_wellness_credits: customer_wallet.unlimited_wellness_credits,
				currency_type: "sgd",
				currency_value: 0,
				created_at: moment(customer_wallet.created_at).format("YYYY-MM-DD HH:mm:ss"),
				updated_at: moment(customer_wallet.updated_at).format("YYYY-MM-DD HH:mm:ss")
			}

      // save customer wallet
      await companyModel.saveOne("medi_customer_wallets", customerWallets)

      // get company wallet history medical
      let medical_wallet_histories = await sql.table("medi_customer_credit_logs")
      .where("customer_credits_id", customer_wallet.customer_credits_id)

      for(var m = 0; m < medical_wallet_histories.length; m++) {

				// let id = await global_helper.createUuID()
				let customerMedicalHistory = {
					customer_wallet_history_id: medical_wallet_histories[m].customer_credit_logs_id,
					customer_id: customer[x].customer_buy_start_id,
					customer_wallet_id: medical_wallet_histories[m].customer_credits_id,
					credit: medical_wallet_histories[m].credit,
					running_balance: medical_wallet_histories[m].running_balance,
					type: medical_wallet_histories[m].logs,
					employee_id: medical_wallet_histories[m].user_id,
					customer_active_plan_id: medical_wallet_histories[m].customer_active_plan_id ? String(medical_wallet_histories[m].customer_active_plan_id) : null,
					wallet_type: "medical",
					currency_type: "sgd",
					currency_value: 0,
					created_at: moment(medical_wallet_histories[m].created_at).format("YYYY-MM-DD HH:mm:ss"),
					updated_at: moment(medical_wallet_histories[m].updated_at).format("YYYY-MM-DD HH:mm:ss")
				}
		        // save customer wallet medical histories
		        await companyModel.saveOne("medi_customer_wallet_history", customerMedicalHistory)

				// check for wallet reset data
				let walletMedicalReset = await sql.table("medi_credit_reset")
				.where("wallet_history_id", medical_wallet_histories[m].customer_credit_logs_id)
				.where("spending_type", "medical")
				.where("user_type", "company")
				.first()

				if(walletMedicalReset) {
					
					let walletMedicalResetData = {
						wallet_reset_id: walletMedicalReset.credit_reset_id,
						id: walletMedicalReset.id,
						wallet_history_id: walletMedicalReset.wallet_history_id,
						spending_type: 'medical',
						user_type: 'company',
						credit: walletMedicalReset.credit_reset,
						date_resetted: moment(walletMedicalReset.date_resetted).format("YYYY-MM-DD"),
						currency_type: "sgd",
						currency_value: 0,
						created_at: moment(walletMedicalReset.created_at).format("YYYY-MM-DD HH:mm:ss"),
						updated_at: moment(walletMedicalReset.updated_at).format("YYYY-MM-DD HH:mm:ss")
					}

					// save customer wallet medical histories credit reset
					await companyModel.saveOne("medi_wallet_resets", walletMedicalResetData)
				}
			}

			// // get company wallet history wellness
			let wellness_wallet_histories = await sql.table("medi_customer_wellness_credits_logs")
			.where("customer_credits_id", customer_wallet.customer_credits_id)
			
			for(var w = 0; w < wellness_wallet_histories.length; w++) {
				
				// let wallet_id = await global_helper.createUuID()
				let customerWellnessHistory = {
					customer_wallet_history_id: wellness_wallet_histories[w].customer_wellness_credits_history_id,
					customer_id: customer[x].customer_buy_start_id,
					customer_wallet_id: wellness_wallet_histories[w].customer_credits_id,
					credit: wellness_wallet_histories[w].credit,
					running_balance: wellness_wallet_histories[w].running_balance,
					type: wellness_wallet_histories[w].logs,
					employee_id: wellness_wallet_histories[w].user_id,
					customer_active_plan_id: wellness_wallet_histories[w].customer_active_plan_id ? wellness_wallet_histories[w].customer_active_plan_id : null,
					wallet_type: "wellness",
					currency_type: "sgd",
					currency_value: 0,
					created_at: moment(wellness_wallet_histories[w].created_at).format("YYYY-MM-DD HH:mm:ss"),
					updated_at: moment(wellness_wallet_histories[w].updated_at).format("YYYY-MM-DD HH:mm:ss")
				}
		        // save customer wallet medical histories
		        await companyModel.saveOne("medi_customer_wallet_history", customerWellnessHistory)

				// check for wallet reset data
				let walletWellnessReset = await sql.table("medi_credit_reset")
				.where("wallet_history_id", wellness_wallet_histories[w].customer_wellness_credits_history_id)
				.where("spending_type", "wellness")
				.where("user_type", "company")
				.first()

				if(walletWellnessReset) {
					
					let walletWellnessResetData = {
						wallet_reset_id: walletWellnessReset.credit_reset_id,
						id: walletWellnessReset.id,
						wallet_history_id: walletWellnessReset.wallet_history_id,
						spending_type: 'wellness',
						user_type: 'company',
						credit: walletWellnessReset.credit_reset,
						date_resetted: moment(walletWellnessReset.date_resetted).format("YYYY-MM-DD"),
						currency_type: "sgd",
						currency_value: 0,
						created_at: moment(walletWellnessReset.created_at).format("YYYY-MM-DD HH:mm:ss"),
						updated_at: moment(walletWellnessReset.updated_at).format("YYYY-MM-DD HH:mm:ss")
					}

					// save customer wallet medical histories credit reset
					await companyModel.saveOne("medi_wallet_resets", walletWellnessResetData)
				}
			}

			let deposits = await sql.table("medi_spending_deposit_credits")
			.where("customer_id", customer[x].customer_buy_start_id)

			for(var t = 0; t < deposits.length; t++) {
				
				// get speding deposit
				let customerSpendingDepositCredits = {
					customer_spending_deposit_credit_id: deposits[t].deposit_id,
					customer_active_plan_id: deposits[t].customer_active_plan_id,
					customer_id: deposits[t].customer_id,
					medical_credits: deposits[t].medical_credits,
					wellness_credits: deposits[t].welness_credits,
					medical_percent: deposits[t].percent,
					wellness_percent: deposits[t].wellness_percent,
					invoice_number: deposits[t].deposit_number,
					invoice_date: moment(deposits[t].invoice_date).format("YYYY-MM-DD"),
					invoice_due: moment(deposits[t].invoice_due).format("YYYY-MM-DD"),
					paid_amount: deposits[t].amount_paid,
					paid_date: deposits[t].paid_date ? moment(deposits[t].paid_date).format("YYYY-MM-DD") : null,
					payment_status: deposits[t].payment_status,
					payment_remarks: deposits[t].payment_remarks,
					currency_type: "sgd",
					currency_value: 0,
					created_at: moment(deposits[t].created_at).format("YYYY-MM-DD HH:mm:ss"),
					updated_at: moment(deposits[t].updated_at).format("YYYY-MM-DD HH:mm:ss")
				}

		        // save customer wallet medical histories
		        await companyModel.saveOne("medi_customer_spending_deposit_credits", customerSpendingDepositCredits)
		      }

			// get company spending invoices
			let spendings = await sql.table("medi_company_credits_statement")
			.where("statement_customer_id", customer[x].customer_buy_start_id)

			for(var sp = 0; sp < spendings.length; sp++) {
				
				let SpendingInvoice = {
					customer_spending_invoice_id: spendings[sp].statement_id,
					customer_id: spendings[sp].statement_customer_id,
					invoice_number: spendings[sp].statement_number,
					invoice_date: moment(spendings[sp].statement_date).format("YYYY-MM-DD"),
					invoice_due_date: moment(spendings[sp].statement_due).format("YYYY-MM-DD"),
					start_date: moment(spendings[sp].statement_start_date).format("YYYY-MM-DD"),
					end_date: moment(spendings[sp].statement_end_date).format("YYYY-MM-DD"),
					payment_status: spendings[sp].statement_status,
					lite_plan: spendings[sp].lite_plan,
					currency_type: 0,
					currency_value: "sgd",
					status: spendings[sp].statement_status,
					billing_information: {
						contact_name: spendings[sp].statement_contact_name,
						contact_number: spendings[sp].statement_contact_number,
						contact_address: customerBillingContact.billing_address,
						contact_email: spendings[sp].statement_contact_email
					},
					trail_transaction: [{
						payment_type: "cheque",
						transaction_date: spendings[sp].paid_date ? moment(spendings[sp].paid_date).format("YYYY-MM-DD") : null,
						referrence_no: null,
						remarks: spendings[sp].payment_remarks,
						paid_amount: spendings[sp].paid_amount
					}],
					created_at: moment(spendings[sp].created_at).format("YYYY-MM-DD HH:mm:ss"),
					updated_at: moment(spendings[sp].updated_at).format("YYYY-MM-DD HH:mm:ss")
				}

				// save spending invoice
				await companyModel.saveOne("medi_customer_spending_invoices", SpendingInvoice)

				// get in-network spending invoice transaction details
				let InNetworkSpendingLists = await sql.table("medi_spending_invoice_transactions")
				.where("invoice_id", spendings[sp].statement_id)

				for(var ns = 0; ns < InNetworkSpendingLists.length; ns++) {
					let InNetworkData = {
						spending_invoice_in_network_transaction_id: InNetworkSpendingLists[ns].spending_invoice_transaction_id,
						customer_spending_invoice_id: InNetworkSpendingLists[ns].invoice_id,
						in_network_transaction_id: InNetworkSpendingLists[ns].transaction_id,
						status: 0,
						paid: 0,
						created_at: moment(InNetworkSpendingLists[ns].created_at).format("YYYY-MM-DD HH:mm:ss"),
						updated_at: moment(InNetworkSpendingLists[ns].updated_at).format("YYYY-MM-DD HH:mm:ss")
					}

					// save spending invoice in-network lists
					await companyModel.saveOne("medi_spending_invoice_in_network_transactions", InNetworkData)
				}
			}

			// customer temp enrollment
			let customerTempEnrollment = await sql.table("medi_customer_temp_enrollment")
			.where("customer_buy_start_id", customer[x].customer_buy_start_id)
			for(var ct = 0; ct < customerTempEnrollment.length; ct++) {
				var unserliaze_data = await unserliaze(customerTempEnrollment[ct].error_logs);
				console.log('unserliaze', unserliaze_data);
				var new_unserialize = {
					"mobile_error": unserliaze_data.mobile_error ? unserliaze_data.mobile_error : null,
					"mobile_message": unserliaze_data.mobile_message,
					"first_name_error": unserliaze_data.first_name_error,
					"first_name_message": unserliaze_data.first_name_message,
					"last_name_error": unserliaze_data.last_name_error,
					"last_name_message": unserliaze_data.last_name_message,
					"dob_error": unserliaze_data.dob_error,
					"dob_message": unserliaze_data.dob_message,
					"postal_code_error": unserliaze_data.postal_code_error,
					"postal_code_message": unserliaze_data.postal_code_message,
					"nric_error": unserliaze_data.nric_error,
					"nric_message": unserliaze_data.nric_message,
					"start_date_error": unserliaze_data.start_date_error,
					"start_date_message": unserliaze_data.start_date_message,
					"start_date_result": unserliaze_data.start_date_result,
					"credits_medical_error": unserliaze_data.credits_medical_error,
					"credits_medical_message": unserliaze_data.credits_medical_message,
					"credit_wellness_amount": unserliaze_data.credit_wellness_amount,
					"credits_wellness_error": unserliaze_data.credits_wellness_error,
					"credits_wellnes_message": unserliaze_data.credits_wellnes_message,
					"error_status": unserliaze_data.error
				};
				
				let customerTempEnrollmentData = {
					temp_enrollment_id: customerTempEnrollment[ct].temp_enrollment_id,
					customer_id: customerTempEnrollment[ct].customer_buy_start_id,
					plan_tier_id: customerTempEnrollment[ct].plan_tier_id,
					customer_active_plan_id: customerTempEnrollment[ct].active_plan_id,
					first_name: customerTempEnrollment[ct].first_name,
					last_name: customerTempEnrollment[ct].last_name,
					nric: customerTempEnrollment[ct].nric,
					dob: moment(customerTempEnrollment[ct].dob, "MM/DD/YYYY").format("YYYY-MM-DD"),
					email: customerTempEnrollment[ct].email,
					mobile: customerTempEnrollment[ct].mobile,
					mobile_area_code: customerTempEnrollment[ct].mobile_area_code,
					job_title: customerTempEnrollment[ct].job_title,
					postal_code: customerTempEnrollment[ct].postal_code,
					medical_credits: customerTempEnrollment[ct].credits,
					medical_balance_entitlement: customerTempEnrollment[ct].medical_balance_entitlement,
					wellness_credits: customerTempEnrollment[ct].wellness_credits,
					wellness_balance_entitlement: customerTempEnrollment[ct].wellness_balance_entitlement,
					from_renew_method: customerTempEnrollment[ct].from_renew_method,
					done_renew_method: customerTempEnrollment[ct].done_renew_method,
					start_date: customerTempEnrollment[ct].start_date ? moment(customerTempEnrollment[ct].start_date, "MM/DD/YYYY").format("YYYY-MM-DD") : null,
					error_logs: new_unserialize,
					enrolled_status: customerTempEnrollment[ct].enrolled_status == "true" ? 1 : 0,
					created_at: moment(customerTempEnrollment[ct].created_at).format("YYYY-MM-DD HH:mm:ss"),
					updated_at: moment(customerTempEnrollment[ct].updated_at).format("YYYY-MM-DD HH:mm:ss")
				}
				// / save spending invoice
				await companyModel.saveOne("medi_customer_employee_temp_enrollment", customerTempEnrollmentData)
			}

			// get company block access
			let company_block_access = await sql.table("medi_company_block_clinic_access")
			.where("customer_id", customer[x].customer_buy_start_id)
			.where("account_type", "company")

			for(var cba = 0; cba < company_block_access.length; cba++) {
				let companyBlockAccess = {
					company_block_clinic_access_id: company_block_access[cba].company_block_clinic_access_id,
					customer_id: company_block_access[cba].customer_id,
					clinic_id: company_block_access[cba].clinic_id,
					account_type: "company",
					status: company_block_access[cba].status,
					created_at: moment(company_block_access[cba].created_at).format("YYYY-MM-DD HH:mm:ss"),
					updated_at: moment(company_block_access[cba].updated_at).format("YYYY-MM-DD HH:mm:ss")
				}

				// save spending invoice in-network lists
				await companyModel.saveOne("medi_company_block_clinic_access", companyBlockAccess)
			}

			// spending acccount settings
			var spending_accounts = await sql.table("medi_spending_account_settings")
			.where("customer_id", customer[x].customer_buy_start_id)


			for(var spe = 0; spe < spending_accounts.length; spe++) {
				var spe_data = {
					spending_account_setting_id: spending_accounts[spe].spending_account_setting_id,
					customer_id: spending_accounts[spe].customer_id,
					customer_plan_id: spending_accounts[spe].customer_plan_id,
					medical_enable: spending_accounts[spe].medical_enable,
					medical_spending_start_date: moment(spending_accounts[spe].medical_spending_start_date).format("YYYY-MM-DD"),
					medical_spending_end_date: moment(spending_accounts[spe].medical_spending_end_date).format("YYYY-MM-DD"),
					medical_supplementary_credits: spending_accounts[spe].medical_supplementary_credits,
					medical_deposit: spending_accounts[spe].medical_deposit,
					medical_roll_over: spending_accounts[spe].medical_roll_over,
					wellness_enable: spending_accounts[spe].wellness_enable,
					wellness_spending_start_date: moment(spending_accounts[spe].wellness_spending_start_date).format("YYYY-MM-DD"),
					wellness_spending_end_date: moment(spending_accounts[spe].wellness_spending_end_date).format("YYYY-MM-DD"),
					wellness_supplementary_credits: spending_accounts[spe].wellness_supplementary_credits,
					wellness_deposit: spending_accounts[spe].wellness_deposit,
					wellness_roll_over: spending_accounts[spe].wellness_roll_over,
					created_at: moment(spending_accounts[spe].created_at).format("YYYY-MM-DD HH:mm:ss"),
					updated_at: moment(spending_accounts[spe].created_at).format("YYYY-MM-DD HH:mm:ss")
				}

				await companyModel.saveOne("medi_spending_account_settings", spe_data);
			}

			// plan renewal
			var plan_renewals = await sql.table("medi_customer_plan_renewal")
			.where("customer_id", customer[x].customer_buy_start_id)

			for(var pls = 0; pls < plan_renewals.length; pls++) {
				var pls_data = {
					customer_plan_renewal_id: plan_renewals[pls].customer_plan_renewal_id,
					customer_id: plan_renewals[pls].customer_id,
					employee_account_type: plan_renewals[pls].employee_account_type,
					employee_secondary_account_type: plan_renewals[pls].employee_secondary_account_type,
					employee_seats: plan_renewals[pls].employee_seats,
					price_per_employee: plan_renewals[pls].price_per_employee,
					employee_plan_start: moment(plan_renewals[pls].employee_plan_start).format("YYYY-MM-DD"),
					employee_plan_duration: plan_renewals[pls].employee_plan_duration,
					employee_added_seats: plan_renewals[pls].employee_added_seats,
					dependent_account_type: plan_renewals[pls].dependent_account_type,
					dependent_secondary_account_type: plan_renewals[pls].dependent_secondary_account_type,
					dependent_seats: plan_renewals[pls].dependent_seats,
					price_per_dependent: plan_renewals[pls].price_per_dependent,
					dependent_plan_start: moment(plan_renewals[pls].dependent_plan_start).format("YYYY-MM-DD"),
					dependent_plan_duration: plan_renewals[pls].dependent_plan_duration,
					dependent_added_seats: plan_renewals[pls].dependent_added_seats,
					dependent_plan_enabled: plan_renewals[pls].dependent_plan_enabled,
					currency_type: plan_renewals[pls].currency_type,
					status: plan_renewals[pls].status,
					created_at: moment(plan_renewals[pls].created_at).format("YYYY-MM-DD HH:mm:ss"),
					updated_at: moment(plan_renewals[pls].created_at).format("YYYY-MM-DD HH:mm:ss")
				}

				var plan_renewal_logs = await sql.table("medi_customer_plan_renewal_logs")
				.where("customer_plan_renewal_id", plan_renewals[pls].customer_plan_renewal_id)
				await companyModel.saveOne("medi_customer_plan_renewal", pls_data);

				for(var prl = 0; prl < plan_renewal_logs.length; prl++) {
					var prl_data = {
						customer_plan_renewal_log_id: plan_renewal_logs[prl].customer_plan_renewal_log_id,
						customer_plan_renewal_id: plan_renewal_logs[prl].customer_plan_renewal_id,
						amount: plan_renewal_logs[prl].plan_renewal_logs,
						seats: plan_renewal_logs[prl].seats,
						type: plan_renewal_logs[prl].type,
						created_at: moment(plan_renewal_logs[prl].created_at).format("YYYY-MM-DD HH:mm:ss"),
						updated_at: moment(plan_renewal_logs[prl].created_at).format("YYYY-MM-DD HH:mm:ss")
					}

					await companyModel.saveOne("medi_customer_plan_renewal_logs", prl_data);
				}
			}

			// plan renewal employee
			var employee_plan_renewals = await sql.table("medi_customer_employee_plan_renewal")
			.where("customer_id", customer[x].customer_buy_start_id)

			for(var eplr = 0; eplr < employee_plan_renewals.length; eplr++) {
				var eplr_data = {
					customer_employee_plan_renewal_id: employee_plan_renewals[eplr].created_at,
					customer_plan_renewal_id: employee_plan_renewals[eplr].customer_plan_renewal_id,
					customer_id: employee_plan_renewals[eplr].customer_id,
					member_id: employee_plan_renewals[eplr].member_id,
					fullname: employee_plan_renewals[eplr].fullname,
					dob: employee_plan_renewals[eplr].dob,
					start_date: moment(employee_plan_renewals[eplr].start_date).format("YYYY-MM-DD"),
					country_code: employee_plan_renewals[eplr].country_code,
					mobile_number: employee_plan_renewals[eplr].mobile_number,
					new_user: employee_plan_renewals[eplr].new_user,
					hold_seat: employee_plan_renewals[eplr].hold_seat,
					remove_seat: employee_plan_renewals[eplr].remove_seat,
					new_member_id: employee_plan_renewals[eplr].new_member_id,
					status: employee_plan_renewals[eplr].status,
					created_at: moment(employee_plan_renewals[eplr].created_at).format("YYYY-MM-DD HH:mm:ss"),
					updated_at: moment(employee_plan_renewals[eplr].created_at).format("YYYY-MM-DD HH:mm:ss")
				}

				await companyModel.saveOne("medi_customer_employee_plan_renewal", eplr_data);
			}

			// plan renewal dependent
			var dependent_plan_renewals = await sql.table("medi_customer_dependent_plan_renewal")
			.where("customer_id", customer[x].customer_buy_start_id)

			for(var dpr = 0; dpr < dependent_plan_renewals.length; dpr++) {
				var dpr_data = {
					customer_dependent_plan_renewal_id: dependent_plan_renewals[dpr].created_at,
					customer_plan_renewal_id: dependent_plan_renewals[dpr].customer_plan_renewal_id,
					customer_employee_plan_renewal_id: dependent_plan_renewals[dpr].customer_employee_plan_renewal_id,
					customer_id: dependent_plan_renewals[dpr].customer_id,
					employee_id: dependent_plan_renewals[dpr].employee_id,
					member_id: dependent_plan_renewals[dpr].member_id,
					fullname: dependent_plan_renewals[dpr].fullname,
					dob: dependent_plan_renewals[dpr].dob,
					relationship: dependent_plan_renewals[dpr].relationship,
					start_date: moment(dependent_plan_renewals[dpr].start_date).format("YYYY-MM-DD"),
					hold_seat: dependent_plan_renewals[dpr].hold_seat,
					remove_seat: dependent_plan_renewals[dpr].remove_seat,
					new_user: dependent_plan_renewals[dpr].new_user,
					status: dependent_plan_renewals[dpr].status,
					created_at: moment(dependent_plan_renewals[dpr].created_at).format("YYYY-MM-DD HH:mm:ss"),
					updated_at: moment(dependent_plan_renewals[dpr].created_at).format("YYYY-MM-DD HH:mm:ss")
				}

				await companyModel.saveOne("medi_customer_dependent_plan_renewal", dpr_data);
			}

			// employee spending renewal
			var employee_spending_account_renewals = await sql.table("medi_employee_spending_account_renewal")
			.where("customer_id", customer[x].customer_buy_start_id)

			for(var esr = 0; esr < employee_spending_account_renewals.length; esr++) {
				var esr_data = {
					employee_spending_account_renewal_id: employee_spending_account_renewals[esr].employee_spending_account_renewal_id,
					spending_account_renewal_id: employee_spending_account_renewals[esr].spending_account_renewal_id,
					customer_plan_renewal_id: employee_spending_account_renewals[esr].customer_plan_renewal_id,
					customer_employee_plan_renewal_id: employee_spending_account_renewals[esr].customer_employee_plan_renewal_id,
					customer_id: employee_spending_account_renewals[esr].customer_id,
					member_id: employee_spending_account_renewals[esr].member_id,
					plan_start: moment(employee_spending_account_renewals[esr].plan_start).format("YYYY-MM-DD"),
					medical: employee_spending_account_renewals[esr].medical,
					wellness: employee_spending_account_renewals[esr].wellness,
					medical_entitlement: employee_spending_account_renewals[esr].medical_entitlement,
					medical_roll_over: employee_spending_account_renewals[esr].medical_roll_over,
					medical_entitlement_type: employee_spending_account_renewals[esr].medical_entitlement_type,
					medical_allocated_credits: employee_spending_account_renewals[esr].medical_allocated_credits,
					wellness_roll_over: employee_spending_account_renewals[esr].wellness_roll_over,
					wellness_entitlement: employee_spending_account_renewals[esr].wellness_entitlement,
					wellness_entitlement_type: employee_spending_account_renewals[esr].wellness_entitlement_type,
					wellness_allocated_credits: employee_spending_account_renewals[esr].wellness_allocated_credits,
					new_user: employee_spending_account_renewals[esr].new_user,
					status: employee_spending_account_renewals[esr].status,
					created_at: moment(employee_spending_account_renewals[esr].created_at).format("YYYY-MM-DD HH:mm:ss"),
					updated_at: moment(employee_spending_account_renewals[esr].created_at).format("YYYY-MM-DD HH:mm:ss")
				}

				await companyModel.saveOne("medi_employee_spending_account_renewal", esr_data);
			}

			// company spending renewal
			var spending_renewal_accounts = await sql.table("medi_spending_account_renewal")
			.where("customer_id", customer[x].customer_buy_start_id)

			for(sra = 0; sra < spending_renewal_accounts.length; sra++) {
				let sra_data = {
					spending_account_renewal_id: spending_renewal_accounts[sra].spending_account_renewal_id,
					customer_id: spending_renewal_accounts[sra].customer_id,
					start: moment(spending_renewal_accounts[sra].start).format("YYYY-MM-DD"),
					end: moment(spending_renewal_accounts[sra].end).format("YYYY-MM-DD"),
					duration: spending_renewal_accounts[sra].duration,
					same_plan_renew: spending_renewal_accounts[sra].same_plan_renew,
					medical: spending_renewal_accounts[sra].medical,
					wellness: spending_renewal_accounts[sra].wellness,
					roll_over_status: spending_renewal_accounts[sra].roll_over_status,
					status: spending_renewal_accounts[sra].status,
					created_at: moment(spending_renewal_accounts[sra].created_at).format("YYYY-MM-DD HH:mm:ss"),
					updated_at: moment(spending_renewal_accounts[sra].created_at).format("YYYY-MM-DD HH:mm:ss")
				}

				await companyModel.saveOne("medi_spending_account_renewal", sra_data);
			}


			// medi_company_e_claim_service_types
			var company_e_claim_service_types = await sql.table("medi_company_e_claim_service_types")
			.where("customer_id", customer[x].customer_buy_start_id)

			for(cecst = 0; cecst < company_e_claim_service_types.length; cecst++) {
				var cecst_data = {
					e_claim_service_type_id: company_e_claim_service_types[cecst].created_at,
					customer_id: company_e_claim_service_types[cecst].created_at,
					health_type_id: company_e_claim_service_types[cecst].created_at,
					name: company_e_claim_service_types[cecst].created_at,
					type: company_e_claim_service_types[cecst].created_at,
					cap_amount: company_e_claim_service_types[cecst].created_at,
					active: company_e_claim_service_types[cecst].created_at,
					created_at: moment(company_e_claim_service_types[cecst].created_at).format("YYYY-MM-DD HH:mm:ss"),
					updated_at: moment(company_e_claim_service_types[cecst].created_at).format("YYYY-MM-DD HH:mm:ss")
				}

				await companyModel.saveOne("medi_company_e_claim_service_types", cecst_data);
			}

			// create member data migration
			var members = await await sql.table("medi_corporate_members")
			.where("corporate_id", account.corporate_id)
				
			console.log('members from hr migration', members)
			// return res.json(members);
			for(var mem = 0; mem < members.length; mem++) {
				try {
					if(members[mem]) {
						console.log('members[mem]', members[mem])
						var check_member = await sql.table("medi_user").where('UserID', members[mem].user_id).first();

						if(check_member) {
							let result_member = await createEmployeeMemberDataMigrationFromHr(check_member.UserID);
							console.log('result_member', result_member);
						} else {
							console.log('member does not exist or delete manually');
						}
					} else {
						console.log('member does not exist i corporate members or delete manually');
					}
				} catch(error) {
					console.log('error loop member', error)
					console.log('error loop member', mem)
					return res.json(members[mem]);
				}
			}
			done++;
		} else {
			console.log('customer data migration already exist')
		}
	}

	return res.json({ status: done + " / " + customer.length });
}

const createBenefitsDependencies = async (req, res, next) => {
	// get care package lists
	var care_package_lists = await sql.table("medi_care_package")
	let plans = [];
	for(var c = 0; c < care_package_lists.length; c++) {
		let check_care_package =  await companyModel.getOne('medi_benefits_care_package', { benefits_care_package_id: care_package_lists[c].care_package_id });
		console.log('check_care_package', check_care_package)
		if(!check_care_package) {
			let carePackage = {
				benefits_care_package_id: care_package_lists[c].care_package_id,
				package_name: care_package_lists[c].package_name,
				package_description: care_package_lists[c].package_description,
				package_discount: care_package_lists[c].package_discount,
				image: care_package_lists[c].image,
				position: care_package_lists[c].position,
				active: 1,
				deleted: 0,
				deleted_at: null,
				created_at: moment(care_package_lists[c].created_at).format("YYYY-MM-DD HH:mm:ss"),
				updated_at: moment(care_package_lists[c].updated_at).format("YYYY-MM-DD HH:mm:ss")
			}

			// save care plan packages
			await companyModel.saveOne("medi_benefits_care_package", carePackage)
		}
	}

	// get benefits package group
	var medi_benefits_package_groups = await sql.table("medi_package_group")

	for(var m = 0; m < medi_benefits_package_groups.length; m++) {
		let check_benefits_package =  await companyModel.getOne('medi_benefits_package_group', { benefits_package_group_id: medi_benefits_package_groups[m].package_group_id });
		console.log('check_benefits_package', check_benefits_package)

		if(!check_benefits_package) {
			let mediBenefitsPackage = {
				benefits_package_group_id: medi_benefits_package_groups[m].package_group_id,
				name: medi_benefits_package_groups[m].name,
				account_type: medi_benefits_package_groups[m].account_type,
				secondary_account_type: medi_benefits_package_groups[m].secondary_account_type,
				wallet: medi_benefits_package_groups[m].wallet,
				default_selection: medi_benefits_package_groups[m].default_selection,
				created_at: moment(medi_benefits_package_groups[m].created_at).format("YYYY-MM-DD HH:mm:ss"),
				updated_at: moment(medi_benefits_package_groups[m].updated_at).format("YYYY-MM-DD HH:mm:ss")
			}

			// save care plan packages group
			await companyModel.saveOne("medi_benefits_package_group", mediBenefitsPackage)
		}
	}

	// get benefits group bundle
	let medi_benefits_package_bundles = await sql.table("medi_package_bundle")

	for(var n = 0; n < medi_benefits_package_bundles.length; n++) {
		let check_benefits_package_bundle =  await companyModel.getOne('medi_benefits_package_bundle', { benefits_package_bundle_id: String(medi_benefits_package_bundles[n].bundle_id) });
		console.log('check_benefits_package_bundle', check_benefits_package_bundle);

		if(!check_benefits_package_bundle) {
			let mediBenefitsPackageBundle = {
				benefits_package_bundle_id: medi_benefits_package_bundles[n].bundle_id,
				benefits_care_package_id: medi_benefits_package_bundles[n].care_package_id,
				package_group_id: medi_benefits_package_bundles[n].package_group_id,
				created_at: moment(medi_benefits_package_bundles[n].created_at).format("YYYY-MM-DD HH:mm:ss"),
				updated_at: moment(medi_benefits_package_bundles[n].updated_at).format("YYYY-MM-DD HH:mm:ss")
			}

			// save care plan packages group
			await companyModel.saveOne("medi_benefits_package_bundle", mediBenefitsPackageBundle)
		}
	}

	return res.send('ok');
}

const createEmployeeMemberDataMigration = async (req, res, next) => {
	if(req.body.id) {
		var members = await sql.table("medi_user")
		.where("UserType", 5)
		.where('access_type', 0)
		.where('UserID', req.body.id)
		members.data = members;
	} else {
		var members = await sql.table("medi_user")
		.where("UserType", 5)
		.where('access_type', 0)
		.paginate(5000, req.body.page, true)

	}
	// console.log('members', members)
	// return res.json(members);
	let done = 0;
	let plans = [];
	for(var x = 0; x < members.data.length; x++) {
		let user_data = members.data[x];
		let check = await companyModel.getOne('medi_members', { member_id: user_data.UserID });
		console.log('check', check)
		
		if(!check) {
			
			let userData = {
				member_id: user_data.UserID,
				fullname: user_data.Name,
				nric: user_data.NRIC,
				email: user_data.Email,
				password: sha256("mednefits"),
				address: user_data.Address,
				country: user_data.Country,
				city: user_data.City,
				postal_code: user_data.Zip_Code,
				image: user_data.Image,
				phone_code: user_data.PhoneCode,
				phone_no: user_data.PhoneNo,
				otp_code: user_data.OTPCode,
				otp_status: user_data.OTPStatus,
				dob: user_data.DOB,
				bmi: user_data.Bmi,
				weight: user_data.Weight,
				height: user_data.Height,
				blood_type: user_data.Blood_Type,
				job_title: user_data.Job_Title,
				bank_account_number: user_data.bank_account,
				bank_code: user_data.bank_code,
				bank_brh: user_data.bank_brh,
				communication_type: user_data.communication_type,
				member_type: "employee",
				active: user_data.Active,
				created_at: moment(user_data.created_at).format("YYYY-MM-DD HH:mm:ss"),
				updated_at: moment(user_data.created_at).format("YYYY-MM-DD HH:mm:ss")
			}

			// save member employee data
			await companyModel.saveOne("medi_members", userData)

			// check if member has a company assign
			let company_member = await sql.table("medi_corporate_members")
			.where("user_id", user_data.UserID)
			.first()
			if(company_member) {
				var corporate = await sql.table("medi_corporate")
				.where("corporate_id", company_member.corporate_id)
				.first()
				if(corporate) {
					var account = await sql.table("medi_customer_link_customer_buy")
					.where("corporate_id", corporate.corporate_id)
					.first()
					
					
					let corporateMemberData = {
						company_member_id: company_member.corporate_member_id,
						customer_id: account.customer_buy_start_id,
						member_id: company_member.user_id,
						deleted: company_member.removed_status,
						created_at: moment(company_member.created_at).format("YYYY-MM-DD HH:mm:ss"),
						updated_at: moment(company_member.updated_at).format("YYYY-MM-DD HH:mm:ss")
					}

					// save company member employee data
					await companyModel.saveOne("medi_company_members", corporateMemberData)

					// get member wallet
					let member_wallet = await sql.table("medi_e_wallet")
					.where("UserID", user_data.UserID)
					.first()

					
					let memberWallet = {
						member_wallet_id: member_wallet.wallet_id,
						member_id: parseInt(member_wallet.UserID),
						cap_amount: parseFloat(member_wallet.cap_per_visit_medical),
						medical_balance: parseFloat(member_wallet.balance),
						wellness_balance: parseFloat(member_wallet.wellness_balance),
						unlimited: 0,
						created_at: moment(member_wallet.created_at).format("YYYY-MM-DD HH:mm:ss"),
						updated_at: moment(member_wallet.updated_at).format("YYYY-MM-DD HH:mm:ss")
					}
					// save company member employee wallet data
					await companyModel.saveOne("medi_member_wallet", memberWallet)

					// get member wallet history medical
					let medical_wallet_histories = await sql.table("medi_wallet_history")
					.where("wallet_id", member_wallet.wallet_id)

					for(var m = 0; m < medical_wallet_histories.length; m++) {
						
						// let id = await global_helper.createUuID()
						let customerMedicalHistory = {
							wallet_history_id: medical_wallet_histories[m].wallet_history_id,
							employee_id: member_wallet.UserID,
							member_wallet_id: medical_wallet_histories[m].wallet_id,
							credit: medical_wallet_histories[m].credit,
							running_balance: medical_wallet_histories[m].running_balance,
							type: medical_wallet_histories[m].logs,
							spend: medical_wallet_histories[m].where_spend,
							customer_active_plan_id: medical_wallet_histories[m].customer_active_plan_id ? String(medical_wallet_histories[m].customer_active_plan_id) : null,
							transaction_id: medical_wallet_histories[m].id,
							wallet_type: "medical",
							currency_type: "sgd",
							currency_value: 0,
							from_pro_allocation: medical_wallet_histories[m].from_pro_allocation,
							back_date_deduction: medical_wallet_histories[m].back_date_deduction,
							created_at: moment(medical_wallet_histories[m].created_at).format("YYYY-MM-DD HH:mm:ss"),
							updated_at: moment(medical_wallet_histories[m].updated_at).format("YYYY-MM-DD HH:mm:ss")
						}

				        // save customer wallet medical histories
				        await companyModel.saveOne("medi_member_wallet_history", customerMedicalHistory)

						// check for wallet reset data
						let walletMedicalResetEmployee = await sql.table("medi_credit_reset")
						.where("wallet_history_id", medical_wallet_histories[m].wallet_history_id)
						.where("spending_type", "medical")
						.where("user_type", "employee")
						.first()

						if(walletMedicalResetEmployee) {
							
							let walletMedicalResetDataEmployee = {
								wallet_reset_id: walletMedicalResetEmployee.credit_reset_id,
								id: walletMedicalResetEmployee.id,
								wallet_history_id: walletMedicalResetEmployee.wallet_history_id,
								spending_type: 'medical',
								user_type: 'employee',
								credit: walletMedicalResetEmployee.credit_reset,
								date_resetted: moment(walletMedicalResetEmployee.date_resetted).format("YYYY-MM-DD"),
								currency_type: "sgd",
								currency_value: 0,
								created_at: moment(walletMedicalResetEmployee.created_at).format("YYYY-MM-DD HH:mm:ss"),
								updated_at: moment(walletMedicalResetEmployee.updated_at).format("YYYY-MM-DD HH:mm:ss")
							}

							// save employee wallet medical histories credit reset
							await companyModel.saveOne("medi_wallet_resets", walletMedicalResetDataEmployee)
						}
					}

					// get member wallet history wellness
					let wellness_wallet_histories = await sql.table("medi_wellness_wallet_history")
					.where("wallet_id", member_wallet.wallet_id)

					for(var m = 0; m < wellness_wallet_histories.length; m++) {
						
						// let wellness_id = await global_helper.createUuID()
						let customerMedicalHistory = {
				            // _id: wellness_id,
				            wallet_history_id: wellness_wallet_histories[m].wellness_wallet_history_id,
				            employee_id: member_wallet.UserID,
				            member_wallet_id: wellness_wallet_histories[m].wallet_id,
				            credit: wellness_wallet_histories[m].credit,
				            running_balance: wellness_wallet_histories[m].running_balance,
				            type: wellness_wallet_histories[m].logs,
				            spend: wellness_wallet_histories[m].where_spend,
				            customer_active_plan_id: wellness_wallet_histories[m].customer_active_plan_id ? String(wellness_wallet_histories[m].customer_active_plan_id) : null,
				            transaction_id: wellness_wallet_histories[m].id,
				            wallet_type: "wellness",
				            currency_type: "sgd",
				            currency_value: 0,
				            from_pro_allocation: wellness_wallet_histories[m].from_pro_allocation,
				            back_date_deduction: wellness_wallet_histories[m].back_date_deduction,
				            created_at: moment(wellness_wallet_histories[m].created_at).format("YYYY-MM-DD HH:mm:ss"),
				            updated_at: moment(wellness_wallet_histories[m].updated_at).format("YYYY-MM-DD HH:mm:ss")
				          }

				        // save customer wallet wellness histories
				        await companyModel.saveOne("medi_member_wallet_history", customerMedicalHistory)

						// check for wallet reset data
						let walletWellnessResetEmployee = await sql.table("medi_credit_reset")
						.where("wallet_history_id", wellness_wallet_histories[m].wellness_wallet_history_id)
						.where("spending_type", "wellness")
						.where("user_type", "employee")
						.first()

						if(walletWellnessResetEmployee) {
							
							let walletWellnessResetDataEmployee = {
								wallet_reset_id: walletWellnessResetEmployee.credit_reset_id,
								id: walletWellnessResetEmployee.id,
								wallet_history_id: walletWellnessResetEmployee.wallet_history_id,
								spending_type: 'wellness',
								user_type: 'employee',
								credit: walletWellnessResetEmployee.credit_reset,
								date_resetted: moment(walletWellnessResetEmployee.date_resetted).format("YYYY-MM-DD"),
								currency_type: "sgd",
								currency_value: 0,
								created_at: moment(walletWellnessResetEmployee.created_at).format("YYYY-MM-DD HH:mm:ss"),
								updated_at: moment(walletWellnessResetEmployee.updated_at).format("YYYY-MM-DD HH:mm:ss")
							}

							// save employee wallet medical histories credit reset
							await companyModel.saveOne("medi_wallet_resets", walletWellnessResetDataEmployee)
						}
					}

				// 	// get depedents account ids
				let user_ids = await sql.table("medi_employee_family_coverage_sub_accounts")
				.where("owner_id", user_data.UserID)
				.pluck('user_id')
				user_ids.push(user_data.UserID)
					// migrate out-of-network transactions
					let e_claims = await sql.table("medi_e_claim")
					.whereIn("user_id", user_ids)

					for(var ec = 0; ec < e_claims.length; ec++) {
						
						let eClaims = {
							out_of_network_transaction_id: e_claims[ec].e_claim_id,
							member_id: e_claims[ec].user_id,
							claim_type: e_claims[ec].service,
							provider: e_claims[ec].merchant,
							visit_date: moment(e_claims[ec].date).format("YYYY-MM-DD"),
							visit_time: e_claims[ec].time,
							claim_amount: e_claims[ec].claim_amount,
							amount: e_claims[ec].amount,
							cap_amount: e_claims[ec].cap_amount,
							spending_type: e_claims[ec].spending_type,
							claim_status: e_claims[ec].status,
							default_currency: e_claims[ec].default_currency,
							currency_type: e_claims[ec].currency_type,
							currency_value: e_claims[ec].currency_value,
							status_date: e_claims[ec].approved_date != "0000-00-00 00:00:00" ? moment(e_claims[ec].approved_date).format("YYYY-MM-DD HH:mm:ss") : null,
							status_reason: e_claims[ec].rejected_reason,
							created_at: moment(e_claims[ec].created_at).format("YYYY-MM-DD HH:mm:ss"),
							updated_at: moment(e_claims[ec].updated_at).format("YYYY-MM-DD HH:mm:ss")
						}

						// save member medi_out_of_network_transactions
						await companyModel.saveOne("medi_out_of_network_transactions", eClaims)
						// get e_claim docs
						let e_claim_docs = await sql.table("medi_e_claim_docs")
						.where("e_claim_id", e_claims[ec].e_claim_id)

						for(var ed = 0; ed < e_claim_docs.length; ed++) {
							let eClaimDocs = {
								out_of_network_file_id: e_claim_docs[ed].e_claim_doc_id,
								out_of_network_id: e_claim_docs[ed].e_claim_id,
								file_name: e_claim_docs[ed].doc_file,
								file_type: e_claim_docs[ed].file_type,
								file_receipt_type: 'transaction_receipt',
								created_at: moment(e_claim_docs[ed].created_at).format("YYYY-MM-DD HH:mm:ss"),
								updated_at: moment(e_claim_docs[ed].updated_at).format("YYYY-MM-DD HH:mm:ss")
							}

							// save medi_out_of_network_transactions files
							await companyModel.saveOne("medi_out_of_network_files", eClaimDocs)
						}
					}

					// get member plan history
					let medi_user_plan_histories = await sql.table("medi_user_plan_history")
					.where("user_id", user_data.UserID)

					for(var muph = 0; muph < medi_user_plan_histories.length; muph++) {
						
						var package_id = null
						let package = await sql.table("medi_user_package")
						.where("user_id", medi_user_plan_histories[muph].user_id)
						.orderBy('created_at', 'desc')
						.first()
						if(!package) {
							let defaultDataResult = await companyModel.getOne("medi_benefits_package_group", {default_selection: 1});
							package_id = defaultDataResult.benefits_package_group_id;
						} else {
							let package_data = await companyModel.getOne("medi_benefits_package_bundle", { benefits_care_package_id: package.care_package_id })
							package_id = package_data.package_group_id
						}
						let UserPlanHistory = {
							member_plan_history_id: medi_user_plan_histories[muph].user_plan_history_id,
							member_id: medi_user_plan_histories[muph].user_id,
							customer_active_plan_id: medi_user_plan_histories[muph].customer_active_plan_id,
							package_group_id: package_id,
							plan_start: moment(medi_user_plan_histories[muph].date).format("YYYY-MM-DD"),
							duration: "12 months",
							fixed: 1,
							type: medi_user_plan_histories[muph].type,
							created_at: moment(medi_user_plan_histories[muph].created_at).format("YYYY-MM-DD HH:mm:ss"),
							updated_at: moment(medi_user_plan_histories[muph].updated_at).format("YYYY-MM-DD HH:mm:ss")
						}
						
						// save member plan history
						await companyModel.saveOne("medi_member_plan_history", UserPlanHistory)
					}

				// get transaction lists
				let transactions = await sql.table("medi_transaction_history")
				.whereIn("UserID", user_ids)

				for(var t = 0; t < transactions.length; t++) {
					let clinic = await sql.table("medi_clinic")
					.where("ClinicID", transactions[t].ClinicID)
					.first();

					let clinic_temp = clinic.Name.replace(/\s/g, '');
					let clinic_name_format = clinic_temp.substring(0, 3);
					let trans_temp = (transactions[t].transaction_id.toString()).padStart(6,0);
					let transactionData = {
						in_network_transaction_id: transactions[t].transaction_id,
						transaction_id: `${ clinic_name_format }${ trans_temp }`,
						member_id: transactions[t].UserID,
						provider_id: transactions[t].ClinicID,
						doctor_id: transactions[t].DoctorID,
						appointment_id: transactions[t].AppointmenID,
						procedure_cost: transactions[t].procedure_cost,
						credit_cost: transactions[t].credit_cost,
						cash_cost: transactions[t].cash_cost,
						date_of_transaction: moment(transactions[t].date_of_transaction).format("YYYY-MM-DD HH:mm:ss"),
						claim_date: transactions[t].claim_date ? moment(transactions[t].claim_date).format("YYYY-MM-DD HH:mm:ss") : moment(transactions[t].created_at).format("YYYY-MM-DD HH:mm:ss"),
						paid_status: transactions[t].paid,
						co_paid_status: transactions[t].co_paid_status,
						co_paid_amount: transactions[t].co_paid_amount,
						consultation_fees: transactions[t].consultation_fees,
						cap_per_visit: transactions[t].cap_per_visit,
						direct_payment: transactions[t].health_provider_done,
						half_credits: transactions[t].half_credits,
						refunded: transactions[t].refunded,
						default_currency: transactions[t].default_currency,
						currency_type: transactions[t].currency_type,
						current_amount: transactions[t].currency_amount,
						spending_type: transactions[t].spending_type,
						deleted: transactions[t].deleted,
						deleted_at: transactions[t].deleted_at ? moment(transactions[t].deleted_at).format("YYYY-MM-DD HH:mm:ss") : null,
						lite_plan_enabled: transactions[t].lite_plan_enabled,
						lite_plan_credit_use: transactions[t].lite_plan_use_credits,
						peak_hour_amount: transactions[t].peak_hour_status,
						peak_hour_status: transactions[t].peak_hour_amount,
						created_at: moment(transactions[t].created_at).format("YYYY-MM-DD HH:mm:ss"),
						updated_at: moment(transactions[t].updated_at).format("YYYY-MM-DD HH:mm:ss")
					}

					if(transactions[t].mobile == 1 && transactions[t].health_provider_done == 0) {
						transactionData.transaction_made = "mobile";
					} else if(transactions[t].mobile == 0) {
						transactionData.transaction_made = "claim_type";
					} else if(transactions[t].mobile == 1 && transactions[t].health_provider_done == 1) {
						transactionData.transaction_made = "direct_payment";
					}

					// get clinic type
					let clinic_type = await sql.table("medi_clinic_types")
					.where("ClinicTypeID", clinic.Clinic_Type)
					.first();

					if(clinic_type.discount_type == "fixed") {
						transactionData.provider_discount = parseFloat(transactions[t].clinic_discount.replace("$", ""));
						transactionData.provider_discount_type = "fixed";
						transactionData.member_discount = "fixed";
						transactionData.member_discount_type = transactionData.provider_discount;
					} else {
						transactionData.provider_discount = parseFloat(transactions[t].clinic_discount.replace("$", ""));;
						transactionData.provider_discount_type = "percent";
						transactionData.member_discount = transactions[t].medi_percent;
						transactionData.member_discount_type = "percent"
					}

					// get services
					let services = await sql.table("medi_transaction_services")
					.where("transaction_id", transactions[t].transaction_id)
					.pluck("service_id")
					
					transactionData.procedure_ids = [];
					if(services.length > 0) {
						transactionData.procedure_ids = [...transactionData.procedure_ids, ...services]
					} else {
						transactionData.procedure_ids.push(transactions[t].ProcedureID);
					}

					let clinic_name = clinic.Name.split(' ').join('').toUpperCase()
					clinic_name = clinic_name.substring(0, 3);

					let transaction_id = await _.pad(transactions[t].transaction_id, 6, '0')
					transaction_id = `${clinic_name}${transaction_id}`
					transactionData.transaction_id = transaction_id;

					await companyModel.saveOne("medi_member_in_network_transactions", transactionData)
					
					// get in-network file transactions
					let docs_files = await sql.table("medi_user_image_receipt")
					.where("transaction_id", transactions[t].transaction_id)

					for(var df = 0; df < docs_files.length; df++) {
						let dFiles = {
							in_network_transaction_receipt_id: docs_files[df].image_receipt_id,
							in_network_transaction_id: docs_files[df].transaction_id,
							member_id: docs_files[df].user_id,
							file_name: docs_files[df].file,
							file_type: docs_files[df].type,
							file_receipt_type: 'transaction_receipt',
							created_at: moment(docs_files[df].created_at).format("YYYY-MM-DD HH:mm:ss"),
							updated_at: moment(docs_files[df].updated_at).format("YYYY-MM-DD HH:mm:ss")
						}
						await companyModel.saveOne("medi_in_network_transaction_receipt", dFiles)
					}
				}
				

				let company_block_access = await sql.table("medi_company_block_clinic_access")
				.where("customer_id", user_data.UserID)
				.where("account_type", "employee")

				for(var cba = 0; cba < company_block_access.length; cba++) {
					let companyBlockAccess = {
						company_block_clinic_access_id: company_block_access[cba].company_block_clinic_access_id,
						customer_id: company_block_access[cba].customer_id,
						clinic_id: company_block_access[cba].clinic_id,
						account_type: "company",
						status: company_block_access[cba].status,
						created_at: moment(company_block_access[cba].created_at).format("YYYY-MM-DD HH:mm:ss"),
						updated_at: moment(company_block_access[cba].updated_at).format("YYYY-MM-DD HH:mm:ss")
					}

					// save spending invoice in-network lists
					await companyModel.saveOne("medi_company_block_clinic_access", companyBlockAccess)
				}


				// user check in clinic
				let user_check_ins = await sql.table("medi_user_check_in_clinic")
				.where("user_id", user_data.UserID)

				for(var uci = 0; uci < user_check_ins.length; uci++) {
					var uci_data = {
						check_in_id: user_check_ins[uci].check_in_id,
						user_id: user_check_ins[uci].user_id,
						clinic_id: user_check_ins[uci].clinic_id,
						check_in_time: moment(user_check_ins[uci].check_in_time).format("YYYY-MM-DD"),
						check_out_time: moment(user_check_ins[uci].check_out_time).format("YYYY-MM-DD"),
						id: user_check_ins[uci].id,
						check_in_type: user_check_ins[uci].check_in_type,
						cap_per_visit: user_check_ins[uci].cap_per_visit,
						currency_symbol: user_check_ins[uci].currency_symbol,
						currency_value: user_check_ins[uci].currency_value,
						status: user_check_ins[uci].status,
						created_at: moment(user_check_ins[uci].created_at).format("YYYY-MM-DD HH:mm:ss"),
						updated_at: moment(user_check_ins[uci].updated_at).format("YYYY-MM-DD HH:mm:ss")
					}

					await companyModel.saveOne("medi_user_check_in_clinic", uci_data)
				}

				done++;

				console.log('data #:', x)
			}
		} else {
			console.log('Individual Member');
		}
	}
}

let count_data = members.data.length
delete members.data;
console.log('data', members)
return res.json({ count: done + "/" + count_data, data: members });
}

// create dependent migration from member
const createDependentMigrationFromMember = async (member_id) => {
	var members = await sql.table("medi_user")
	.where("UserType", 5)
	.whereIn('access_type', [2, 3])
	.where('UserID', member_id)

	members.data = members;
	let done = 0;

	for(var x = 0; x < members.data.length; x++) {
		let user_data = members.data[x];
		let check = await companyModel.getOne('medi_members', { member_id: user_data.UserID });

		if(!check) {
			console.log('create dependent member data....')
			let userData = {
				member_id: user_data.UserID,
				fullname: user_data.Name,
				nric: user_data.NRIC,
				email: user_data.Email,
				password: sha256("mednefits"),
				address: user_data.Address,
				country: user_data.Country,
				city: user_data.City,
				postal_code: user_data.Zip_Code,
				image: user_data.Image,
				phone_code: user_data.PhoneCode,
				phone_no: user_data.PhoneNo,
				otp_code: user_data.OTPCode,
				otp_status: user_data.OTPStatus,
				dob: user_data.DOB,
				bmi: user_data.Bmi,
				weight: user_data.Weight,
				height: user_data.Height,
				blood_type: user_data.Blood_Type,
				job_title: user_data.Job_Title,
				bank_account_number: user_data.bank_account,
				bank_code: user_data.bank_code,
				bank_brh: user_data.bank_brh,
				communication_type: user_data.communication_type,
				member_type: "dependent",
				active: user_data.Active,
				created_at: moment(user_data.created_at).format("YYYY-MM-DD HH:mm:ss"),
				updated_at: moment(user_data.created_at).format("YYYY-MM-DD HH:mm:ss")
			}

			// save member employee data
			await companyModel.saveOne("medi_members", userData)
			let family_coverage = await sql.table("medi_employee_family_coverage_sub_accounts")
			.where("user_id", user_data.UserID)
			.first();
			let familyCoverage = {
				member_covered_dependent_id: family_coverage.sub_account_id,
				owner_id: family_coverage.owner_id,
				member_id: family_coverage.user_id,
				relationship: family_coverage.relationship,
				user_type: family_coverage.user_type,
				deleted: family_coverage.deleted,
				deleted_at: family_coverage.deleted_at ? moment(family_coverage.deleted_at).format("YYYY-MM-DD HH:mm:ss") : null,
				created_at: moment(family_coverage.created_at).format("YYYY-MM-DD HH:mm:ss"),
				updated_at: moment(family_coverage.created_at).format("YYYY-MM-DD HH:mm:ss")
			}

			// save dependent covered dependents
			await companyModel.saveOne("medi_member_covered_dependents", familyCoverage)

			let dependents_plan_history = await sql.table("medi_dependent_plan_history")
			.where("user_id", user_data.UserID)
			let format = [];
			for(var p = 0; p < dependents_plan_history.length; p++) {
				let dependentPlanHistory = {
					dependent_plan_history_id: dependents_plan_history[p].dependent_plan_history_id,
					member_id: dependents_plan_history[p].user_id,
					dependent_plan_id: dependents_plan_history[p].dependent_plan_id,
					package_group_id: dependents_plan_history[p].package_group_id,
					plan_start: dependents_plan_history[p].plan_start,
					duration: dependents_plan_history[p].duration,
					type: dependents_plan_history[p].type,
					fixed: dependents_plan_history[p].fixed,
					created_at: moment(dependents_plan_history[p].created_at).format("YYYY-MM-DD HH:mm:ss"),
					updated_at: moment(dependents_plan_history[p].created_at).format("YYYY-MM-DD HH:mm:ss")
				}

				// save dependent plan history
				await companyModel.saveOne("medi_dependent_plan_history", dependentPlanHistory)
				// format.push(dependentPlanHistory)
			}

			done++;
		} else {
			console.log('already exist...')
		}
	}
	return true;
}

// create member migration from hr
const createEmployeeMemberDataMigrationFromHr = async (member_id) => {
	console.log('user_id', member_id)
	var members = await sql.table("medi_user").where('UserID', member_id)

	members.data = members;
	let done = 0;
	let plans = [];
	for(var x = 0; x < members.data.length; x++) {
		let user_data = members.data[x];
		let check = await companyModel.getOne('medi_members', { member_id: user_data.UserID });
		console.log('check member migration', check)
		
		if(!check) {
			let userData = {
				member_id: user_data.UserID,
				fullname: user_data.Name,
				nric: user_data.NRIC,
				email: user_data.Email,
				password: await sha256("mednefits"),
				address: user_data.Address,
				country: user_data.Country,
				city: user_data.City,
				postal_code: user_data.Zip_Code,
				image: user_data.Image,
				phone_code: user_data.PhoneCode,
				phone_no: user_data.PhoneNo,
				otp_code: user_data.OTPCode,
				otp_status: user_data.OTPStatus,
				dob: user_data.DOB,
				bmi: user_data.Bmi,
				weight: user_data.Weight,
				height: user_data.Height,
				blood_type: user_data.Blood_Type,
				job_title: user_data.Job_Title,
				bank_account_number: user_data.bank_account,
				bank_code: user_data.bank_code,
				bank_brh: user_data.bank_brh,
				communication_type: user_data.communication_type,
				member_type: "employee",
				active: user_data.Active,
				created_at: moment(user_data.created_at).format("YYYY-MM-DD HH:mm:ss"),
				updated_at: moment(user_data.created_at).format("YYYY-MM-DD HH:mm:ss")
			}

			// save member employee data
			await companyModel.saveOne("medi_members", userData)

			// check if member has a company assign
			let company_member = await sql.table("medi_corporate_members")
			.where("user_id", user_data.UserID)
			.first()
			if(company_member) {
				var corporate = await sql.table("medi_corporate")
				.where("corporate_id", company_member.corporate_id)
				.first()
				if(corporate) {
					var account = await sql.table("medi_customer_link_customer_buy")
					.where("corporate_id", corporate.corporate_id)
					.first()
					
					
					let corporateMemberData = {
						company_member_id: company_member.corporate_member_id,
						customer_id: account.customer_buy_start_id,
						member_id: company_member.user_id,
						deleted: company_member.removed_status,
						created_at: moment(company_member.created_at).format("YYYY-MM-DD HH:mm:ss"),
						updated_at: moment(company_member.updated_at).format("YYYY-MM-DD HH:mm:ss")
					}

					// save company member employee data
					await companyModel.saveOne("medi_company_members", corporateMemberData)

					// get member wallet
					let member_wallet = await sql.table("medi_e_wallet")
					.where("UserID", user_data.UserID)
					.first()

					
					let memberWallet = {
						member_wallet_id: member_wallet.wallet_id,
						member_id: parseInt(member_wallet.UserID),
						cap_amount: parseFloat(member_wallet.cap_per_visit_medical),
						medical_balance: parseFloat(member_wallet.balance),
						wellness_balance: parseFloat(member_wallet.wellness_balance),
						unlimited: 0,
						created_at: moment(member_wallet.created_at).format("YYYY-MM-DD HH:mm:ss"),
						updated_at: moment(member_wallet.updated_at).format("YYYY-MM-DD HH:mm:ss")
					}
					// save company member employee wallet data
					await companyModel.saveOne("medi_member_wallet", memberWallet)

					// get member wallet history medical
					let medical_wallet_histories = await sql.table("medi_wallet_history")
					.where("wallet_id", member_wallet.wallet_id)

					for(var m = 0; m < medical_wallet_histories.length; m++) {
						
						// let id = await global_helper.createUuID()
						let customerMedicalHistory = {
							wallet_history_id: medical_wallet_histories[m].wallet_history_id,
							employee_id: member_wallet.UserID,
							member_wallet_id: medical_wallet_histories[m].wallet_id,
							credit: medical_wallet_histories[m].credit,
							running_balance: medical_wallet_histories[m].running_balance,
							type: medical_wallet_histories[m].logs,
							spend: medical_wallet_histories[m].where_spend,
							customer_active_plan_id: medical_wallet_histories[m].customer_active_plan_id ? String(medical_wallet_histories[m].customer_active_plan_id) : null,
							transaction_id: medical_wallet_histories[m].id,
							wallet_type: "medical",
							currency_type: "sgd",
							currency_value: 0,
							from_pro_allocation: medical_wallet_histories[m].from_pro_allocation,
							back_date_deduction: medical_wallet_histories[m].back_date_deduction,
							created_at: moment(medical_wallet_histories[m].created_at).format("YYYY-MM-DD HH:mm:ss"),
							updated_at: moment(medical_wallet_histories[m].updated_at).format("YYYY-MM-DD HH:mm:ss")
						}

				        // save customer wallet medical histories
				        await companyModel.saveOne("medi_member_wallet_history", customerMedicalHistory)

						// check for wallet reset data
						let walletMedicalResetEmployee = await sql.table("medi_credit_reset")
						.where("wallet_history_id", medical_wallet_histories[m].wallet_history_id)
						.where("spending_type", "medical")
						.where("user_type", "employee")
						.first()

						if(walletMedicalResetEmployee) {
							
							let walletMedicalResetDataEmployee = {
								wallet_reset_id: walletMedicalResetEmployee.credit_reset_id,
								id: walletMedicalResetEmployee.id,
								wallet_history_id: walletMedicalResetEmployee.wallet_history_id,
								spending_type: 'medical',
								user_type: 'employee',
								credit: walletMedicalResetEmployee.credit_reset,
								date_resetted: moment(walletMedicalResetEmployee.date_resetted).format("YYYY-MM-DD"),
								currency_type: "sgd",
								currency_value: 0,
								created_at: moment(walletMedicalResetEmployee.created_at).format("YYYY-MM-DD HH:mm:ss"),
								updated_at: moment(walletMedicalResetEmployee.updated_at).format("YYYY-MM-DD HH:mm:ss")
							}

							// save employee wallet medical histories credit reset
							await companyModel.saveOne("medi_wallet_resets", walletMedicalResetDataEmployee)
						}
					}

					// get member wallet history wellness
					let wellness_wallet_histories = await sql.table("medi_wellness_wallet_history")
					.where("wallet_id", member_wallet.wallet_id)

					for(var m = 0; m < wellness_wallet_histories.length; m++) {
						
						// let wellness_id = await global_helper.createUuID()
						let customerMedicalHistory = {
				            // _id: wellness_id,
				            wallet_history_id: wellness_wallet_histories[m].wellness_wallet_history_id,
				            employee_id: member_wallet.UserID,
				            member_wallet_id: wellness_wallet_histories[m].wallet_id,
				            credit: wellness_wallet_histories[m].credit,
				            running_balance: wellness_wallet_histories[m].running_balance,
				            type: wellness_wallet_histories[m].logs,
				            spend: wellness_wallet_histories[m].where_spend,
				            customer_active_plan_id: wellness_wallet_histories[m].customer_active_plan_id ? String(wellness_wallet_histories[m].customer_active_plan_id) : null,
				            transaction_id: wellness_wallet_histories[m].id,
				            wallet_type: "wellness",
				            currency_type: "sgd",
				            currency_value: 0,
				            from_pro_allocation: wellness_wallet_histories[m].from_pro_allocation,
				            back_date_deduction: wellness_wallet_histories[m].back_date_deduction,
				            created_at: moment(wellness_wallet_histories[m].created_at).format("YYYY-MM-DD HH:mm:ss"),
				            updated_at: moment(wellness_wallet_histories[m].updated_at).format("YYYY-MM-DD HH:mm:ss")
				          }

				        // save customer wallet wellness histories
				        await companyModel.saveOne("medi_member_wallet_history", customerMedicalHistory)

						// check for wallet reset data
						let walletWellnessResetEmployee = await sql.table("medi_credit_reset")
						.where("wallet_history_id", wellness_wallet_histories[m].wellness_wallet_history_id)
						.where("spending_type", "wellness")
						.where("user_type", "employee")
						.first()

						if(walletWellnessResetEmployee) {
							
							let walletWellnessResetDataEmployee = {
								wallet_reset_id: walletWellnessResetEmployee.credit_reset_id,
								id: walletWellnessResetEmployee.id,
								wallet_history_id: walletWellnessResetEmployee.wallet_history_id,
								spending_type: 'wellness',
								user_type: 'employee',
								credit: walletWellnessResetEmployee.credit_reset,
								date_resetted: moment(walletWellnessResetEmployee.date_resetted).format("YYYY-MM-DD"),
								currency_type: "sgd",
								currency_value: 0,
								created_at: moment(walletWellnessResetEmployee.created_at).format("YYYY-MM-DD HH:mm:ss"),
								updated_at: moment(walletWellnessResetEmployee.updated_at).format("YYYY-MM-DD HH:mm:ss")
							}

							// save employee wallet medical histories credit reset
							await companyModel.saveOne("medi_wallet_resets", walletWellnessResetDataEmployee)
						}
					}

				// 	// get depedents account ids
				let user_ids = await sql.table("medi_employee_family_coverage_sub_accounts")
				.where("owner_id", user_data.UserID)
				.pluck('user_id')
				user_ids.push(user_data.UserID)
					// migrate out-of-network transactions
					let e_claims = await sql.table("medi_e_claim")
					.whereIn("user_id", user_ids)

					for(var ec = 0; ec < e_claims.length; ec++) {
						
						let eClaims = {
							out_of_network_transaction_id: e_claims[ec].e_claim_id,
							member_id: e_claims[ec].user_id,
							claim_type: e_claims[ec].service,
							provider: e_claims[ec].merchant,
							visit_date: moment(e_claims[ec].date).format("YYYY-MM-DD"),
							visit_time: e_claims[ec].time,
							claim_amount: e_claims[ec].amount,
							spending_type: e_claims[ec].spending_type,
							claim_status: e_claims[ec].status,
							status_date: e_claims[ec].approved_date != "0000-00-00 00:00:00" ? moment(e_claims[ec].approved_date).format("YYYY-MM-DD HH:mm:ss") : null,
							status_reason: e_claims[ec].rejected_reason,
							created_at: moment(e_claims[ec].created_at).format("YYYY-MM-DD HH:mm:ss"),
							updated_at: moment(e_claims[ec].updated_at).format("YYYY-MM-DD HH:mm:ss")
						}

						// save member medi_out_of_network_transactions
						await companyModel.saveOne("medi_out_of_network_transactions", eClaims)
						// get e_claim docs
						let e_claim_docs = await sql.table("medi_e_claim_docs")
						.where("e_claim_id", e_claims[ec].e_claim_id)

						for(var ed = 0; ed < e_claim_docs.length; ed++) {
							let eClaimDocs = {
								out_of_network_file_id: e_claim_docs[ed].e_claim_doc_id,
								out_of_network_id: e_claim_docs[ed].e_claim_id,
								file_name: e_claim_docs[ed].doc_file,
								file_type: e_claim_docs[ed].file_type,
								file_receipt_type: 'transaction_receipt',
								created_at: moment(e_claim_docs[ed].created_at).format("YYYY-MM-DD HH:mm:ss"),
								updated_at: moment(e_claim_docs[ed].updated_at).format("YYYY-MM-DD HH:mm:ss")
							}

							// save medi_out_of_network_transactions files
							await companyModel.saveOne("medi_out_of_network_files", eClaimDocs)
						}
					}

					// get member plan history
					let medi_user_plan_histories = await sql.table("medi_user_plan_history")
					.where("user_id", user_data.UserID)

					for(var muph = 0; muph < medi_user_plan_histories.length; muph++) {
						
						var package_id = null
						let package = await sql.table("medi_user_package")
						.where("user_id", medi_user_plan_histories[muph].user_id)
						.orderBy('created_at', 'desc')
						.first()
						if(!package) {
							let defaultDataResult = await companyModel.getOne("medi_benefits_package_group", {default_selection: 1});
							package_id = defaultDataResult.benefits_package_group_id;
						} else {
							let package_data = await companyModel.getOne("medi_benefits_package_bundle", { benefits_care_package_id: package.care_package_id })
							package_id = package_data.package_group_id
						}
						let UserPlanHistory = {
							member_plan_history_id: medi_user_plan_histories[muph].user_plan_history_id,
							member_id: medi_user_plan_histories[muph].user_id,
							customer_active_plan_id: medi_user_plan_histories[muph].customer_active_plan_id,
							package_group_id: package_id,
							plan_start: moment(medi_user_plan_histories[muph].date).format("YYYY-MM-DD"),
							duration: "12 months",
							fixed: 1,
							type: medi_user_plan_histories[muph].type,
							created_at: moment(medi_user_plan_histories[muph].created_at).format("YYYY-MM-DD HH:mm:ss"),
							updated_at: moment(medi_user_plan_histories[muph].updated_at).format("YYYY-MM-DD HH:mm:ss")
						}
						
						// save member plan history
						await companyModel.saveOne("medi_member_plan_history", UserPlanHistory)
					}

				// get transaction lists
				let transactions = await sql.table("medi_transaction_history")
				.whereIn("UserID", user_ids)

				for(var t = 0; t < transactions.length; t++) {
					let clinic = await sql.table("medi_clinic")
					.where("ClinicID", transactions[t].ClinicID)
					.first();

					let clinic_temp = clinic.Name.replace(/\s/g, '');
					let clinic_name_format = clinic_temp.substring(0, 3);
					let trans_temp = (transactions[t].transaction_id.toString()).padStart(6,0);
					let transactionData = {
						in_network_transaction_id: transactions[t].transaction_id,
						transaction_id: `${ clinic_name_format }${ trans_temp }`,
						member_id: transactions[t].UserID,
						provider_id: transactions[t].ClinicID,
						doctor_id: transactions[t].DoctorID,
						appointment_id: transactions[t].AppointmenID,
						procedure_cost: transactions[t].procedure_cost,
						credit_cost: transactions[t].credit_cost,
						cash_cost: transactions[t].cash_cost,
						date_of_transaction: moment(transactions[t].date_of_transaction).format("YYYY-MM-DD HH:mm:ss"),
						claim_date: transactions[t].claim_date ? moment(transactions[t].claim_date).format("YYYY-MM-DD HH:mm:ss") : moment(transactions[t].created_at).format("YYYY-MM-DD HH:mm:ss"),
						paid_status: transactions[t].paid,
						co_paid_status: transactions[t].co_paid_status,
						co_paid_amount: transactions[t].co_paid_amount,
						consultation_fees: transactions[t].consultation_fees,
						cap_per_visit: transactions[t].cap_per_visit,
						direct_payment: transactions[t].health_provider_done,
						half_credits: transactions[t].half_credits,
						refunded: transactions[t].refunded,
						default_currency: transactions[t].default_currency,
						currency_type: transactions[t].currency_type,
						current_amount: transactions[t].currency_amount,
						spending_type: transactions[t].spending_type,
						deleted: transactions[t].deleted,
						deleted_at: transactions[t].deleted_at ? moment(transactions[t].deleted_at).format("YYYY-MM-DD HH:mm:ss") : null,
						lite_plan_enabled: transactions[t].lite_plan_enabled,
						lite_plan_credit_use: transactions[t].lite_plan_use_credits,
						peak_hour_amount: transactions[t].peak_hour_status,
						peak_hour_status: transactions[t].peak_hour_amount,
						created_at: moment(transactions[t].created_at).format("YYYY-MM-DD HH:mm:ss"),
						updated_at: moment(transactions[t].updated_at).format("YYYY-MM-DD HH:mm:ss")
					}

					if(transactions[t].mobile == 1 && transactions[t].health_provider_done == 0) {
						transactionData.transaction_made = "mobile";
					} else if(transactions[t].mobile == 0) {
						transactionData.transaction_made = "claim_type";
					} else if(transactions[t].mobile == 1 && transactions[t].health_provider_done == 1) {
						transactionData.transaction_made = "direct_payment";
					}

					// get clinic type
					let clinic_type = await sql.table("medi_clinic_types")
					.where("ClinicTypeID", clinic.Clinic_Type)
					.first();

					if(clinic_type.discount_type == "fixed") {
						transactionData.provider_discount = parseFloat(transactions[t].clinic_discount.replace("$", ""));
						transactionData.provider_discount_type = "fixed";
						transactionData.member_discount = "fixed";
						transactionData.member_discount_type = transactionData.provider_discount;
					} else {
						transactionData.provider_discount = parseFloat(transactions[t].clinic_discount.replace("$", ""));;
						transactionData.provider_discount_type = "percent";
						transactionData.member_discount = transactions[t].medi_percent;
						transactionData.member_discount_type = "percent"
					}

					// get services
					let services = await sql.table("medi_transaction_services")
					.where("transaction_id", transactions[t].transaction_id)
					.pluck("service_id")
					
					transactionData.procedure_ids = [];
					if(services.length > 0) {
						transactionData.procedure_ids = [...transactionData.procedure_ids, ...services]
					} else {
						transactionData.procedure_ids.push(transactions[t].ProcedureID);
					}

					let clinic_name = clinic.Name.split(' ').join('').toUpperCase()
					clinic_name = clinic_name.substring(0, 3);

					let transaction_id = await _.pad(transactions[t].transaction_id, 6, '0')
					transaction_id = `${clinic_name}${transaction_id}`
					transactionData.transaction_id = transaction_id;

					await companyModel.saveOne("medi_member_in_network_transactions", transactionData)
					
					// get in-network file transactions
					let docs_files = await sql.table("medi_user_image_receipt")
					.where("transaction_id", transactions[t].transaction_id)

					for(var df = 0; df < docs_files.length; df++) {
						let dFiles = {
							in_network_transaction_receipt_id: docs_files[df].image_receipt_id,
							in_network_transaction_id: docs_files[df].transaction_id,
							member_id: docs_files[df].user_id,
							file_name: docs_files[df].file,
							file_type: docs_files[df].type,
							file_receipt_type: 'transaction_receipt',
							created_at: moment(docs_files[df].created_at).format("YYYY-MM-DD HH:mm:ss"),
							updated_at: moment(docs_files[df].updated_at).format("YYYY-MM-DD HH:mm:ss")
						}
						await companyModel.saveOne("medi_in_network_transaction_receipt", dFiles)
					}
				}
				// return res.json(plans);
				done++;

				console.log('data #:', x)
			}
		} else {
			console.log('Individual Member');
		}
	}
}

return true;
}

const createDependentMigration = async (req, res, next) => {
	if(req.body.id) {
		var members = await sql.table("medi_user")
		.where("UserType", 5)
		.whereIn('access_type', [2, 2])
		.where('UserID', req.body.id)
		members.data = members;
	} else {
		var members = await sql.table("medi_user")
		.where("UserType", 5)
		.whereIn('access_type', [2, 2])
		.paginate(5000, req.body.page, true)
	}

	let done = 0;

	for(var x = 0; x < members.data.length; x++) {
		let user_data = members.data[x];
		let check = await companyModel.getOne('medi_members', { member_id: user_data.UserID });

		if(!check) {
			console.log('create dependent member data....')
			let userData = {
				member_id: user_data.UserID,
				fullname: user_data.Name,
				nric: user_data.NRIC,
				email: user_data.Email,
				password: sha256("mednefits"),
				address: user_data.Address,
				country: user_data.Country,
				city: user_data.City,
				postal_code: user_data.Zip_Code,
				image: user_data.Image,
				phone_code: user_data.PhoneCode,
				phone_no: user_data.PhoneNo,
				otp_code: user_data.OTPCode,
				otp_status: user_data.OTPStatus,
				dob: user_data.DOB,
				bmi: user_data.Bmi,
				weight: user_data.Weight,
				height: user_data.Height,
				blood_type: user_data.Blood_Type,
				job_title: user_data.Job_Title,
				bank_account_number: user_data.bank_account,
				bank_code: user_data.bank_code,
				bank_brh: user_data.bank_brh,
				communication_type: user_data.communication_type,
				member_type: "dependent",
				active: user_data.Active,
				created_at: moment(user_data.created_at).format("YYYY-MM-DD HH:mm:ss"),
				updated_at: moment(user_data.created_at).format("YYYY-MM-DD HH:mm:ss")
			}

			// save member employee data
			await companyModel.saveOne("medi_members", userData)
			let family_coverage = await sql.table("medi_employee_family_coverage_sub_accounts")
			.where("user_id", user_data.UserID)
			.first();
			if(family_coverage) {
				let familyCoverage = {
					member_covered_dependent_id: family_coverage.sub_account_id,
					owner_id: family_coverage.owner_id,
					member_id: family_coverage.user_id,
					relationship: family_coverage.relationship,
					user_type: family_coverage.user_type,
					deleted: family_coverage.deleted,
					deleted_at: family_coverage.deleted_at ? moment(family_coverage.deleted_at).format("YYYY-MM-DD HH:mm:ss") : null,
					created_at: moment(family_coverage.created_at).format("YYYY-MM-DD HH:mm:ss"),
					updated_at: moment(family_coverage.created_at).format("YYYY-MM-DD HH:mm:ss")
				}
	
				// save dependent covered dependents
				await companyModel.saveOne("medi_member_covered_dependents", familyCoverage)
	
				let dependents_plan_history = await sql.table("medi_dependent_plan_history")
				.where("user_id", user_data.UserID)
				let format = [];
				for(var p = 0; p < dependents_plan_history.length; p++) {
					let dependentPlanHistory = {
						dependent_plan_history_id: dependents_plan_history[p].dependent_plan_history_id,
						member_id: dependents_plan_history[p].user_id,
						dependent_plan_id: dependents_plan_history[p].dependent_plan_id,
						package_group_id: dependents_plan_history[p].package_group_id,
						plan_start: dependents_plan_history[p].plan_start,
						duration: dependents_plan_history[p].duration,
						type: dependents_plan_history[p].type,
						fixed: dependents_plan_history[p].fixed,
						created_at: moment(dependents_plan_history[p].created_at).format("YYYY-MM-DD HH:mm:ss"),
						updated_at: moment(dependents_plan_history[p].created_at).format("YYYY-MM-DD HH:mm:ss")
					}
	
					// save dependent plan history
					await companyModel.saveOne("medi_dependent_plan_history", dependentPlanHistory)
					// format.push(dependentPlanHistory)
				}
	
				done++;
			}
		} else {
			console.log('already exist...')
		}
	}
	let count_data = members.data.length
	delete members.data;
	console.log('data', members)
	return res.json({ count: done + "/" + count_data, data: members });
}

const createHealthTypesMigration = async (req, res, next) => {
	var types = await sql.table("medi_clinic_types")

	for(var t = 0; t < types.length; t++) {
		let check = await companyModel.getOne('medi_health_provider_types', { health_provider_type_id: types[t].ClinicTypeID });

		if(!check) {
			let temp = {
				health_provider_type_id: types[t].ClinicTypeID,
				name: types[t].Name,
				image_url: types[t].clinic_type_image_url,
				position: types[t].position,
				active: types[t].Active,
				discount_enabled_status: 0,
				discount_type: types[t].discount_type,
				discount_value: types[t].discount_amount,
				co_paid_enabled_status: 0,
				co_paid_status: 1,
				co_paid_amount: types[t].co_paid,
				service_head: types[t].head,
				service_sub: types[t].sub,
				service_sub_id: types[t].sub_id,
				spending_type: types[t].spending_type,
				lite_plan_enabled: types[t].lite_plan_enabled,
				allow_selection: types[t].allow_selection,
				created_at: types[t].created_at,
				updated_at: types[t].updated_at
			}

			await companyModel.saveOne("medi_health_provider_types", temp)
			console.log('created....')
		} else {
			console.log('already done');
		}
	}

	return res.send('ok');
}

const createClinicMigration = async (req, res, next) => {
	var clinics = await sql.table("medi_clinic")

	for(var t = 0; t < clinics.length; t++) {
		let check = await companyModel.getOne('medi_health_providers', { health_provider_id: clinics[t].ClinicID });

		if(!check) {
			let user = await sql.table("medi_user")
			.where('Ref_ID', clinics[t].ClinicID)
			.where('UserType', 3)
			.first();
			console.log('clinics', clinics)
			let temp = {
				health_provider_id: clinics[t].ClinicID,
				email_address: user.Email,
				password: sha256("mednefits"),
				reset_token: user.ResetLink,
				name: clinics[t].Name,
				description: clinics[t].Description,
				custom_title: clinics[t].Custom_title,
				website_link: clinics[t].Website,
				provider_image: clinics[t].image,
				address: clinics[t].Address,
				city: clinics[t].City,
				state: clinics[t].State,
				country: clinics[t].Country,
				district: clinics[t].District,
				phone_code: clinics[t].Phone_Code,
				phone_no: clinics[t].Phone,
				mrt: clinics[t].MRT,
				opening_schedule: clinics[t].Opening,
				calendar_type: clinics[t].Calendar_type,
				calendar_day: clinics[t].Calendar_day,
				calendar_duration: clinics[t].Calendar_duration,
				calendar_start_hour: clinics[t].Calendar_Start_Hour,
				required_pin: clinics[t].Require_pin,
				active: clinics[t].Active,
				billing_name: clinics[t].billing_name,
				billing_address: clinics[t].billing_address,
				billing_status: clinics[t].billing_status == "true" ? 1 : 0,
				currency_type: "sgd",
				currency_value: 0,
				discount_status: 1,
				mednefits_discount_status: 1,
				peak_hour_status: clinics[t].peak_hour_status,
				co_paid_enabled: clinics[t].co_paid_status,
				co_paid_status: clinics[t].co_paid_status,
				co_paid_amount: parseInt(clinics[t].co_paid_amount),
				consultation_gst_status: clinics[t].consultation_gst_status,
				consultation_fees: clinics[t].consultation_fees,
				gst_value: clinics[t].gst_amount,
				test_account: clinics[t].test_account,
				configure: clinics[t].configure,
				deleted: clinics[t].Active == 0 ? 1 : 0,
				deleted_at: null,
				created_at: user.created_at,
				updated_at: user.created_at
			}

			let clinic_type = await sql.table("medi_clinic_types")
			.where("ClinicTypeID", clinics[t].Clinic_Type)
			.first();
			console.log('clinic_type', clinic_type)
			let clinic_type_id = null
			if(!clinic_type) {
				clinic_type_id = 1;
			} else {
				clinic_type_id = clinic_type.ClinicTypeID;
			}

			clinic_type = await sql.table("medi_clinic_types")
			.where("ClinicTypeID", clinic_type_id)
			.first();

			if(clinic_type.discount_type == "fixed") {
				temp.discount_value = parseFloat(clinics[t].discount.replace("$", ""));
				temp.discount_type = "fixed";
				temp.mednefits_discount_type = "fixed";
				temp.mednefits_discount_value = parseFloat(clinics[t].discount.replace("$", ""));
			} else {
				temp.discount_value = parseFloat(clinics[t].discount.replace("$", ""));
				temp.discount_type = "percent";
				temp.mednefits_discount_value = parseFloat(clinics[t].discount.replace("$", ""));
				temp.mednefits_discount_type = "percent"
			}

			temp.payment_details = new Object();
			temp.provider_type_ids = new Array();
			temp.communication_emails = new Array();
			temp.provider_type_ids.push(clinics[t].Clinic_Type);
			temp.communication_emails.push(clinics[t].communication_email);

			let payment_details = await sql.table("medi_payment_partner_details")
			.where("partner_id", clinics[t].ClinicID)
			.first();
			if(payment_details) {
				temp.payment_details = {
					bank_name: payment_details.bank_name,
					bank_account_type: payment_details.bank_account_type,
					bank_account_number: payment_details.bank_account_number,
					billing_address: payment_details.billing_address
				}
			} else {
				temp.payment_details = {
					bank_name: null,
					bank_account_type: null,
					bank_account_number: null,
					billing_address: null
				}
			}
			
			await companyModel.saveOne("medi_health_providers", temp)

			// get services
			let services = await sql.table("medi_clinic_procedure").where("ClinicID", clinics[t].ClinicID)

			for(var s = 0; s < services.length; s++) {
				let service = {
					health_provider_service_id: services[s].ProcedureID,
					provider_id: services[s].ClinicID,
					service_name: services[s].Name,
					description: services[s].Description,
					duration: services[s].Duration,
					duration_type: services[s].Duration_Format,
					price: services[s].Price,
					currency_type: "sgd",
					active: services[s].Active,
					position: services[s].Position,
					scan_pay_show: services[s].scan_pay_show,
					created_at: services[s].created_at,
					updated_at:services[s].updated_at
				}
				console.log('created services.....')
				await companyModel.saveOne("medi_health_provider_services", service)
			}

			console.log('created....' + clinics[t].ClinicID)
		} else {
			console.log('already create')
		}
	}

	return res.send('ok..');
}

module.exports = {
	createHrMigration,
	createBenefitsDependencies,
	createEmployeeMemberDataMigration,
	createDependentMigration,
	createHealthTypesMigration,
	createClinicMigration
}
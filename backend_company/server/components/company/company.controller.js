require('express-async-errors');

const APPPATH = require('app-root-path');
const config = require(`${APPPATH}/config/config`);
const sha256 = require('sha256');
const companyModel = require('./company.model');
const generator = require('generate-password');
const generatePassword = require('password-generator');
const validate = require('./company.validator');
const mailHelper = require(`${APPPATH}/server/helpers/mailer.helper`);
const pdfHelper = require(`${APPPATH}/server/helpers/pdf.helper`);
const smsHelper = require(`${APPPATH}/server/helpers/sms.helper`);
const moment = require('moment');
const { map } = require('p-iteration');
require('dotenv').config();
const ucfirst = require('ucfirst');
const format=require('format-number');
const PlanHelper = require(`${APPPATH}/server/helpers/plan.helper.js`);
const UserHelper = require(`${APPPATH}/server/helpers/user.helpers.js`);
// const GroupPackage = require('./../../helpers/groupPackage.helper.js');
const PlanType = require(`${APPPATH}/server/helpers/userPlanType.helper.js`);
const jwt = require('jsonwebtoken');
const Bundle = require(`${APPPATH}/server/helpers/bundle.helper.js`);
const UserPackage = require(`${APPPATH}/server/helpers/userPackage.helper.js`);
const UserPlanHistory = require(`${APPPATH}/server/helpers/userPlanHistory.helper.js`);
const WalletHelper = require(`${APPPATH}/server/helpers/wallet.helper.js`);
const WalletHistoryHelper = require(`${APPPATH}/server/helpers/walletHistory.helper.js`);
const CustomerCreditsHelper = require(`${APPPATH}/server/helpers/customerCredits.helper.js`);
const CustomerCreditLogsHelper = require(`${APPPATH}/server/helpers/customerCreditLogs.helper.js`);
const CustomerPlanStatus = require(`${APPPATH}/server/helpers/customerPlanStatus.helper.js`);
const PlanTierUsers = require(`${APPPATH}/server/helpers/planTierUsers.helper.js`);
const PackagePlanGroup = require(`${APPPATH}/server/helpers/packagePlanGroup.helper.js`);
const FamilyCoverageAccounts = require(`${APPPATH}/server/helpers/familyCoverageAccounts.helper.js`);
const DependentTempEnrollment = require(`${APPPATH}/server/helpers/dependentTempEnrollment.helper.js`);
const DependentPlanStatus = require(`${APPPATH}/server/helpers/dependentPlanStatus.helper.js`);
const XLSX = require(`${APPPATH}/server/helpers/xlsx.helper.js`);
const global_helper = require(`${APPPATH}/server/helpers/global.helper.js`);
const mongoose = require('mongoose');


async function errorFunc(res, params){
    await companyModel.transactionRollback()
    return res.status(400).json(params)
}

const excelEnrollment = async(req, res, next) => {
    req.fileExtension = ['xlsx','xlsm','xls']
    config.uploadTemp.single('employee_enrollment')(req, {}, async function (err) {
        if (err)
        {
             res.json({
                success: false,
                message: 'File not uploaded.',
                errorMessage: err
            })
        }
        else if (!req.fileIsAllowed) res.json({
            success: false,
            message: 'File not authorized format.',
            errorMessage: err
        })

        let employees = await XLSX.readEmployeeDependents(req.serverFileName,
            [
             "First Name",
             "Last Name",
             "NRIC/FIN",
             "Date of Birth",
             "Work Email",
             "Mobile",
             "Postal Code",
             "Medical Credits",
             "Wellness Credits",
             "Start Date"
            ]
        );

        let customerID = req.body.customer_id;
        req.body = employees;
        req.body.customer_id = customerID;
        console.log(req.body);
        // req.body.plan_tier_id = null;
        // req.body.customer_id = 1;
        // return res.json(employees);
        await addTempEmployee(req, res, next)

      });
}

async function createCompany( req, res, next ) {
    try {
        console.log(req.body);
        let customerID = null;
        let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
        let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");
        let data = req.body;
        let accessibility = data.health_spending_account;
        let resetToken = sha256(moment().format('YYYYMMDDhhmmss'))
        let accountTypes = ['insurance_bundle', 'stand_alone_plan', 'trial_plan', 'lite_plan'];
        let planStart = data.emmployee_plan_start ? moment(data.emmployee_plan_start).format('YYYY-MM-DD') : null;
        let litePlan = false;
        let paymentDue = null;
        let activePlanExtension = null;
        let activePlanExtensionInvoice = null;
        let active_plan_number = null;
        let password_show = null;

        if(accessibility)
        {
            qrPayment = 1;
            wallet = 1;
        } else {
            qrPayment = 0;
            wallet = 0;
        }
        /**
         * Data Insertion Section
         * */

        /**
         * Customer Purchase
        */
        let customerPurchase = {
            // customer_id: 1, //mariaDB id
            cover_type: 1, // default
            status: 1, //default
            agree_status: 0, //default to be asked
            peak_status: data.peak_status || 0, // new variable
            wallet: wallet,
            qr: qrPayment,
            currency_type: 'sgd',//default
            currency_value: 0,//default
            created_at: createdAt,
            updated_at: updatedAt
        }

        isValid = await validate.joiValidate(customerPurchase, validate.createCompany.customerPurchaseValidation, true)

        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }

        /**
         * Customer Business Information
        */
        let businessInformation = {
            // business_information_id: 1, //mariaDB id
            customer_id: 1, // dummy
            company_name: data.company_name,
            company_address: data.company_address,
            nature_of_busines: "N/A",
            postal_code: parseInt(data.company_postal_code),
            establish: 1900,
            contact: {
                first_name: data.business_contact_first_name,
                last_name: data.business_contact_last_name,
                job_title: data.business_job_title,
                email: data.business_contact_email,
                phone: data.business_phone,
                hr_email: data.business_portal_email,
                created_at: createdAt,
                updated_at: updatedAt,
                send_email_communication: (data.business_send_email_comm_related ? 1 : 0),
                send_email_billing: (data.business_send_email_bill_related ? 1 : 0)
            },
            created_at: createdAt,
            updated_at: updatedAt
        }

        isValid = await validate.joiValidate(businessInformation, validate.createCompany.businessInformationValidation, true)

        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }


        /**
         * Customer Billing Contact
         */

        let customerBillingContact = {
            // billing_contact_id: 1, //MariaDB
            customer_id: 1,// dummy customerPurchaseResult.customer_id,
            billing_name: data.billing_name,
            billing_address: data.billing_address,
            billing_first_name: data.billing_first_name,
            billing_last_name: data.billing_last_name,
            billing_email: data.billing_email,
            billing_phone: data.billing_phone,
            billing_postal_code: data.billing_postal_code,
            bill_send_email_bill_related: data.bill_send_email_bill_related || 0,
            bill_send_email_comm_related: data.bill_send_email_comm_related || 0,
            created_at: createdAt,
            updated_at: updatedAt
        }

        isValid = await validate.joiValidate(customerBillingContact, validate.createCompany.customerBillingContactValidation, true)

        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }

        /**
         * Customer HR Dashboard
         */

        let customerHRDashboard = {
            // hr_account_id: 1,//mariaDB
            customer_id: 1,// dummy customerPurchaseResult.customer_id,
            email: data.business_portal_email,
            password: data.business_portal_password,
            type: 'hr', //default
            reset_token: resetToken,
            active: 1, //default
            created_at: createdAt,
            updated_at: updatedAt
        }

        isValid = await validate.joiValidate(customerHRDashboard, validate.createCompany.customerHRDashboardValidation, true)

        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }


        if(!data.generate_password)
        {
            if((data.business_portal_password).length <= 0)
            {
                return res.json({
                    status: false,
                    message: "Business Portal Password is required."
                });
            }

            password = sha256(data.business_portal_password);
            password_show = data.business_portal_password;
        } else {
            password = sha256('mednefits');
            password_show = 'mednefits';
        }

        customerHRDashboard.password = password;

        let emailExists = await companyModel.getOne('medi_customer_hr_accounts', {email: data.business_portal_email});

        if(emailExists)
        {
            return res.status(400).json({
                status: false,
                message: "Email Address already taken."
            });
        }

        /**
         * Customer Plans
         * Parent Of active plans and plans status
         */
        let customerPlans = {
            // customer_plan_id: 1, //mariaDB
            customer_id: 1,// dummy customerPurchaseResult.customer_id,
            plan_start: planStart,
            active: 1, //default
            account_type: data.employee_account_type,
            secondary_account_type: data.employee_secondary_account_type,
            plan_extension_enable: data.employee_payment_status && data.employee_payment_status == true ? 1 : 0,
            created_at: createdAt,
            updated_at: updatedAt
        }

        isValid = await validate.joiValidate(customerPlans, validate.createCompany.customerPlansValidation, true)

        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }

        if(customerPlans.account_type == "insurance_bundle") {
            console.log("hey");
            if(!customerPlans.secondary_account_type || customerPlans.secondary_account_type == undefined) {
                return errorFunc(res,{
                    status: false,
                    message: "Employee Plan Secondary Account for Insurance Bundle Type must one of the follow [pro_plan_bundle, insurance_bundle_lite]"
                });
            }

            let accountTypesPlanBundle = ['pro_plan_bundle', 'insurance_bundle_lite'];
            if(accountTypesPlanBundle.indexOf(customerPlans.secondary_account_type) <= -1)
            {
                return errorFunc(res,{
                    status: false,
                    message: "Employee Plan Secondary Account for Insurance Bundle Type must one of the follow [pro_plan_bundle, insurance_bundle_lite]"
                })
            }
        }

        if(customerPlans.account_type == "trial_plan") {
            if(!customerPlans.secondary_account_type || customerPlans.secondary_account_type == undefined) {
                return errorFunc(res,{
                    status: false,
                    message: "Employee Plan Secondary Account for Trial Plan Type must one of the follow [trial_plan_lite, pro_trial_plan_bundle]"
                });
            }

            let accountTypesPlanTrial = ['trial_plan_lite', 'pro_trial_plan_bundle'];
            if(accountTypesPlanTrial.indexOf(customerPlans.secondary_account_type) <= -1)
            {
                return errorFunc(res,{
                    status: false,
                    message: "Employee Plan Secondary Account for Trial Plan Type must one of the follow [trial_plan_lite, pro_trial_plan_bundle]"
                })
            }
        }

        /**
         * Customer Active Plans
         * Parent Of Active Plan Invoices, Active Plan Extenstions and Employee Plan Payment Refund Details
        */

        if(planStart == null) {
            return errorFunc(res,{
                status: false,
                message: "Employee Plan Start is required"
            })
        }

        let customerActivePlans = {
            // customer_active_plan_id: 1, //mariaDB
            customer_id: 1,// dummy customerPurchase.customer_id,
            customer_plan_id: 1,// dummy customerPlansResult.customer_plan_id,
            expired: 0, //default
            employees: data.employee_employees,
            plan_start: planStart,
            duration: data.employee_plan_duration,
            new_head_count: 0, //default
            account_type: data.employee_account_type,
            secondary_account_type: data.employee_secondary_account_type,
            deleted: 0, //default
            deleted_at: null, //default
            plan_extension_enable: 0,
            created_at: createdAt,
            updated_at: updatedAt
        }

        isValid = await validate.joiValidate(customerActivePlans, validate.createCompany.customerActivePlansValidation, true)

        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }

        let customerPlanStatus = {
            // customer_plan_status_id: 1, // mariaDB
            customer_id: 1, // dummy
            customer_plan_id: 1, // dummy
            employee_head_count: data.employee_employees,
            employee_enrolled_count: 0,
            created_at: createdAt,
            updated_at: updatedAt
        }

        isValid = await validate.joiValidate(customerPlanStatus, validate.createCompany.customerPlanStatusValidation, true)

        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }

        /**
         * Active Plan Invoices
        */
        let activePlanInvoices = {
            // active_plan_invoice_id: 1, // Maria DB
            customer_id: 1, // dummy
            customer_active_plan_id: 1, // dummy
            employees: data.employee_employees,
            invoice_number: "111111",
            plan_start: planStart,
            duration: data.employee_plan_duration,
            individual_price: data.employee_plan_price, //dummy
            invoice_date: moment().format("YYYY-MM-DD"),// dummy
            invoice_due_date: moment().add(1, 'months').format("YYYY-MM-DD"),// dummy
            refund: 0,
            currency_type: 'sgd',
            currency_value: 0,
            isPaid: data.employee_payment_status && data.employee_payment_status == true ? 1 : 0,
            transaction_trail: {
                payment_type: "cheque",// dummy
                transaction_date: moment().format("YYYY-MM-DD"),   // dummy
                referrence_no: null,// dummy
                remarks: null,// dummy
                paid_amount: 1// dummy
            },
            created_at: createdAt,
            updated_at: updatedAt
        }

        isValid = await validate.joiValidate(activePlanInvoices, validate.createCompany.activePlanInvoicesValidation, true)

        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }

        /* check for employee plan extension */
        if(data.employee_plan_extension && data.employee_plan_extension == true) {
            /**Medi active plan extension */

            activePlanExtension = {
                // active_plan_extensions_id: 1, //mariaDB
                customer_id: 1, // dummy
                customer_active_plan_id: 1, //dummy
                plan_start: data.employee_plan_start_extension,
                invoice_date: moment().format("YYYY-MM-DD"),
                invoice_due_date: moment().add(1, 'months').format("YYYY-MM-DD"),
                duration: data.employee_duration_extension,
                individual_price: data.employee_plan_price_extension,
                paid: data.employee_payment_status_extension && data.employee_payment_status_extension == true ? 1 : 0,
                active: 1,
                enable: 0,
                account_type: data.employee_account_type_extension,
                secondary_account_type: data.employee_secondary_account_type_extension,
                created_at: createdAt,
                updated_at: updatedAt
            }

            console.log(activePlanExtension);

            isValid = await validate.joiValidate(activePlanExtension, validate.createCompany.activePlanExtension, true)

            if(typeof isValid != 'boolean')
            {
                return errorFunc(res,{
                    status: false,
                    message: isValid.details[0].message
                })
            }

            if(activePlanExtension.account_type == "insurance_bundle") {
                console.log("hey");
                if(!activePlanExtension.secondary_account_type || activePlanExtension.secondary_account_type == undefined) {
                    return errorFunc(res,{
                        status: false,
                        message: "Employee Plan Extension Secondary Account for Insurance Bundle Type must one of the follow [pro_plan_bundle, insurance_bundle_lite]"
                    });
                }

                let accountTypesExtensionBundle = ['pro_plan_bundle', 'insurance_bundle_lite'];
                if(accountTypesExtensionBundle.indexOf(activePlanExtension.secondary_account_type) <= -1)
                {
                    return errorFunc(res,{
                        status: false,
                        message: "Employee Plan Extension Secondary Account for Insurance Bundle Type must one of the follow [pro_plan_bundle, insurance_bundle_lite]"
                    })
                }
            }

            if(activePlanExtension.account_type == "trial_plan") {
                if(!activePlanExtension.secondary_account_type || activePlanExtension.secondary_account_type == undefined) {
                    return errorFunc(res,{
                        status: false,
                        message: "Employee Plan Extension Secondary Account for Trial Plan Type must one of the follow [trial_plan_lite, pro_trial_plan_bundle]"
                    });
                }

                let accountTypesExtensionTrial = ['trial_plan_lite', 'pro_trial_plan_bundle'];
                if(accountTypesExtensionTrial.indexOf(activePlanExtension.secondary_account_type) <= -1)
                {
                    return errorFunc(res,{
                        status: false,
                        message: "Employee Plan Extension Secondary Account for Trial Plan Type must one of the follow [trial_plan_lite, pro_trial_plan_bundle]"
                    })
                }
            }

            if(activePlanExtension.account_type == "stand_alone_plan" || activePlanExtension.account_type == "lite_plan") {
                activePlanExtension.secondary_account_type = null;
            }

            activePlanExtensionInvoice = {
                // plan_extension_invoice_id: 1, //mariaDB
                active_plan_extensions_id: 1, // dummy
                customer_id: 1, // dummy
                employees: data.employee_employees,
                invoice_number: '000000', // dummy
                plan_start: moment(data.employee_plan_start_extension).format("YYYY-MM-DD"),
                duration: data.employee_duration_extension,
                individual_price: 1,// dummy
                invoice_date: moment(data.employee_plan_invoice_date_extension).format("YYYY-MM-DD"),
                invoice_due: moment(data.employee_plan_invoice_date_extension).add(1, 'months').format("YYYY-MM-DD"),
                refund: 0,
                paid: data.employee_payment_status_extension && data.employee_payment_status_extension == true ? 1 : 0,
                currency_type: "sgd",
                currency_value: null,
                transaction_trail: {
                    payment_type: "cheque", // dummy
                    transaction_date: moment().format("YYYY-MM-DD"),    // dummy
                    referrence_no: null, // dummy
                    remarks: null, // dummy
                    paid_amount: 1 // dummy
                },
                created_at: createdAt,
                updated_at: updatedAt
            }

            isValid = await validate.joiValidate(activePlanExtensionInvoice, validate.createCompany.activePlanExtensionInvoiceValidation, true)

            if(typeof isValid != 'boolean')
            {
                return errorFunc(res,{
                    status: false,
                    message: isValid.details[0].message
                })
            }

        }

        let dependentPlans = {};
        let dependentInvoices = {};
        if(data.dependent_status && data.dependent_status == true)
        {

            /**
             * Dependent Plans
             * */
            dependentPlans = {
                // dependent_plan_id: 1, //mariaDB
                customer_plan_id: 1,//customerPlansResult.customer_plan_id,
                customer_id: 1,//customerPlansResult.customer_plan_id,
                customer_active_plan_id: 1,//customerActivePlansResult.customer_active_plan_id,
                total_dependents: data.dependents_employees,
                plan_start: moment(data.dependent_plan_start).format("YYYY-MM-DD"),
                duration: data.dependent_plan_duration,
                enable: 1,
                account_type: data.dependent_account_type,
                secondary_account_type: data.dependent_secondary_account_type || null,
                type: "plan_extension", //['active_plan', 'plan_extension']
                tagged_active_plan_invoice : 1,//[0, 1]
                created_at: createdAt,
                updated_at: updatedAt
            }

            isValid = await validate.joiValidate(dependentPlans, validate.createCompany.dependentPlansValidation, true)

            if(typeof isValid != 'boolean')
            {
                return errorFunc(res,{
                    status: false,
                    message: isValid.details[0].message
                })
            }

            if(dependentPlans.account_type == "insurance_bundle") {
                if(!dependentPlans.secondary_account_type || dependentPlans.secondary_account_type == undefined) {
                    return errorFunc(res,{
                        status: false,
                        message: "Dependent Plan Secondary Account for Insurance Bundle Type must one of the follow [pro_plan_bundle, insurance_bundle_lite]"
                    });
                }

                let accountTypesDependentBundle = ['pro_plan_bundle', 'insurance_bundle_lite'];
                if(accountTypesDependentBundle.indexOf(dependentPlans.secondary_account_type) <= -1)
                {
                    return errorFunc(res,{
                        status: false,
                        message: "Dependent Plan Secondary Account for Insurance Bundle Type must one of the follow [pro_plan_bundle, insurance_bundle_lite]"
                    })
                }
            }

            if(dependentPlans.account_type == "trial_plan") {
                if(!dependentPlans.secondary_account_type || dependentPlans.secondary_account_type == undefined) {
                    return errorFunc(res,{
                        status: false,
                        message: "Dependent Plan Secondary Account for Trial Type must one of the follow [trial_plan_lite, pro_trial_plan_bundle]"
                    });
                }

                let accountTypesDependentBundle = ['trial_plan_lite', 'pro_trial_plan_bundle'];
                if(accountTypesDependentBundle.indexOf(dependentPlans.secondary_account_type) <= -1)
                {
                    return errorFunc(res,{
                        status: false,
                        message: "Dependent Plan Secondary Account for Trial Type must one of the follow [trial_plan_lite, pro_trial_plan_bundle]"
                    })
                }
            }

            /**
             * Dependent Invoices
             */
            dependentInvoices = {
                // dependent_invoice_id: 1, //mariaDB
                dependent_plan_id: 1,//dependentPlansResult.dependent_plan_id,
                invoice_number: "000000",//invoiceNumber,
                invoice_date: moment(data.dependent_plan_start).format("YYYY-MM-DD"),
                invoice_due: moment().add(1, 'months').format("YYYY-MM-DD"),
                total_dependents: data.dependents_employees,
                individual_price: data.dependent_plan_price,
                plan_start: data.dependent_plan_start,
                currency_type: "sgd",
                currency_value: null,
                isPaid: 0,
                billing_information: {
                    contact_name: data.billing_name,
                    contact_number: data.billing_phone,
                    contact_address: data.billing_address,
                    contact_email: data.billing_email
                },
                transaction_trail: {
                    payment_type: null,
                    transaction_date: null,
                    referrence_no: null,
                    remarks: null,
                    paid_amount: null
                },
                created_at: createdAt,
                updated_at: updatedAt
            }

            isValid = await validate.joiValidate(dependentInvoices, validate.createCompany.dependentInvoicesValidation, true)

            if(typeof isValid != 'boolean')
            {
                return errorFunc(res,{
                    status: false,
                    message: isValid.details[0].message
                })
            }
        }
        // end of validation

        /**
         * Save Customer Purchase
         * */
         // delete _id;
        customerPurchase._id = await global_helper.createUuID();
        let customerPurchaseResult = await companyModel.saveOne('medi_customer_purchase', customerPurchase);

        console.log('customerPurchaseResult', customerPurchaseResult);
        customerID = customerPurchaseResult._id;
        if(typeof customerPurchaseResult != "object" && Object.keys(customerPurchaseResult).length <= 0)
        {
            return errorFunc(res,{
                status: false,
                message: "Data not saved."
            })
        }

        if(typeof customerPurchaseResult == "object")
        {
            /**
             * Customer Business Information
            */
            businessInformation.customer_id = customerID;
            businessInformation._id = await global_helper.createUuID();
            /**
             * Save Customer Business Information
             * */
            let businessInformationResult = await companyModel.saveOne(
                'medi_customer_business_information', businessInformation);

            if(typeof businessInformationResult != "object" && Object.keys(businessInformationResult).length <= 0)
            {
                return errorFunc(res,{
                    status: false,
                    message: "Data not saved."
                })
            }

            /**
             * Customer Billing Contact
             */
            customerBillingContact.customer_id = customerID;
            customerBillingContact._id = await global_helper.createUuID();
            /**
             * Save Customer Billing Contact
             * */
            let customerBillingContactResult = await companyModel.saveOne(
                'medi_customer_billing_contact', customerBillingContact);

            if(typeof customerBillingContactResult != "object" && Object.keys(customerBillingContactResult).length <= 0)
            {
                return errorFunc(res,{
                    status: false,
                    message: "Data not saved."
                })
            }
            /**
             * Customer HR Dashboard
             */
            customerHRDashboard.customer_id = customerID;
            customerHRDashboard._id = await global_helper.createUuID();
            /**
             * Save Customer HR Dashboard
             * */
            let customerHRDashboardResult = await companyModel.saveOne(
                'medi_customer_hr_accounts', customerHRDashboard);

            if(typeof customerHRDashboardResult != "object" && Object.keys(customerHRDashboardResult).length <= 0)
            {
                return errorFunc(res,{
                    status: false,
                    message: "Data not saved."
                })
            }

            /**
             * Customer Plans
             * Parent Of active plans and plans status
             */
            customerPlans.customer_id = customerID;
            customerPlans._id = await global_helper.createUuID();
            /**
             * Save Customer Plans
             * */
            let customerPlansResult = await companyModel.saveOne(
                "medi_customer_plans", customerPlans);

            if(typeof customerPlansResult != "object" && Object.keys(customerPlansResult).length <= 0)
            {
                return errorFunc(res,{
                    status: false,
                    message: "Data not saved."
                })
            }

            /**
             * Customer Active Plans
             * Parent Of Active Plan Invoices, Active Plan Extenstions and Employee Plan Payment Refund Details
            */
            active_plan_number = await companyModel.getMaxValue('medi_customer_active_plans', 'active_plan_number');

            if(active_plan_number) {
                active_plan_number = active_plan_number.active_plan_number + 1;
            } else {
                active_plan_number = 1;
            }
            customerActivePlans._id = await global_helper.createUuID();
            customerActivePlans.customer_id = customerID;
            customerActivePlans.customer_plan_id = customerPlansResult._id;
            customerActivePlans.active_plan_number = active_plan_number;
            /**
             * Save Customer Plan Status
             * */
            let customerActivePlansResult = await companyModel.saveOne(
                'medi_customer_active_plans', customerActivePlans);

            if(typeof customerActivePlansResult != "object" && Object.keys(customerActivePlansResult).length <= 0)
            {
                return errorFunc(res,{
                    status: false,
                    message: "Data not saved."
                })
            }

            /**
             * Customer Plan Status
            */
            customerPlanStatus._id = await global_helper.createUuID();
            customerPlanStatus.customer_id = customerID;
            customerPlanStatus.customer_plan_id = customerPlansResult._id;

            /**
             * Save Customer Plan Status
             * */
            let customerPlanStatusResult = await companyModel.saveOne(
                'medi_customer_plan_status', customerPlanStatus);

            if(typeof customerPlanStatusResult != "object" && Object.keys(customerPlanStatusResult).length <= 0)
            {
                return errorFunc(res,{
                    status: false,
                    message: "Data not saved."
                })
            }

            // Active Plan Invoices
            let activePlanInvoicesCount = await companyModel.countCollection('medi_active_plan_invoices');
            let activeInvoicesCount = 0;

            if(activePlanInvoicesCount == 0) {
                activeInvoicesCount = 1;
            } else {
                activeInvoicesCount = activePlanInvoicesCount + 1;
            }
            let invoiceNumber = (activeInvoicesCount.toString()).padStart(6,0)

            if(data.employee_payment_status && data.employee_payment_status == true)
            {
                paymentDue = moment().add(1, 'months').format("YYYY-MM-DD");
            }

            if(customerActivePlans.account_type == "insurance_bundle" && customerActivePlans.secondary_account_type == "insurance_bundle_lite")
            {
                litePlan = true;
            }
            else if(customerActivePlans.account_type == "lite_plan")
            {
                litePlan = true;
            }

            invoiceNumberFormat = (litePlan ? `LMC${invoiceNumber}` : `OMC${invoiceNumber}`)

            let invoiceTrail = (activePlanInvoices.isPaid == 1 ?
                {
                    payment_type: "cheque",
                    transaction_date: moment(paymentDue).format("YYYY-MM-DD"),
                    referrence_no: null,
                    remarks: null,
                    paid_amount: (parseFloat(data.employees) * parseFloat(data.plan_price))
                } :
                {
                    payment_type: null,
                    transaction_date: null,
                    referrence_no: null,
                    remarks: null,
                    paid_amount: null
                }
            )

            /**
             * Active Plan Invoices
            */
            activePlanInvoices._id = await global_helper.createUuID();
            activePlanInvoices.customer_id = customerID;
            activePlanInvoices.customer_active_plan_id = customerActivePlansResult._id;
            activePlanInvoices.invoice_number = invoiceNumberFormat;
            // activePlanInvoices.individual_price = individualPrice;
            activePlanInvoices.invoice_date = customerActivePlansResult.created_at;
            // activePlanInvoices.invoice_due_date = paymentDue;
            activePlanInvoices.transaction_trail = invoiceTrail;

            /**
             * Save Active Plan Invoices
             * */
            let activePlanInvoicesResult = await companyModel.saveOne(
                'medi_active_plan_invoices', activePlanInvoices);

            if(typeof activePlanInvoicesResult != "object" && Object.keys(activePlanInvoicesResult).length <= 0)
            {
                return errorFunc(res,{
                    status: false,
                    message: "Data not saved."
                })
            }

            /**
             * Allowed Plan Extension
            */

            if(data.employee_plan_extension && data.employee_plan_extension == true)
            {
                /**
                 * Active Plan Extention
                */
                let activePlanExtensions = {
                    // plan_extension_invoice_id: 1, //mariaDB
                    customer_id: customerID,
                    customer_active_plan_id: customerActivePlansResult._id,
                    plan_start: moment(activePlanExtension.plan_start).format("YYYY-MM-DD"), //ata.,
                    invoice_date: moment(activePlanExtension.invoice_date).format("YYYY-MM-DD"),
                    invoice_due_date: moment(activePlanExtension.invoice_due_date).add(1, 'months').format("YYYY-MM-DD"),
                    duration: activePlanExtension.duration,
                    individual_price: activePlanExtension.individual_price,
                    paid: activePlanExtension.paid,
                    active: 1,
                    enable: 1,
                    account_type: activePlanExtension.account_type,
                    secondary_account_type: activePlanExtension.secondary_account_type,
                    created_at: createdAt,
                    updated_at: updatedAt
                }

                isValid = await validate.joiValidate(activePlanExtensions, validate.createCompany.activePlanExtensionsValidation, true)

                if(typeof isValid != 'boolean')
                {
                    return errorFunc(res,{
                        status: false,
                        message: isValid.details[0].message
                    })
                }

                activePlanExtensions._id = await global_helper.createUuID();
                /**
                 * Save Active Plan Invoices
                 * */
                let activePlanExtensionsResult = await companyModel.saveOne(
                    'medi_active_plan_extensions', activePlanExtensions);

                if(typeof activePlanExtensionsResult != "object" && Object.keys(activePlanExtensionsResult).length <= 0)
                {
                    return errorFunc(res,{
                        status: false,
                        message: "Data not saved."
                    })
                }

                /**
                 * Medi Active Plan Ectension Invoice
                 */
                let invoiceExtensionTrail = (activePlanExtensionInvoice.paid == 1 ?
                    {
                        payment_type: "cheque",
                        transaction_date: moment().format("YYYY-MM-DD"),
                        referrence_no: null,
                        remarks: null,
                        paid_amount: (parseFloat(data.employees) * parseFloat(data.plan_price))
                    } :
                    {
                        payment_type: null,
                        transaction_date: null,
                        referrence_no: null,
                        remarks: null,
                        paid_amount: null
                    }
                )

                activePlanExtensionInvoice._id = await global_helper.createUuID();
                activePlanExtensionInvoice.active_plan_extensions_id = activePlanExtensionsResult._id;
                activePlanExtensionInvoice.customer_id = customerID;
                activePlanExtensionInvoice.invoice_number = invoiceNumberFormat;
                // activePlanExtensionInvoice.individual_price = individualPrice;
                activePlanExtensionInvoice.transaction_trail = invoiceExtensionTrail;

                /**
                 * Save Medi Active Plan Ectension Invoice
                 * */
                let activePlanExtensionInvoiceResult = await companyModel.saveOne(
                    'medi_active_plan_extension_invoices', activePlanExtensionInvoice);

                if(typeof activePlanExtensionInvoiceResult != "object" && Object.keys(activePlanExtensionInvoiceResult).length <= 0)
                {
                    return errorFunc(res,{
                        status: false,
                        message: "Data not saved."
                    })
                }

            }

            /**
             * Dependents Section
            */

            if(data.dependent_status && data.dependent_status == true)
            {
                /**
                 * Dependent Plans
                 * */
                dependentPlans._id = await global_helper.createUuID();
                dependentPlans.customer_plan_id = customerPlansResult._id;
                dependentPlans.customer_id = customerID;
                dependentPlans.customer_active_plan_id = customerActivePlansResult._id;
                /**
                 * Save Customer Wallets
                 * */
                let dependentPlansResult = await companyModel.saveOne(
                    'medi_dependent_plans', dependentPlans);

                if(typeof dependentPlansResult != "object" && Object.keys(dependentPlansResult).length <= 0)
                {
                    return errorFunc(res,{
                        status: false,
                        message: "Data not saved."
                    })
                }

                /**
                 * Dependent Invoices
                 */
                let dependentInvoiceTrail = (data.dependent_payment_status && data.dependent_payment_status == true ?
                    {
                        payment_type: "cheque",
                        transaction_date: moment().format("YYYY-MM-DD"),
                        referrence_no: null,
                        remarks: null,
                        paid_amount: (parseFloat(dependentInvoices.total_dependents) * parseFloat(dependentInvoices.individual_price))
                    } :
                    {
                        payment_type: null,
                        transaction_date: null,
                        referrence_no: null,
                        remarks: null,
                        paid_amount: null
                    }
                )

                dependentInvoices._id = await global_helper.createUuID();
                dependentInvoices.dependent_plan_id = dependentPlansResult._id;
                dependentInvoices.invoice_number = invoiceNumber;
                dependentInvoices.transaction_trail = dependentInvoiceTrail;
                /**
                 * Save Dependent Invoices
                 * */
                let dependentInvoicesResult = await companyModel.saveOne(
                    'medi_dependent_invoices', dependentInvoices);

                if(typeof dependentInvoicesResult != "object" && Object.keys(dependentInvoicesResult).length <= 0)
                {
                    return errorFunc(res,{
                        status: false,
                        message: "Data not saved."
                    })
                }

                if(data.dependent_plan_extension_status && data.dependent_plan_extension_status == true)
                {
                    dependentPlans = {
                        customer_plan_id: customerPlansResult._id,
                        customer_id: customerID,
                        customer_active_plan_id: customerActivePlansResult._id,
                        total_dependents: data.dependents_employees,
                        plan_start: moment(data.plan_start_extension_dependents).format("YYYY-MM-DD"),
                        duration: data.duration_extension_dependents,
                        enable: 1,
                        account_type: data.secondary_account_type_extension,
                        secondary_account_type: data.secondary_account_type_extension_dependents || null,
                        type: "plan_extension", //['active_plan', 'plan_extension']
                        tagged_active_plan_invoice : "",//[0, 1]
                        created_at: createdAt,
                        updated_at: updatedAt
                    }

                    isValid = await validate.joiValidate(dependentPlans, validate.createCompany.dependentPlansValidation, true)

                    if(typeof isValid != 'boolean')
                    {
                        return errorFunc(res,{
                            status: false,
                            message: isValid.details[0].message
                        })
                    }

                    dependentPlans._id = await global_helper.createUuID();
                    /**
                     * Save Customer Wallets
                     * */
                    let dependentPlansResult = await companyModel.saveOne(
                        'medi_dependent_plans', dependentPlans);

                    if(typeof dependentPlansResult != "object" && Object.keys(dependentPlansResult).length <= 0)
                    {
                        return errorFunc(res,{
                            status: false,
                            message: "Data not saved."
                        })
                    }

                    /**
                     * Dependent Invoices
                     */
                    dependentInvoiceTrail = (data.payment_status_dependents ?
                        {
                            payment_type: "cheque",
                            transaction_date: moment().format("YYYY-MM-DD"),
                            referrence_no: null,
                            remarks: null,
                            paid_amount: (parseFloat(data.dependents_employees) * parseFloat(data.plan_price_dependents))
                        } :
                        {
                            payment_type: null,
                            transaction_date: null,
                            referrence_no: null,
                            remarks: null,
                            paid_amount: null
                        }
                    )

                    dependentInvoices = {
                        // dependent_invoice_id: 1, //mariaDB
                        dependent_plan_id: dependentPlansResult._id,
                        invoice_number: invoiceNumberFormat,
                        invoice_date: moment().format("YYYY-MM-DD"),
                        invoice_due: moment().add(1, 'months').format("YYYY-MM-DD"),
                        total_dependents: data.dependents_employees,
                        individual_price: data.dependent_plan_price,
                        plan_start: moment(dependentPlans.plan_start).format("YYYY-MM-DD"),
                        currency_type: "sgd",
                        currency_value: null,
                        billing_information: {
                            contact_name: data.billing_name,
                            contact_number: data.billing_phone,
                            contact_address: data.billing_address,
                            contact_email: data.billing_email
                        },
                        transaction_trail: dependentInvoiceTrail,
                        created_at: createdAt,
                        updated_at: updatedAt
                    }

                    isValid = await validate.joiValidate(dependentInvoices, validate.createCompany.dependentInvoicesValidation, true)

                    if(typeof isValid != 'boolean')
                    {
                        errorFunc(res,{
                            status: false,
                            message: isValid.details[0].message
                        })
                    }

                    console.log(dependentInvoices);
                    dependentInvoices._id = await global_helper.createUuID();
                    /**
                     * Save Dependent Invoices
                     * */
                    dependentInvoicesResult = await companyModel.saveOne(
                        'medi_dependent_invoices', dependentInvoices);

                    if(typeof dependentInvoicesResult != "object" && Object.keys(dependentInvoicesResult).length <= 0)
                    {
                        return errorFunc(res,{
                            status: false,
                            message: "Data not saved."
                        })
                    }

                }

                /**
                 * Dependent Plan Status
                 */
                let dependentPlanStatus = {
                    // dependent_plan_status_id: 1, //mariaDB
                    customer_id: customerID,
                    customer_plan_id: customerPlansResult._id,
                    dependent_head_count: data.dependents_employees,
                    dependent_enrolled_count: 0,
                    created_at: createdAt,
                    updated_at: updatedAt
                }

                isValid = await validate.joiValidate(dependentPlanStatus, validate.createCompany.dependentPlanStatusValidation, true)

                if(typeof isValid != 'boolean')
                {
                    return errorFunc(res,{
                        status: false,
                        message: isValid.details[0].message
                    })
                }

                dependentPlanStatus._id = await global_helper.createUuID();
                /**
                 * Save Dependent Plan Status
                 * */
                let dependentPlanStatusResult = await companyModel.saveOne(
                    'medi_dependent_plan_status', dependentPlanStatus);

                if(typeof dependentPlanStatusResult != "object" && Object.keys(dependentPlanStatusResult).length <= 0)
                {
                    return errorFunc(res,{
                        status: false,
                        message: "Data not saved."
                    })
                }
            }

            /**
             * Customer Wallets
             * */
            let customerWallets = {
                // customer_wallet_id: 1,//mariaDB
                customer_id: customerID,
                medical_balance: data.medical_spending_credits || 0,
                wellness_balance: data.wellness_spending_credits || 0,
                currency_type: "sgd",
                currency_value: 0,
                created_at: createdAt,
                updated_at: updatedAt
            }

            isValid = await validate.joiValidate(customerWallets, validate.createCompany.customerWalletsValidation, true)

            if(typeof isValid != 'boolean')
            {
                return errorFunc(res,{
                    status: false,
                    message: isValid.details[0].message
                })
            }

            customerWallets._id = await global_helper.createUuID();
            /**
             * Save Customer Wallets
             * */
            let customerWalletsResult = await companyModel.saveOne(
                'medi_customer_wallets', customerWallets);

            if(typeof customerWalletsResult != "object" && Object.keys(customerWalletsResult).length <= 0)
            {
                return errorFunc(res,{
                    status: false,
                    message: "Data not saved."
                })
            }

            /**
             * Customer Spending Wallet History
             */
            if(parseFloat(data.medical_spending_credits) > 0)
            {
                let customerMedicalHistory = {
                    // customer_wallet_history_id: 1, //mariadb
                    customer_id: customerID,
                    customer_wallet_id: customerWalletsResult._id,
                    credit: parseFloat(data.medical_spending_credits),
                    running_balance: parseFloat(data.medical_spending_credits),
                    type: 'admin_added_credits',
                    employee_id: null,
                    customer_active_plan_id: customerActivePlansResult._id,
                    wallet_type: "medical",
                    currency_type: "sgd",
                    currency_value: 0,
                    createdAt: createdAt,
                    updatedAt: updatedAt
                }

                isValid = await validate.joiValidate(customerMedicalHistory, validate.createCompany.customerMedicalHistoryValidation, true)

                if(typeof isValid != 'boolean')
                {
                    return errorFunc(res,{
                        status: false,
                        message: isValid.details[0].message
                    })
                }

                customerMedicalHistory._id = await global_helper.createUuID();
                /**
                 * Save Customer Wallets
                 * */
                let customerMedicalHistoryResult = await companyModel.saveOne(
                    'medi_customer_wallet_history', customerMedicalHistory);

                if(typeof customerMedicalHistoryResult != "object" && Object.keys(customerMedicalHistoryResult).length <= 0)
                {
                    return errorFunc(res,{
                        status: false,
                        message: "Data not saved."
                    })
                }
            }

            /**
             * Customer Wellness Wallet History
             */
            if(parseFloat(data.wellness_spending_credits) > 0)
            {
                let customerWellnessHistory = {
                    // customer_wallet_history_id: 1, //mariadb
                    customer_id: customerID,
                    customer_wallet_id: customerWalletsResult._id,
                    credit: parseFloat(data.wellness_spending_credits),
                    running_balance: parseFloat(data.wellness_spending_credits),
                    type: 'admin_added_credits',
                    employee_id: null,
                    customer_active_plan_id: customerActivePlansResult._id,
                    wallet_type: "wellness",
                    currency_type: "sgd",
                    currency_value: 0,
                    createdAt: createdAt,
                    updatedAt: updatedAt
                }

                isValid = await validate.joiValidate(customerWellnessHistory, validate.createCompany.customerWellnessHistoryValidation, true)

                if(typeof isValid != 'boolean')
                {
                    return errorFunc(res,{
                        status: false,
                        message: isValid.details[0].message
                    })
                }

                customerWellnessHistory._id = await global_helper.createUuID();
                /**
                 * Save Customer Wallets
                 * */
                let customerWellnessHistoryResult = await companyModel.saveOne(
                    'medi_customer_wallet_history', customerWellnessHistory);

                if(typeof customerWellnessHistoryResult != "object" && Object.keys(customerWellnessHistoryResult).length <= 0)
                {
                    return errorFunc(res,{
                        status: false,
                        message: "Data not saved."
                    })
                }
            }

            // Deposits
            if(parseFloat(data.deposit_medical) > 0 || parseFloat(data.deposit_wellness) > 0)
            {

                let depoCreditsCount = await companyModel.countCollection('medi_customer_spending_deposit_credits');
                let depoCredits_number = (depoCreditsCount.toString()).padStart(6,0)
                let depoDate = moment().format("YYYY-MM-DD");
                let depoDueDate = moment().add(1, 'months').format("YYYY-MM-DD");

                let customerSpendingDepositCredits = {
                    // customer_deposit_id: 1, //mariaDB
                    customer_active_plan_id: customerActivePlansResult._id,
                    customer_id: customerID,
                    medical_credits: parseFloat(data.med_spending_credits),
                    wellness_credits: parseFloat(data.well_spending_credits),
                    medical_percent: (parseFloat(data.deposit_medical)/100),
                    wellness_percent: (parseFloat(data.deposit_wellness)/100),
                    invoice_number: `DEP${depoCredits_number}`,
                    invoice_date: depoDate,
                    invoice_due: depoDueDate,
                    paid_amount: 0,
                    paid_date: moment().format("YYYY-MM-DD"),
                    payment_status: 0,
                    payment_remarks: "",
                    currency_type: "sgd",
                    currency_value: null,
                    created_at: createdAt,
                    updated_at: updatedAt
                }


                isValid = await validate.joiValidate(customerSpendingDepositCredits, validate.createCompany.customerSpendingDepositCreditsValidation, true)

                if(typeof isValid != 'boolean')
                {
                    return errorFunc(res,{
                        status: false,
                        message: isValid.details[0].message
                    })
                }

                customerSpendingDepositCredits._id = await global_helper.createUuID();
                /**
                 * Save Customer Wallets
                 * */
                let customerSpendingDepositCreditsResult = await companyModel.saveOne(
                    'medi_customer_spending_deposit_credits', customerSpendingDepositCredits);

                if(typeof customerSpendingDepositCreditsResult != "object" && Object.keys(customerSpendingDepositCreditsResult).length <= 0)
                {
                    return errorFunc(res,{
                        status: false,
                        message: "Data not saved."
                    })
                }

            }

            /**
             * Send E-mail
             *  */
            let domainURL = 'http://medicloud.local';
            let emailData = new Array();

            if(req.get('host') == 'https://admin.medicloud.sg')
            {
                domainURL = 'https://medicloud.sg';
            }
            else if(req.get('host') == 'http://stage.medicloud.sg')
            {
                domainURL = 'http://staging.medicloud.sg';
            }

            if(data.send_email)
            {
                var data_sent = {
                    email: data.business_contact_email,
                    emailName: `${data.business_contact_first_name} ${data.business_contact_last_name}`,
                    company_name: data.company_name,
                    subject: 'MEDNEFITS WELCOME PACK (FOR COMPANY)',
                    email_page: '../email_templates/mednefits_standalone_pending',
                    password: password_show,
                    account_link: domainURL + '/company-benefits-dashboard-login'
                }

                if(data.employee_payment_status == false)
                {
                    console.log('sulod dri')
                    let results = await PlanHelper.planInvoiceDetails(activePlanInvoicesResult._id);
                    if(results) {
                        let data = {
                            pdf_page: 'plan_invoice_pending.ejs',
                            context: results,
                            options: {
                                filename: `${ results.company } ${ results.invoice_number }.pdf`
                            }
                        }
                        let attachment = await pdfHelper.processPdf(data, res)
                        data_sent.attachments = await [{
                                                    filename: `${ results.company } ${ results.invoice_number }.pdf`,
                                                    path: attachment.path,
                                                    contentType: 'application/pdf',
                                                    customer: true
                                                }]
                    }
                }


                let result = mailHelper.sendMail(data_sent);
                console.log('result', result);
            }

        }
        return res.status(201).json({
            status: true,
            message: "Success",
            customer_id: customerID
        });

    } catch(error) {
        console.log(error);
        return errorFunc(res,{
            status: false,
            message: error
        })
    }
}

async function createCompanyold( req, res, next )
{
    try {

        /**
         * Variable List
         */
        console.log(req.body)
        let getReturnID = null;
        let getReturnData = null;
        let data = req.body;
        let planStart = moment(data.plan_start).format('YYYY-MM-DD');
        let isValid = false;
        let accessibility = (data.health_spending_account ? 1 : 0);
        let qrPayment = 0;
        let wallet = 0;
        let billingStatus = (typeof data.billing_status != 'undefined' && data.billing_status ? 1 : 0); //billing information switch

        let litePlan = false;
        let accountType = data.account_type;
        let secondaryAccountType = data.secondary_account_type;
        let resetToken = sha256(moment().format('YYYYMMDDhhmmss'))
        let individualPrice = data.plan_price;
        let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
        let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");
        let accountTypes = ['insurance_bundle', 'stand_alone_plan', 'trial_plan', 'lite_plan'];
        let paymentDue = moment().format('YYYY-MM-DD');
        let invoiceNumberFormat = "";
        let maxInfoID = null;
        let planExtensionEnabled = (typeof data.plan_extension != 'undefined' && data.plan_extension ? 1 : 0)
        let planExtensionStatus = (typeof data.plan_extension_status != 'undefined' && data.plan_extension_status ? 1 : 0)
        let paymentStatus = data.payment_status;
        let password = sha256(data.reg_password);

        /**
         * manual filters
        */

        if(accessibility)
        {
            qrPayment = 1;
            wallet = 1;
        }

        if(accountTypes.indexOf(accountType) <= -1)
        {
            return res.json({
                status: false,
                message: "Please pick an Account Type."
            });
        }

        let emailExists = await companyModel.getOne('medi_customer_hr_accounts', {email: data.reg_email});

        if(emailExists)
        {
            return res.json({
                status: false,
                message: "Email Address already taken."
            });
        }

        if(!data.genereate_password)
        {
            if((data.reg_password).length <= 0)
            {
                return res.json({
                    status: false,
                    message: "Business Portal Password is required."
                });
            }

            password = sha256(data.reg_password);
        }

        /**
         * Data Insertion Section
         * */

        /**
         * Customer Purchase
        */
        let customerPurchase = {
            // customer_id: 1, //mariaDB id
            cover_type: 1, // default
            status: 1, //default
            agree_status: 0, //default to be asked
            peak_status: data.peak_status || 0, // new variable
            wallet: wallet,
            qr: qrPayment,
            currency_type: 'sgd',//default
            currency_value: 0,//default
            created_at: createdAt,
            updated_at: updatedAt
        }

        isValid = await validate.joiValidate(customerPurchase, validate.createCompany.customerPurchaseValidation, true)

        if(typeof isValid != 'boolean')
        {
            errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }

        /**
         * Customer Business Information
        */
        let businessInformation = {
            // business_information_id: 1, //mariaDB id
            customer_id: 1, // dummy
            company_name: data.company,
            company_address: data.company_address,
            nature_of_busines: "N/A",
            postal_code: parseInt(data.company_postal_code),
            establish: 1900,
            contact: {
                first_name: data.contact_first_name,
                last_name: data.contact_last_name,
                job_title: data.job_title,
                email: data.contact_email,
                phone: data.phone,
                hr_email: data.contact_email,
                billing_recipient: billingStatus,
                created_at: createdAt,
                updated_at: updatedAt
            },
            send_email_comm_related: (data.send_email_comm_related ? 1 : 0),
            send_email_bill_related: (data.send_email_bill_related ? 1 : 0),
            created_at: createdAt,
            updated_at: updatedAt
        }

        isValid = await validate.joiValidate(businessInformation, validate.createCompany.businessInformationValidation, true)

        if(typeof isValid != 'boolean')
        {
            errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }

        /**
         * Customer Billing Contact
         */

        let customerBillingContact = {
            // billing_contact_id: 1, //MariaDB
            customer_id: 1,// dummy customerID,
            billing_name: data.billing_name,
            billing_address: data.billing_address,
            bill_send_email_bill_related: data.bill_send_email_bill_related || 0,
            bill_send_email_comm_related: data.bill_send_email_comm_related || 0,
            created_at: createdAt,
            updated_at: updatedAt
        }

        isValid = await validate.joiValidate(customerBillingContact, validate.createCompany.customerBillingContactValidation, true)

        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }
        /**
         * Customer HR Dashboard
         */

        let customerHRDashboard = {
            // hr_account_id: 1,//mariaDB
            customer_id: 1,// dummy customerPurchaseResult.customer_id,
            email: data.reg_email,
            password: password,
            type: 'hr', //default
            reset_token: resetToken,
            active: 1, //default
            created_at: createdAt,
            updated_at: updatedAt
        }

        isValid = await validate.joiValidate(customerHRDashboard, validate.createCompany.customerHRDashboardValidation, true)

        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }

        /**
         * Customer Plans
         * Parent Of active plans and plans status
         */
        let customerPlans = {
            // customer_plan_id: 1, //mariaDB
            customer_id: 1,// dummy customerPurchaseResult.customer_id,
            plan_start: planStart,
            active: 1, //default
            account_type: accountType,
            secondary_account_type: secondaryAccountType,
            plan_extension_enable: planExtensionEnabled,
            created_at: createdAt,
            updated_at: updatedAt
        }

        isValid = await validate.joiValidate(customerPlans, validate.createCompany.customerPlansValidation, true)

        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }
        /**
         * Customer Active Plans
         * Parent Of Active Plan Invoices, Active Plan Extenstions and Employee Plan Payment Refund Details
        */
        let customerActivePlans = {
            // customer_active_plan_id: 1, //mariaDB
            customer_id: 1,// dummy customerPurchase.customer_id,
            customer_plan_id: 1,// dummy customerPlansResult.customer_plan_id,
            expired: 0, //default
            employees: data.employees,
            plan_start: planStart,
            duration: data.duration,
            new_head_count: 0, //default
            account_type: accountType,
            secondary_account_type: secondaryAccountType,
            deleted: 0, //default
            deleted_at: null, //default
            plan_extenstion_enable: planExtensionStatus,
            created_at: createdAt,
            updated_at: updatedAt
        }

        isValid = await validate.joiValidate(customerActivePlans, validate.createCompany.customerActivePlansValidation, true)

        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }

        let customerPlanStatus = {
            // customer_plan_status_id: 1, // mariaDB
            customer_id: 1, // dummy
            customer_plan_id: 1, // dummy
            employee_head_count: data.employees,
            employee_enrolled_count: 0,
            created_at: createdAt,
            updated_at: updatedAt
        }

        isValid = await validate.joiValidate(customerPlanStatus, validate.createCompany.customerPlanStatusValidation, true)

        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }


        /**
         * Active Plan Invoices
        */
        let activePlanInvoices = {
            // active_plan_invoice_id: 1, // Maria DB
            customer_id: 1, // dummy
            customer_active_plan_id: 1, // dummy
            employees: data.employees,
            invoice_number: "111111",
            plan_start: data.plan_start,
            duration: data.duration,
            individual_price: 1, //dummy
            invoice_date: moment().format("YYYY-MM-DD"),// dummy
            invoice_due_date: moment().format("YYYY-MM-DD"),// dummy
            refund: 0,
            currency_type: 'sgd',
            currency_value: 0,
            isPaid: 0,
            trail: {
                payment_type: "cheque",// dummy
                transaction_date: moment().format("YYYY-MM-DD"),   // dummy
                referrence_no: null,// dummy
                remarks: null,// dummy
                paid_amount: 1// dummy
            },
            created_at: createdAt,
            updated_at: updatedAt
        }

        isValid = await validate.joiValidate(activePlanInvoices, validate.createCompany.activePlanInvoicesValidation, true)

        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }

        /**Medi active plan extension */

        let activePlanExtensionInvoice = {
            // plan_extension_id: 1, //mariaDB
            active_plan_extensions_id: 1, //dummy
            customer_id: 1, // dummy
            employees: data.employees,
            invoice_number: '000000', // dummy
            plan_start: moment(data.plan_start_extension).format("YYYY-MM-DD"),
            duration: data.duration_extension,
            individual_price: 1,// dummy
            invoice_date: moment(data.plan_invoice_date).format("YYYY-MM-DD"),
            invoice_due: moment(data.plan_invoice_date).add(1, 'months').format("YYYY-MM-DD"),
            refund: 0,
            currency_type: "sgd",
            currency_value: null,
            trail: {
                payment_type: "cheque", // dummy
                transaction_date: moment().format("YYYY-MM-DD"),    // dummy
                referrence_no: null, // dummy
                remarks: null, // dummy
                paid_amount: 1 // dummy
            }
        }

        isValid = await validate.joiValidate(activePlanExtensionInvoice, validate.createCompany.activePlanExtensionInvoiceValidation, true)

        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }

        let dependentPlans = {};
        let dependentInvoices = {};
        if(data.dependents)
        {
            /**
             * Dependent Plans
             * */
            dependentPlans = {
                dependent_plan_id: 1, //mariaDB
                customer_plan_id: 1,//customerPlansResult.customer_plan_id,
                customer_id: 1,//customerPlansResult.customer_plan_id,
                customer_active_plan_id: 1,//customerActivePlansResult.customer_active_plan_id,
                total_dependents: data.dependents_employees,
                plan_start: moment(data.plan_start_extension_dependents).format("YYYY-MM-DD"),
                duration: data.duration_extension_dependents,
                enable: 1,
                account_type: data.account_type_extension_dependents,
                secondary_account_type: data.secondary_account_type_extension_dependents || null,
                type: "plan_extension", //['active_plan', 'plan_extension']
                tagged_active_plan_invoice : 1,//[0, 1]
                created_at: createdAt,
                updated_at: updatedAt
            }

            isValid = await validate.joiValidate(dependentPlans, validate.createCompany.dependentPlansValidation, true)

            if(typeof isValid != 'boolean')
            {
                errorFunc(res,{
                    status: false,
                    message: isValid.details[0].message
                })
            }

            /**
             * Dependent Invoices
             */
            dependentInvoices = {
                dependent_invoice_id: 1, //mariaDB
                dependent_plan_id: 1,//dependentPlansResult.dependent_plan_id,
                invoice_number: "000000",//invoiceNumber,
                invoice_date: moment(data.plan_start_extension).format("YYYY-MM-DD"),
                invoice_due: moment().add(1, 'months').format("YYYY-MM-DD"),
                total_dependents: data.dependents_employees,
                individual_price: "",
                plan_start: "",
                currency_type: "sgd",
                currency_value: null,
                billing_information: {
                    contact_name: data.billing_name,
                    contact_number: data.billing_phone,
                    contact_address: data.billing_address,
                    contact_email: data.billing_email
                },
                trail: {
                    payment_type: null,
                    transaction_date: null,
                    referrence_no: null,
                    remarks: null,
                    paid_amount: null
                },
                created_at: createdAt,
                updated_at: updatedAt
            }

            isValid = await validate.joiValidate(dependentInvoices, validate.createCompany.dependentInvoicesValidation, true)

            if(typeof isValid != 'boolean')
            {
                errorFunc(res,{
                    status: false,
                    message: isValid.details[0].message
                })
            }
        }
        // end of validation

        /**
         * Save Customer Purchase
         * */
        let customerPurchaseResult = await companyModel.saveOne(
            'medi_customer_purchase',
            await companyModel.getPrimaryID("medi_customer_purchase", customerPurchase)
        );

        if(typeof customerPurchaseResult != "object" && Object.keys(customerPurchaseResult).length <= 0)
        {
            errorFunc(res,{
                status: false,
                message: "Data not saved."
            })
        }

        if(typeof customerPurchaseResult == "object")
        {
            /**
             * Customer Business Information
            */
            businessInformation.customer_id = customerPurchaseResult.customer_id;

            /**
             * Save Customer Business Information
             * */
            let businessInformationResult = await companyModel.saveOne(
                'medi_customer_business_information',
                await companyModel.getPrimaryID("medi_customer_business_information", businessInformation)
            );

            if(typeof businessInformationResult != "object" && Object.keys(businessInformationResult).length <= 0)
            {
                errorFunc(res,{
                    status: false,
                    message: "Data not saved."
                })
            }

            /**
             * Customer Billing Contact
             */
            customerBillingContact.customer_id = customerPurchaseResult.customer_id;

            /**
             * Save Customer Billing Contact
             * */
            let customerBillingContactResult = await companyModel.saveOne(
                'medi_customer_billing_contact',
                await companyModel.getPrimaryID("medi_customer_billing_contact", customerBillingContact)
            );

            if(typeof customerBillingContactResult != "object" && Object.keys(customerBillingContactResult).length <= 0)
            {
                errorFunc(res,{
                    status: false,
                    message: "Data not saved."
                })
            }
            /**
             * Customer HR Dashboard
             */
            customerHRDashboard.customer_id = customerID;

            /**
             * Save Customer HR Dashboard
             * */
            let customerHRDashboardResult = await companyModel.saveOne(
                'medi_customer_hr_accounts',
                await companyModel.getPrimaryID("medi_customer_hr_accounts", customerHRDashboard)
            );

            if(typeof customerHRDashboardResult != "object" && Object.keys(customerHRDashboardResult).length <= 0)
            {
                errorFunc(res,{
                    status: false,
                    message: "Data not saved."
                })
            }

            /**
             * Customer Plans
             * Parent Of active plans and plans status
             */
            customerPlans.customer_id = customerID;

            /**
             * Save Customer Plans
             * */
            let customerPlansResult = await companyModel.saveOne(
                "medi_customer_plans",
                await companyModel.getPrimaryID("medi_customer_plans", customerPlans)
            );

            if(typeof customerPlansResult != "object" && Object.keys(customerPlansResult).length <= 0)
            {
                errorFunc(res,{
                    status: false,
                    message: "Data not saved."
                })
            }

            /**
             * Customer Active Plans
             * Parent Of Active Plan Invoices, Active Plan Extenstions and Employee Plan Payment Refund Details
            */
            customerActivePlans.customer_id = customerID;
            customerActivePlans.customer_plan_id = customerPlansResult.customer_plan_id;

            /**
             * Save Customer Plan Status
             * */
            let customerActivePlansResult = await companyModel.saveOne(
                'medi_customer_active_plans',
                await companyModel.getPrimaryID("medi_customer_active_plans", customerActivePlans)
            );

            if(typeof customerActivePlansResult != "object" && Object.keys(customerActivePlansResult).length <= 0)
            {
                errorFunc(res,{
                    status: false,
                    message: "Data not saved."
                })
            }

            /**
             * Customer Plan Status
            */
            customerPlanStatus.customer_id = customerID;
            customerPlanStatus.customer_plan_id = customerPlansResult.customer_plan_id;

            /**
             * Save Customer Plan Status
             * */
            let customerPlanStatusResult = await companyModel.saveOne(
                'medi_customer_plan_status',
                await companyModel.getPrimaryID("medi_customer_plan_status", customerPlanStatus)
            );

            if(typeof customerPlanStatusResult != "object" && Object.keys(customerPlanStatusResult).length <= 0)
            {
                errorFunc(res,{
                    status: false,
                    message: "Data not saved."
                })
            }

            // Active Plan Invoices
            let activePlanInvoicesCount = await companyModel.countCollection('medi_active_plan_invoices');
            let activeInvoicesCount = 0;

            if(activePlanInvoicesCount == 0) {
                activeInvoicesCount = 1;
            } else {
                activeInvoicesCount = activePlanInvoicesCount + 1;
            }
            let invoiceNumber = (activeInvoicesCount.toString()).padStart(6,0)

            if(!paymentStatus)
            {
                paymentDue = moment().add(1, 'months').format("YYYY-MM-DD");
            }

            if(accountType == "insurance_bundle" && secondaryAccountType == "insurance_bundle_lite")
            {
                litePlan = true;
            }
            else if(accountType == "lite_plan")
            {
                litePlan = true;
            }

            invoiceNumberFormat = (litePlan ? `LMC${invoiceNumber}` : `OMC${invoiceNumber}`)

            let invoiceTrail = (paymentStatus ?
                {
                    payment_type: "cheque",
                    transaction_date: moment().format("YYYY-MM-DD"),
                    referrence_no: null,
                    remarks: null,
                    paid_amount: (parseFloat(data.employees) * parseFloat(data.plan_price))
                } :
                {
                    payment_type: null,
                    transaction_date: null,
                    referrence_no: null,
                    remarks: null,
                    paid_amount: null
                }
            )

            /**
             * Active Plan Invoices
            */
            activePlanInvoices.customer_id = customerID;
            activePlanInvoices.customer_active_plan_id = customerActivePlansResult.customer_active_plan_id;
            activePlanInvoices.invoice_number = invoiceNumberFormat;
            activePlanInvoices.individual_price = individualPrice;
            activePlanInvoices.invoice_date = customerActivePlansResult.created_at;
            activePlanInvoices.invoice_due_date = paymentDue;
            activePlanInvoices.trail = invoiceTrail;

            /**
             * Save Active Plan Invoices
             * */
            let activePlanInvoicesResult = await companyModel.saveOne(
                'medi_active_plan_invoices',
                await companyModel.getPrimaryID("medi_active_plan_invoices", activePlanInvoices)
            );

            if(typeof activePlanInvoicesResult != "object" && Object.keys(activePlanInvoicesResult).length <= 0)
            {
                errorFunc(res,{
                    status: false,
                    message: "Data not saved."
                })
            }

            /**
             * Allowed Plan Extension
            */

            if(planExtensionEnabled)
            {
                /**
                 * Active Plan Extention
                */
                let activePlanExtensions = {
                    // plan_extension_invoice_id: 1, //mariaDB
                    customer_id: customerID,
                    customer_active_plan_id: customerActivePlansResult.customer_active_plan_id,
                    plan_start: moment(data.plan_start_extension).format("YYYY-MM-DD"), //ata.,
                    invoice_date: moment(data.plan_invoice_date).format("YYYY-MM-DD"),
                    invoice_due_date: moment(data.plan_invoice_date).add(1, 'months').format("YYYY-MM-DD"),
                    duration: data.duration_extension,
                    individual_price: individualPrice,
                    paid: data.payment_status ? 1 : 0,
                    active: 1,
                    enable: 1,
                    account_type: accountType,
                    secondary_account_type: secondaryAccountType,
                    created_at: createdAt,
                    updated_at: updatedAt
                }

                // getReturnData = await companyModel.getOne('medi_active_plan_extensions', {plan_extension_invoice_id: activePlanExtensions.plan_extension_invoice_id});

                // /**
                //  * Check duplicate ID
                // */
                // if(getReturnData)
                // {
                //     activePlanExtensions = await aggregation("medi_active_plan_extensions","plan_extension_invoice_id",activePlanExtensions, res)
                // }

                isValid = await validate.joiValidate(activePlanExtensions, validate.createCompany.activePlanExtensionsValidation, true)

                if(typeof isValid != 'boolean')
                {
                    errorFunc(res,{
                        status: false,
                        message: isValid.details[0].message
                    })
                }

                /**
                 * Save Active Plan Invoices
                 * */
                let activePlanExtensionsResult = await companyModel.saveOne(
                    'medi_active_plan_extensions',
                    await companyModel.getPrimaryID("medi_active_plan_extensions", activePlanExtensions)
                );

                if(typeof activePlanExtensionsResult != "object" && Object.keys(activePlanExtensionsResult).length <= 0)
                {
                    errorFunc(res,{
                        status: false,
                        message: "Data not saved."
                    })
                }

                /**
                 * Medi Active Plan Ectension Invoice
                 */
                let invoiceExtensionTrail = (paymentStatus ?
                    {
                        payment_type: "cheque",
                        transaction_date: moment().format("YYYY-MM-DD"),
                        referrence_no: null,
                        remarks: null,
                        paid_amount: (parseFloat(data.employees) * parseFloat(data.plan_price))
                    } :
                    {
                        payment_type: null,
                        transaction_date: null,
                        referrence_no: null,
                        remarks: null,
                        paid_amount: null
                    }
                )

                activePlanExtensionInvoice.plan_extension_invoice_id = activePlanExtensionsResult._id;
                activePlanExtensionInvoice.customer_id = customerID;
                activePlanExtensionInvoice.invoice_number = invoiceNumberFormat;
                activePlanExtensionInvoice.individual_price = individualPrice;
                activePlanExtensionInvoice.trail = invoiceExtensionTrail;

                /**
                 * Save Medi Active Plan Ectension Invoice
                 * */
                let activePlanExtensionInvoiceResult = await companyModel.saveOne(
                    'medi_active_plan_extension_invoices',
                    await companyModel.getPrimaryID("medi_active_plan_extension_invoices", activePlanExtensionInvoice)
                );

                if(typeof activePlanExtensionInvoiceResult != "object" && Object.keys(activePlanExtensionInvoiceResult).length <= 0)
                {
                    errorFunc(res,{
                        status: false,
                        message: "Data not saved."
                    })
                }

            }

            /**
             * Dependents Section
            */

            if(data.dependents)
            {
                /**
                 * Dependent Plans
                 * */
                dependentPlans.customer_plan_id = customerPlansResult._id;
                dependentPlans.customer_id = customerID;
                dependentPlans.customer_active_plan_id = customerActivePlansResult._id;

                /**
                 * Save Customer Wallets
                 * */
                let dependentPlansResult = await companyModel.saveOne(
                    'medi_dependent_plans',
                    await companyModel.getPrimaryID("medi_dependent_plans", dependentPlans)
                );

                if(typeof dependentPlansResult != "object" && Object.keys(dependentPlansResult).length <= 0)
                {
                    errorFunc(res,{
                        status: false,
                        message: "Data not saved."
                    })
                }

                /**
                 * Dependent Invoices
                 */
                let dependentInvoiceTrail = (data.payment_status_dependents ?
                    {
                        payment_type: "cheque",
                        transaction_date: moment().format("YYYY-MM-DD"),
                        referrence_no: null,
                        remarks: null,
                        paid_amount: (parseFloat(data.dependents_employees) * parseFloat(data.plan_price_dependents))
                    } :
                    {
                        payment_type: null,
                        transaction_date: null,
                        referrence_no: null,
                        remarks: null,
                        paid_amount: null
                    }
                )
                dependentInvoices.dependent_plan_id = dependentPlansResult._id;
                dependentInvoices.invoice_number = invoiceNumber;
                dependentInvoices.trail = dependentInvoiceTrail;


                /**
                 * Save Dependent Invoices
                 * */
                let dependentInvoicesResult = await companyModel.saveOne(
                    'medi_dependent_invoices',
                    await companyModel.getPrimaryID("medi_dependent_invoices", dependentInvoices)
                );

                if(typeof dependentInvoicesResult != "object" && Object.keys(dependentInvoicesResult).length <= 0)
                {
                    errorFunc(res,{
                        status: false,
                        message: "Data not saved."
                    })
                }

                if(data.plan_extension)
                {
                    dependentPlans = {
                        // dependent_plan_id: 1, //mariadb
                        customer_plan_id: customerPlansResult._id,
                        customer_id: customerID,
                        customer_active_plan_id: customerActivePlansResult.customer_active_plan_id,
                        total_dependents: data.dependents_employees,
                        plan_start: moment(data.plan_start_extension_dependents).format("YYYY-MM-DD"),
                        duration: data.duration_extension_dependents,
                        enable: 1,
                        account_type: data.secondary_account_type_extension,
                        secondary_account_type: data.secondary_account_type_extension_dependents || null,
                        type: "plan_extension", //['active_plan', 'plan_extension']
                        tagged_active_plan_invoice : "",//[0, 1]
                        created_at: createdAt,
                        updated_at: updatedAt
                    }

                    // getReturnData = await companyModel.getOne('medi_dependent_plans', {customer_wallet_id: dependentPlans.customer_wallet_id});

                    // /**
                    //  * Check duplicate ID
                    // */
                    // if(getReturnData)
                    // {
                    //     dependentPlans = await aggregation("medi_dependent_plans","dependent_plan_id",dependentPlans, res)
                    // }

                    isValid = await validate.joiValidate(dependentPlans, validate.createCompany.dependentPlansValidation, true)

                    if(typeof isValid != 'boolean')
                    {
                        errorFunc(res,{
                            status: false,
                            message: isValid.details[0].message
                        })
                    }

                    /**
                     * Save Customer Wallets
                     * */
                    let dependentPlansResult = await companyModel.saveOne(
                        'medi_dependent_plans',
                        await companyModel.getPrimaryID("medi_dependent_plans", dependentPlans)
                    );

                    if(typeof dependentPlansResult != "object" && Object.keys(dependentPlansResult).length <= 0)
                    {
                        errorFunc(res,{
                            status: false,
                            message: "Data not saved."
                        })
                    }

                    /**
                     * Dependent Invoices
                     */
                    dependentInvoiceTrail = (data.payment_status_dependents ?
                        {
                            payment_type: "cheque",
                            transaction_date: moment().format("YYYY-MM-DD"),
                            referrence_no: null,
                            remarks: null,
                            paid_amount: (parseFloat(data.dependents_employees) * parseFloat(data.plan_price_dependents))
                        } :
                        {
                            payment_type: null,
                            transaction_date: null,
                            referrence_no: null,
                            remarks: null,
                            paid_amount: null
                        }
                    )

                    dependentInvoices = {
                        // dependent_invoice_id: 1, //mariaDB
                        dependent_plan_id: dependentPlansResult._id,
                        invoice_number: invoiceNumberFormat,
                        invoice_date: moment().format("YYYY-MM-DD"),
                        invoice_due: moment().add(1, 'months').format("YYYY-MM-DD"),
                        total_dependents: data.dependents_employees,
                        individual_price: data.plan_price_extension_dependents,
                        plan_start: moment(data.plan_start_extension_dependents).format("YYYY-MM-DD"),
                        currency_type: "sgd",
                        currency_value: null,
                        billing_information: {
                            contact_name: data.billing_name,
                            contact_number: data.billing_phone,
                            contact_address: data.billing_address,
                            contact_email: data.billing_email
                        },
                        trail: dependentInvoiceTrail,
                        created_at: createdAt,
                        updated_at: updatedAt
                    }

                    // getReturnData = await companyModel.getOne('medi_dependent_invoices', {dependent_invoice_id: dependentInvoices.dependent_invoice_id});

                    // /**
                    //  * Check duplicate ID
                    // */
                    // if(getReturnData)
                    // {
                    //     dependentInvoices = await aggregation("medi_dependent_invoices","dependent_plan_id",dependentInvoices, res)
                    // }

                    isValid = await validate.joiValidate(dependentInvoices, validate.createCompany.dependentInvoicesValidation, true)

                    if(typeof isValid != 'boolean')
                    {
                        errorFunc(res,{
                            status: false,
                            message: isValid.details[0].message
                        })
                    }

                    /**
                     * Save Dependent Invoices
                     * */
                    dependentInvoicesResult = await companyModel.saveOne(
                        'medi_dependent_invoices',
                        await companyModel.getPrimaryID("medi_dependent_invoices", dependentInvoices)
                    );

                    if(typeof dependentInvoicesResult != "object" && Object.keys(dependentInvoicesResult).length <= 0)
                    {
                        errorFunc(res,{
                            status: false,
                            message: "Data not saved."
                        })
                    }

                }

                /**
                 * Dependent Plan Status
                 */
                let dependentPlanStatus = {
                    // dependent_plan_status_id: 1, //mariaDB
                    customer_id: customerID,
                    customer_plan_id: customerPlansResult._id,
                    dependent_head_count: data.dependents_employees,
                    dependent_enrolled_count: 0,
                    created_at: createdAt,
                    updated_at: updatedAt
                }

                // getReturnData = await companyModel.getOne('medi_dependent_plan_status', {dependent_plan_status_id: dependentPlanStatus.dependent_plan_status_id});

                // /**
                //  * Check duplicate ID
                // */
                // if(getReturnData)
                // {
                //     dependentInvoices = await aggregation("medi_dependent_plan_status","dependent_plan_status_id",dependentPlanStatus, res)
                // }

                isValid = await validate.joiValidate(dependentPlanStatus, validate.createCompany.dependentPlanStatusValidation, true)

                if(typeof isValid != 'boolean')
                {
                    errorFunc(res,{
                        status: false,
                        message: isValid.details[0].message
                    })
                }
                /**
                 * Save Dependent Plan Status
                 * */
                let dependentPlanStatusResult = await companyModel.saveOne(
                    'medi_dependent_plan_status',
                    await companyModel.getPrimaryID("medi_dependent_plan_status", dependentPlanStatus)
                );

                if(typeof dependentPlanStatusResult != "object" && Object.keys(dependentPlanStatusResult).length <= 0)
                {
                    errorFunc(res,{
                        status: false,
                        message: "Data not saved."
                    })
                }
            }

            /**
             * Customer Wallets
             * */
            let customerWallets = {
                // customer_wallet_id: 1,//mariaDB
                customer_id: customerID,
                medical_balance: data.med_spending_credits || 0,
                wellness_balance: data.well_spending_credits || 0,
                currency_type: "sgd",
                currency_value: 0,
                created_at: createdAt,
                updated_at: updatedAt
            }

            // getReturnData = await companyModel.getOne('medi_customer_wallets', {customer_wallet_id: customerWallets.customer_wallet_id});

            // /**
            //  * Check duplicate ID
            // */
            // if(getReturnData)
            // {
            //     customerWallets = await aggregation("medi_customer_wallets","customer_wallet_id",customerWallets, res)
            // }

            isValid = await validate.joiValidate(customerWallets, validate.createCompany.customerWalletsValidation, true)

            if(typeof isValid != 'boolean')
            {
                errorFunc(res,{
                    status: false,
                    message: isValid.details[0].message
                })
            }

            /**
             * Save Customer Wallets
             * */
            let customerWalletsResult = await companyModel.saveOne(
                'medi_customer_wallets',
                await companyModel.getPrimaryID("medi_customer_wallets", customerWallets)
            );

            if(typeof customerWalletsResult != "object" && Object.keys(customerWalletsResult).length <= 0)
            {
                errorFunc(res,{
                    status: false,
                    message: "Data not saved."
                })
            }

            /**
             * Customer Spending Wallet History
             */
            if(parseFloat(data.med_spending_credits) > 0)
            {
                let customerMedicalHistory = {
                    // customer_wallet_history_id: 1, //mariadb
                    customer_id: customerID,
                    customer_wallet_id: customerWalletsResult._id,
                    credit: parseFloat(data.med_spending_credits),
                    running_balance: parseFloat(data.med_spending_credits),
                    type: 'admin_added_credits',
                    employee_id: null,
                    customer_active_plan_id: customerActivePlansResult._id,
                    wallet_type: "medical",
                    currency_type: "sgd",
                    currency_value: 0,
                    createdAt: createdAt,
                    updatedAt: updatedAt
                }

                // getReturnData = await companyModel.getOne('medi_customer_wallet_history', {customer_wallet_history_id: customerMedicalHistory.customer_wallet_history_id});

                // /**
                //  * Check duplicate ID
                // */
                // if(getReturnData)
                // {
                //     customerMedicalHistory = await aggregation("medi_customer_wallet_history","customer_wallet_history_id",customerMedicalHistory, res)
                // }

                isValid = await validate.joiValidate(customerMedicalHistory, validate.createCompany.customerMedicalHistoryValidation, true)

                if(typeof isValid != 'boolean')
                {
                    errorFunc(res,{
                        status: false,
                        message: isValid.details[0].message
                    })
                }

                /**
                 * Save Customer Wallets
                 * */
                let customerMedicalHistoryResult = await companyModel.saveOne(
                    'medi_customer_wallet_history',
                    await companyModel.getPrimaryID("medi_customer_wallet_history", customerMedicalHistory)
                );

                if(typeof customerMedicalHistoryResult != "object" && Object.keys(customerMedicalHistoryResult).length <= 0)
                {
                    errorFunc(res,{
                        status: false,
                        message: "Data not saved."
                    })
                }
            }

            /**
             * Customer Wellness Wallet History
             */
            if(parseFloat(data.well_spending_credits) > 0)
            {
                let customerWellnessHistory = {
                    // customer_wallet_history_id: 1, //mariadb
                    customer_id: customerID,
                    customer_wallet_id: customerWalletsResult._id,
                    credit: parseFloat(data.well_spending_credits),
                    running_balance: parseFloat(data.well_spending_credits),
                    type: 'admin_added_credits',
                    employee_id: null,
                    customer_active_plan_id: customerActivePlansResult._id,
                    wallet_type: "wellness",
                    currency_type: "sgd",
                    currency_value: 0,
                    createdAt: createdAt,
                    updatedAt: updatedAt
                }

                // getReturnData = await companyModel.getOne('medi_customer_wallet_history', {customer_wallet_history_id: customerWellnessHistory.customer_wallet_history_id});

                // /**
                //  * Check duplicate ID
                // */
                // if(getReturnData)
                // {
                //     customerHRDashboard = await aggregation("medi_customer_wallet_history","customer_wallet_history_id",customerWellnessHistory, res)
                // }

                isValid = await validate.joiValidate(customerWellnessHistory, validate.createCompany.customerWellnessHistoryValidation, true)

                if(typeof isValid != 'boolean')
                {
                    errorFunc(res,{
                        status: false,
                        message: isValid.details[0].message
                    })
                }

                /**
                 * Save Customer Wallets
                 * */
                let customerWellnessHistoryResult = await companyModel.saveOne(
                    'medi_customer_wallet_history',
                    await companyModel.getPrimaryID("medi_customer_wallet_history", customerWellnessHistory)
                );

                if(typeof customerWellnessHistoryResult != "object" && Object.keys(customerWellnessHistoryResult).length <= 0)
                {
                    errorFunc(res,{
                        status: false,
                        message: "Data not saved."
                    })
                }

                // Deposits
                if(parseFloat(data.deposit_medical) > 0 || parseFloat(data.deposit_wellness) > 0)
                {

                    let depoCreditsCount = await companyModel.countCollection('medi_customer_spending_deposit_credits');
                    let depoCredits_number = (depoCreditsCount.toString()).padStart(6,0)
                    let depoDate = moment().format("YYYY-MM-DD");
                    let depoDueDate = moment().add(1, 'months').format("YYYY-MM-DD");

                    let customerSpendingDepositCredits = {
                        // customer_deposit_id: 1, //mariaDB
                        customer_active_plan_id: customerActivePlansResult._id,
                        customer_id: customerID,
                        medical_credits: parseFloat(data.med_spending_credits),
                        wellness_credits: parseFloat(data.well_spending_credits),
                        medical_percent: (parseFloat(data.deposit_medical)/100),
                        wellness_percent: (parseFloat(data.deposit_wellness)/100),
                        invoice_number: `DEP${depoCredits_number}`,
                        invoice_date: depoDate,
                        invoice_due: depoDueDate,
                        paid_amount: 0,
                        paid_date: moment().format("YYYY-MM-DD"),
                        payment_status: 0,
                        payment_remarks: "",
                        currency_type: "sgd",
                        currency_value: null,
                        created_at: createdAt,
                        updated_at: updatedAt
                    }

                    // getReturnData = await companyModel.getOne('medi_customer_spending_deposit_credits', {customer_wallet_history_id: customerSpendingDepositCredits.customer_wallet_history_id});

                    // /**
                    //  * Check duplicate ID
                    // */
                    // if(getReturnData)
                    // {
                    //     customerHRDashboard = await aggregation("medi_customer_spending_deposit_credits","customer_deposit_id",customerSpendingDepositCredits, res)
                    // }

                    isValid = await validate.joiValidate(customerSpendingDepositCredits, validate.createCompany.customerSpendingDepositCreditsValidation, true)

                    if(typeof isValid != 'boolean')
                    {
                        errorFunc(res,{
                            status: false,
                            message: isValid.details[0].message
                        })
                    }

                    /**
                     * Save Customer Wallets
                     * */
                    let customerSpendingDepositCreditsResult = await companyModel.saveOne(
                        'medi_customer_spending_deposit_credits',
                        await companyModel.getPrimaryID("medi_customer_spending_deposit_credits", customerSpendingDepositCredits)
                    );

                    if(typeof customerSpendingDepositCreditsResult != "object" && Object.keys(customerSpendingDepositCreditsResult).length <= 0)
                    {
                        errorFunc(res,{
                            status: false,
                            message: "Data not saved."
                        })
                    }

                }
            }

            /**
             * Send E-mail
             *  */
            let domainURL = 'http://medicloud.local';
            let emailData = new Array();

            if(req.get('host') == 'https://admin.medicloud.sg')
            {
                domainURL = 'https://medicloud.sg';
            }
            else if(req.get('host') == 'http://stage.medicloud.sg')
            {
                domainURL = 'http://staging.medicloud.sg';
            }

            if(data.send_email)
            {

                if(!data.payment_status)
                {
                    // emailData
                }
				// if($data['payment_status'] == "false" || $data['payment_status'] == false) {
				// 	// get active plan details
				// 	$temp_data = self::getCompanyInvoice($invoice->id, 0);
				// 	$emailDdata = $temp_data['data'];
				// 	$emailDdata['pdf'] = "pdf-download.admin-corporate-transactions-download-invoice";
				// }

				// if(!empty($data['add_cc']) && $data['add_cc'] == true || !empty($data['add_cc']) && $data['add_cc'] == "true") {
				// 	foreach ($data['cc_emails'] as $key : emails) {
				// 		$emailDdata['cc'][] = $emails;
				// 	}
				// 	$emailDdata['cc'][] = 'info@medicloud.sg';
				// }

				// if($data['account_type'] == "stand_alone_plan" || $data['account_type'] == "lite_plan") {
				// 	$emailDdata['emailSubject'] = 'MEDNEFITS WELCOME PACK (FOR COMPANY)';
				// 	$emailDdata['emailName'] = ucwords($data['contact_first_name'].' '.$data['contact_last_name']);
				// 	$emailDdata['emailPage'] = 'email.mednefits_standalone_pending';
				// 	$emailDdata['email'] = $data['reg_email'];
				// 	$emailDdata['password'] = $password;
				// 	$emailDdata['emailTo'] = $data['contact_email'];
				// 	$emailDdata['url'] = $url;
				// 	$emailDdata['button'] = $url.'/company-benefits-dashboard-login';
				// 	$emailDdata['invoice_link'] = $url.'/get/invoice/'.$active_plan_id;
				// 	$emailDdata['welcome_pack_link'] = $url.'/get/welcome-pack-corporate';
				// 	$emailDdata['url'] = $url;

				// 	if(!empty($data['add_cc']) && $data['add_cc'] == true || !empty($data['add_cc']) && $data['add_cc'] == "true") {
				// 		if(!empty($data['payment_status']) && $data['payment_status'] == "false" || !empty($data['payment_status']) && $data['payment_status'] == false) {
				// 			\EmailHelper::sendEmailCompanyInvoiceAttachmentWithCC($emailDdata);
				// 		} else {
				// 			\EmailHelper::sendEmailWithCC($emailDdata);
				// 		}
				// 	} else {
				// 		if(!empty($data['payment_status']) && $data['payment_status'] == "false" || !empty($data['payment_status']) && $data['payment_status'] == false) {
				// 			\EmailHelper::sendEmailCompanyInvoiceAttachment($emailDdata);
				// 		} else {
				// 			\EmailHelper::sendEmail($emailDdata);
				// 		}
				// 	}
				// } else {
				// 	$emailDdata['emailSubject'] = 'MEDNEFITS WELCOME PACK (FOR COMPANY)';
				// 	$emailDdata['emailName'] = ucwords($data['contact_first_name'].' '.$data['contact_last_name']);
				// 	$emailDdata['emailPage'] = 'email.mednefits-welcome-insurance-bundled-payment-paid';
				// 	$emailDdata['email'] = $data['reg_email'];
				// 	$emailDdata['password'] = $password;
				// 	$emailDdata['emailTo'] = $data['contact_email'];
				// 	$emailDdata['url'] = $url;
				// 	$emailDdata['button'] = $url.'/company-benefits-dashboard-login';
				// 	$emailDdata['invoice_link'] = $url.'/get/invoice/'.$active_plan_id;
				// 	$emailDdata['welcome_pack_link'] = $url.'/get/welcome-pack-corporate';
				// 	$emailDdata['url'] = $url;
				// 	if(!empty($data['add_cc']) && $data['add_cc'] == true || !empty($data['add_cc']) && $data['add_cc'] == "true") {
				// 		\EmailHelper::sendEmailWithCC($emailDdata);
				// 	} else {
				// 		\EmailHelper::sendEmail($emailDdata);
				// 	}
				// }
            }

		//  	 // send email
		// 	$emailDdata = [];

		// 	if(!empty($data['send_email']) && $data['send_email'] == true || !empty($data['send_email']) && $data['send_email'] == "true") {


		// 		if($data['payment_status'] == "false" || $data['payment_status'] == false) {
		// 			// get active plan details
		// 			$temp_data = self::getCompanyInvoice($invoice->id, 0);
		// 			$emailDdata = $temp_data['data'];
		// 			$emailDdata['pdf'] = "pdf-download.admin-corporate-transactions-download-invoice";
		// 		}

		// 		if(!empty($data['add_cc']) && $data['add_cc'] == true || !empty($data['add_cc']) && $data['add_cc'] == "true") {
		// 			foreach ($data['cc_emails'] as $key : emails) {
		// 				$emailDdata['cc'][] = $emails;
		// 			}
		// 			$emailDdata['cc'][] = 'info@medicloud.sg';
		// 		}

		// 		if($data['account_type'] == "stand_alone_plan" || $data['account_type'] == "lite_plan") {
		// 			$emailDdata['emailSubject'] = 'MEDNEFITS WELCOME PACK (FOR COMPANY)';
		// 			$emailDdata['emailName'] = ucwords($data['contact_first_name'].' '.$data['contact_last_name']);
		// 			$emailDdata['emailPage'] = 'email.mednefits_standalone_pending';
		// 			$emailDdata['email'] = $data['reg_email'];
		// 			$emailDdata['password'] = $password;
		// 			$emailDdata['emailTo'] = $data['contact_email'];
		// 			$emailDdata['url'] = $url;
		// 			$emailDdata['button'] = $url.'/company-benefits-dashboard-login';
		// 			$emailDdata['invoice_link'] = $url.'/get/invoice/'.$active_plan_id;
		// 			$emailDdata['welcome_pack_link'] = $url.'/get/welcome-pack-corporate';
		// 			$emailDdata['url'] = $url;

		// 			if(!empty($data['add_cc']) && $data['add_cc'] == true || !empty($data['add_cc']) && $data['add_cc'] == "true") {
		// 				if(!empty($data['payment_status']) && $data['payment_status'] == "false" || !empty($data['payment_status']) && $data['payment_status'] == false) {
		// 					\EmailHelper::sendEmailCompanyInvoiceAttachmentWithCC($emailDdata);
		// 				} else {
		// 					\EmailHelper::sendEmailWithCC($emailDdata);
		// 				}
		// 			} else {
		// 				if(!empty($data['payment_status']) && $data['payment_status'] == "false" || !empty($data['payment_status']) && $data['payment_status'] == false) {
		// 					\EmailHelper::sendEmailCompanyInvoiceAttachment($emailDdata);
		// 				} else {
		// 					\EmailHelper::sendEmail($emailDdata);
		// 				}
		// 			}
		// 		} else {
		// 			$emailDdata['emailSubject'] = 'MEDNEFITS WELCOME PACK (FOR COMPANY)';
		// 			$emailDdata['emailName'] = ucwords($data['contact_first_name'].' '.$data['contact_last_name']);
		// 			$emailDdata['emailPage'] = 'email.mednefits-welcome-insurance-bundled-payment-paid';
		// 			$emailDdata['email'] = $data['reg_email'];
		// 			$emailDdata['password'] = $password;
		// 			$emailDdata['emailTo'] = $data['contact_email'];
		// 			$emailDdata['url'] = $url;
		// 			$emailDdata['button'] = $url.'/company-benefits-dashboard-login';
		// 			$emailDdata['invoice_link'] = $url.'/get/invoice/'.$active_plan_id;
		// 			$emailDdata['welcome_pack_link'] = $url.'/get/welcome-pack-corporate';
		// 			$emailDdata['url'] = $url;
		// 			if(!empty($data['add_cc']) && $data['add_cc'] == true || !empty($data['add_cc']) && $data['add_cc'] == "true") {
		// 				\EmailHelper::sendEmailWithCC($emailDdata);
		// 			} else {
		// 				\EmailHelper::sendEmail($emailDdata);
		// 			}
		// 		}
		// 	}

		// 	$admin_id = \AdminHelper::getAdminID();
		// 	if($admin_id) {
		// 		$data['customer_id'] = $customer_id;
		// 		$admin_logs = array(
		// 			'admin_id'	: admin_id,
		// 			'type'		=> 'created_company',
		// 			'data'		=> \AdminHelper::serializeData($data)
		// 		);
		// 		\AdminHelper::createAdminLog($admin_logs);
		// 	}
		// }
		// return array('status' => true, 'message' => 'Company Benefits created successfully.');
            return res.json({
                status: true,
                message: "Saved."
            });
        }
    } catch (error) {
        errorFunc(res,{
            status: false,
            message: error
        })
    }

}

async function addEmployee( req, res, next )
{

}

const checkPaymentHistory = (id) =>
{
    // $payment_history = DB::table('customer_payment_history')->where('customer_active_plan_id', $id)->first();

    // if(!$payment_history) {
    //     $active_plan = DB::table('customer_active_plan')->where('customer_active_plan_id', $id)->first();
    //     $plan = DB::table('customer_plan')->where('customer_plan_id', $active_plan->plan_id)->first();

    //     $first_plan = DB::table('customer_active_plan')->where('plan_id', $plan->customer_plan_id)->first();

    //     if($first_plan->customer_active_plan_id == $id) {
    //         $status = 'started';
    //     } else {
    //         $status = 'added';
    //     }

    //     $employees = DB::table('customer_plan_withdraw')->where('customer_active_plan_id', $id)->count();

    //     $number_of_empoyees = $active_plan->employees + $employees;

    //     $data = array(
    //         'customer_buy_start_id'     : active_plan->customer_start_buy_id,
    //         'customer_active_plan_id'   : active_plan->customer_active_plan_id,
    //         'plan_start'                : active_plan->plan_start,
    //         'status'                    : status,
    //         'employees'                 : number_of_empoyees,
    //         'amount'                    : number_of_empoyees * 99,
    //         'stripe_transaction_id'     => Null
    //     );

    //     return \CustomerPaymentHistory::create($data);
    // }

}

const updatePlanTierEmployeeEnrollment = async ( req, res, next ) =>
{

    let data = req.body;
    let temp_enrollment_id = parseInt(data.temp_enrollment_id)
    let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");

    if(!data.temp_enrollment_id)
    {
        return res.json({
            status: false,
            message: "Employee Enrollee ID is required."
        });
    }

    let checkEnrollee = await companyModel.getOne("medi_customer_employee_temp_enrollment",
        {
            temp_enrollment_id: temp_enrollment_id
        }
    );


    if(!checkEnrollee)
    {
        return res.json({
            status: false,
            message: "Employee Temp Enrollee does not exist."
        });
    }

    let customer_id = checkEnrollee.customer_id;
    if(!data.fullname)
    {
        return res.json({
            status: false,
            message: "Employee Full Name is required."
        });
    }

    if(!data.nric)
    {
        return res.json({
            status: false,
            message: "Employee Enrollee NRIC/FIN is required."
        });
    }

    let dataUpdates = {
        'temp_enrollment_id': data.temp_enrollment_id,
        'fullname': data.fullname,
        'nric': data.nric,
        'dob': data.dob,
        'email': data.email,
        'mobile': data.mobile,
        'job_title': data.job_title,
        'credits': data.medical_credits,
        'wellness_credits': data.wellness_credits,
        'postal_code': data.postal_code,
        'start_date': moment(new Date(data.plan_start)).format("YYYY-MM-DD"),
        'error_logs': await enrollmentEmployeeValidation(data, true, customer_id),
        'updated_at': updatedAt
    };
    console.warn(dataUpdates);
    let dataUpdatesResult = await companyModel.updateMany("medi_customer_employee_temp_enrollment", { temp_enrollment_id: temp_enrollment_id}, dataUpdates);

    //update here
    if(dataUpdatesResult) {
        res.json({
            status: true,
            message: "Success."
        })
    } else {
        res.json({
            status: false,
            message: 'Failed.',
            reason: dataUpdatesResult
        })
    }
}

const addTempEmployee = async (req, res, next) => {

    let data = req.body;
    let customerID = parseInt(data.customer_id);
    let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
    let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");
    let planTierID = parseInt(data.plan_tier_id) || null;
    let planTier = data.plan_tier || null;
    let total = 0;
    let totalLeftCount = 0;
    let customerActivePlanID = null;
    let totalDependentsEntry = 0;
    let totalDependents = 0;
    let customerActivePlan = null;
    let empValidation = new Object();
    let getReturnData = null;

    // check customer
    let customer = await companyModel.getOne("medi_customer_purchase",
        {
            customer_id: customerID
        }
    );

    console.log('customer', customer);

    if(!customer) {
        return res.status(400).json({
            status: false,
            message: "Customer ID not found."
        });
    }

    // dependent medi_customer_plan_tiers medi_customer_plan_tier_users
    if(data.plan_tier_id)
    {
        //plan_tier_id: planTierID,
        planTier = await companyModel.getOne('medi_customer_plan_tiers', { plan_tier_id: planTierID, active: 1 });
        console.warn(planTier)
        if(!planTier)
        {
            return res.status(400).json({
                status: false,
                message: "Plan Tier not found."
            });
        }

    }

    if((data.employees).length <= 0)
    {
        return res.status(400).json({
            status: false,
            message: "Atleast 1 employee is required."
        });
    }

    let planned = await companyModel.aggregation('medi_customer_plans',
        [
            {$match: {customer_id: customerID}},
            {$sort:{created_at: -1}},
            {$limit:1}
        ]
    );

    console.log('planned', planned)

    if(planned.length <= 0)
    {
        return res.status(400).json({
            status: false,
            message: "Plan not found."
        });
    }

    let customerPlanID = planned[0].customer_plan_id;

    let planStatus = await companyModel.aggregation('medi_customer_plan_status',
        [
            {$match: {customer_plan_id: customerPlanID}},
            {$sort:{created_at: -1}},
            {$limit:1}
        ]
    );

    if(planStatus.length > 0)
    {
        let planStatusDetails = planStatus[0];
        console.log('planStatusDetails', planStatusDetails);
        total = parseFloat(planStatusDetails.member_head_count) - parseFloat(planStatusDetails.member_enrolled_count);
    }


    if(total <= 0)
    {
        return res.status(400).json({
            status: false,
            message: "We realised the current headcount you wish to enroll is over the current vacant member seat(s)."
        });
    }

    if(planTierID)
    {
        totalLeftCount = parseFloat(planTier.employee_head_count) - parseFloat(planTier.employee_enrolled_count);

        if((data.employees).length > totalLeftCount)
        {
            return res.status(400).json({
                status: false,
                message: `Current Member headcount you wish to enroll to this Plan Tier is over the current vacant member seat/s. Your are trying to enroll a total of ${(data.employees).length} of current total left of ${totalLeftCount} for this Plan Tier`
            });
        }
    }

    let customerPlan = planned[0];
    let activePlan = await companyModel.getMany('medi_customer_active_plans',{customer_plan_id: customerPlan.customer_plan_id});
    console.log('activePlan', activePlan);
    // customerActivePlanID = activePlan[0]._id;

    if(activePlan)
    {

        let activeUsersCount = null;

        await map(activePlan, async element => {
            activeUsersCount = await companyModel.countCollection("medi_member_plan_history", {customer_active_plan_id: element.customer_active_plan_id, type: 'started'})

            if((element.employees - activeUsersCount) > 0)
            {
                customerActivePlanID = activePlan[0].customer_active_plan_id;
            }
        });
    } else {
        activePlan = await companyModel.aggregation('medi_customer_active_plans',
            [
                {$match: {customer_id: customerID}},
                {$sort: {created_at: -1}},
                {$limit: 1}
            ]
        );
    }

    await map(data.employees, async element => {
        if(typeof element.dependents != 'undefined')
        {
            totalDependentsEntry = totalDependentsEntry + parseFloat((element.dependents).length);
        }
    });

    let dependentPlanStatus = await companyModel.aggregation('medi_dependent_plan_status',
        [
            {$match: {customer_plan_id: planned[0].customer_plan_id}},
            {$sort: {created_at: -1}},
            {$limit: 1}
        ]
    );

    if(dependentPlanStatus.length > 0)
    {
        totalDependents = dependentPlanStatus[0].total_dependents - dependentPlanStatus[0].total_enrolled_dependents;
    }
    else
    {
        return res.status(400).json({
            status: false,
            message: "Dependent Plan is currently not available for this Company. Please purchase a dependent plan, contact Mednefits Team for more information."
        });
    }

    if(planTierID)
    {
        if(parseInt(planTier[0].dependent_head_count) > 0)
        {
            let planTierDependentTotal = parseFloat(planTier[0].dependent_head_count) - parseFloat(planTier[0].dependent_enrolled_count);

            if(totalDependentsEntry > planTierDependentTotal)
            {
                return res.status(400).json({
                    status: false,
                    message: `Current Dependent headcount you wish to enroll to this Plan Tier is over the current vacant member seat/s. Your are trying to enroll a total of ${totalDependentsEntry} of current total left of ${planTierDependentTotal} for this Plan Tier.`
                });
            }
        }
    }

    customerActivePlan = await companyModel.getOne('medi_customer_active_plans', {customer_active_plan_id: customerActivePlanID});

    let postalCode = null;
    let enrollmentData = null;
    let tempEnrollment = null;

    // return res.json(temp_id)
    var format = [];
    try {
        let enrollmentDataResult = {};
        await map(data.employees, async element => {
            if(element.plan_start)
            {
                postalCode = element.postal_code;
            }

            element.plan_start = moment(new Date(element.plan_start)).format("YYYY-MM-DD");
            element.dob = moment(new Date(element.dob)).format("YYYY-MM-DD");

            tempEnrollment = {
                'temp_enrollment_id' : await global_helper.getId('medi_customer_employee_temp_enrollment', 'temp_enrollment_id'),
                'customer_id': customerID,
                'active_plan_id': customerActivePlanID,
                'plan_tier_id': planTierID,
                'fullname': element['fullname'],
                'dob': element['dob'],
                'nric': element['nric'],
                'email': element.email || null,
                'mobile': element['mobile'],
                'mobile_country_code': element['mobile_country_code'],
                'job_title': element['job_title'],
                'medical_credits': element['medical_credits'],
                'wellness_credits': element['wellness_credits'],
                'start_date': element['plan_start'],
                'postal_code': postalCode,
                'error_logs': await enrollmentEmployeeValidation(element, false, customerID),
                'created_at': createdAt,
                'updated_at': updatedAt
            }

           // return res.json(tempEnrollment);
            enrollmentDataResult = await companyModel.saveOne(
                "medi_customer_employee_temp_enrollment", tempEnrollment);
            format.push(enrollmentDataResult);
            // enrollmentDataResult = true;
            if(enrollmentDataResult)
            {
                if(typeof element.dependents != "undefined")
                {
                    if((element.dependents).length > 0)
                    {
                        let dependentPlanID = null;
                        let dependentPlan = null;
                        await map(element.dependents, async dependent => {
                            dependent.plan_start = moment(new Date(element['plan_start'])).format("YYYY-MM-DD");
                            dependentPlanID = await getCompanyAvailableDependenPlanId(customerID);
                             console.log('dependentPlanID', dependentPlanID)
                            // if(dependentPlanID == false)
                            // {
                            //     console.log('yawa')
                            //     dependentPlan = await companyModel.aggregation('medi_dependent_plans',
                            //         [
                            //             {$match:{customer_plan_id: customerActivePlan.customer_plan_id}},
                            //             {$sort:{ created_at: -1}},
                            //             {$limit: 1}
                            //         ]
                            //     );

                            //     dependentPlanID = dependentPlan[0].depedent_plan_id;
                            // }



                            let dependent_data = await {
                                'dependent_temp_id' : await global_helper.getId('medi_dependent_temp_enrollment', 'dependent_temp_id'),
                                'employee_temp_id': enrollmentDataResult.temp_enrollment_id,
                                'dependent_plan_id': dependentPlanID,
                                'plan_tier_id': planTierID,
                                'fullname': dependent['fullname'],
                                'dob': dependent['dob'],
                                'plan_start': dependent.plan_start,
                                'relationship': dependent['relationship'],
                                'error_logs': await enrollmentDepedentValidation(dependent, customerID),
                                'created_at': createdAt,
                                'updated_at': updatedAt
                            }

                            // return res.json(dependent_data);
                            let enrollmentDependentResult = await companyModel.saveOne("medi_dependent_temp_enrollment", dependent_data);

                            if(typeof enrollmentDependentResult != "object")
                            {
                                return res.json({
                                    status: false,
                                    message: "Error saving dependent."
                                });
                            }

                        })
                    }
                }
            }
        });
    } catch (error) {
        console.log(error);
        let email = new Object();
        email['end_point'] = 'hr/create/employee_enrollment';
        email['logs'] = `Save Temp Enrollment - ${error}`;
        email['emailSubject'] = 'Error log.';

        // await mailHelper.sendErrorLogs(email);

        return res.json({
            status: false,
            message: `Failed to create enrollment employee. Please contact Mednefits team.`
        })
    }

    return res.json({
        message: 'Saved.',
        data: format,
        status: true
    })
}

const enrollmentDepedentValidation = async (dependent, customerID) => {
    // console.log('dependent', dependent)
    // customerID = customerID || 1;
    // customerID = 1;// to bre removed
    let isValid = null;
    let empValidation = new Object();

    isValid = await validate.joiValidate(dependent.fullname, validate.addEmployee.employeeDependentValidation.fullname, true)

    if(typeof isValid != 'boolean' || !isValid)
    {
        empValidation.fullname_error = true;
        empValidation.fullname_message = `*${isValid.details[0].message}`;
    }
    else
    {
        empValidation.fullname_error = false;
        empValidation.fullname_message = '';
    }

    isValid = await validate.joiValidate(dependent.dob, validate.addEmployee.employeeDependentValidation.dob, true)

    if(typeof isValid != 'boolean' || !isValid)
    {
        empValidation.dob_error = true;
        empValidation.dob_message = `*${isValid.details[0].message}`;
    }
    else
    {
        empValidation.dob_error = false;
        empValidation.dob_message = '';
    }

    isValid = await validate.joiValidate(dependent.relationship, validate.addEmployee.employeeDependentValidation.relationship, true)

    if(typeof isValid != 'boolean' || !isValid)
    {
        empValidation.relationship_error = true;
        empValidation.relationship_message = `*${isValid.details[0].message}`;
    }
    else
    {
        if(["spouse", "child", "family"].indexOf(dependent.relationship) >= 0)
        {
            empValidation.relationship_error = false;
            empValidation.relationship_message = '';
        }
        else
        {
            empValidation.relationship_error = true;
            empValidation.relationship_message = '*Relationship type should be either Spouse, Child or Family.';
        }
    }

    isValid = await validate.joiValidate(new Date(dependent.plan_start), validate.addEmployee.enrollmentEmployeeValidation.plan_start, true)

    if(typeof isValid != 'boolean')
    {
        empValidation.start_date_error = true;
        empValidation.start_date_message = `*${isValid.details[0].message}`;
        empValidation.start_date_result = false;
    }
    else
    {
        let planDates = await getCompanyPlanDates(customerID);
        let start = parseFloat(moment(new Date(planDates.plan_start)).format("YYYYMMDD"));
        let end = parseFloat(moment(new Date(planDates.plan_end)).format("YYYYMMDD"));
        let _planStart = parseFloat(moment(new Date(dependent.plan_start)).format("YYYYMMDD"));

        if(_planStart >= start && _planStart <= end)
        {
            empValidation.start_date_error = false;
            empValidation.start_date_message = '';
            empValidation.start_date_result = false;
        }
        else
        {
            empValidation.start_date_error = true;
            empValidation.start_date_message = `*Start Date must be between company's plan start and plan end (${planDates.plan_start} - ${planDates.plan_end}).`;
            empValidation.start_date_result = false;
        }
    }

    empValidation.error_status = (Object.values(empValidation)).every(function(e){ return e; });

    return empValidation;
}

const getCompanyAvailableDependenPlanId = async(customerID) =>
{
    let plan = await companyModel.aggregation('medi_customer_plans',
        [
            {$match: {customer_id: customerID}},
            {$sort:{ created_at: -1}},
            {$limit: 1}
        ]
    );

    if(typeof plan != "object" || (Object.keys(plan)).length <= 0)
    {
        return false;
    }

    let dependentPlans = await companyModel.aggregation('medi_dependent_plans',
        [
            {$match: {customer_plan_id: plan[0].customer_plan_id}},
            {$sort:{ created_at: -1}},
            {$limit:1}
        ]
    );

    if(typeof dependentPlans != "object" || (Object.keys(dependentPlans)).length <= 0)
    {
        return false;
    }

    let activeUsersCount = null;
    let pendingEnrollment = 0;

    await map(dependentPlans, async dependent => {
        activeUsersCount = await companyModel.countCollection("medi_dependent_plan_history",{dependent_plan_id: dependent.dependent_plan_id,type: 'started'},true);
        pendingEnrollment = await parseFloat(dependent.total_dependents) - activeUsersCount;

        if(pendingEnrollment > 0)
        {
            console.log('here dependent.dependent_plan_id', dependent.dependent_plan_id)
            return dependent.dependent_plan_id;
        }
    })

    return dependentPlans[0].dependent_plan_id;
}

const getCompanyPlanDates = async (customerID) =>
{
    // customerID = await mongoose.mongo.ObjectId(customerID);
    let endPlanDate = null;
    let typeOfCalendar = null;
    let calendar = null;
    console.log('customerID', customerID);
    let plan = await companyModel.aggregation('medi_customer_plans',
        [
            {$match:{ customer_id: customerID}},
            {$sort:{ created_at: -1}},
            {$limit:1}
        ]
    );
    plan = plan[0]
    console.log('plan', plan)

    let activePlan = await companyModel.getOne('medi_customer_active_plans', {customer_plan_id: plan.customer_plan_id});
    // console.warn(activePlan)
    if(activePlan.duration)
    {
        // console.warn('calendar21')

        typeOfCalendar = (activePlan.duration).split(" ");
        calendar = null;

        if( typeOfCalendar[1] == "month" || typeOfCalendar[1] == "months" )
        {
            calendar = "months";
        }
        else if(typeOfCalendar[1] == "days" || typeOfCalendar[1] == "days")
        {
            calendar == "days";
        }
        else if(typeOfCalendar[1] == "year" || typeOfCalendar[1] == "years")
        {
            calendar = "years";
        }
        console.warn('calendar2')
        console.warn(calendar)

        endPlanDate = moment(activePlan.plan_start).add(typeOfCalendar[0],calendar).format("YYYY-MM-DD");
        console.warn(endPlanDate)

    }
    else
    {
        // console.warn('calendar2')
        endPlanDate = moment(new Date(activePlan.plan_start)).add(1,"years").format("YYYY-MM-DD");
    }

    if(parseInt(activePlan.plan_extention_enable) == 1)
    {
        let activePlanExtension = await companyModel.getOne("medi_active_plan_extensions",{customer_active_plan_id:activePlan.customer_active_plan_id});

        if(activePlanExtension)
        {
            if(activePlanExtension.duration)
            {
                console.warn('calendar1')
                typeOfCalendar = (activePlanExtension.duration).split(" ");
                calendar = null;
                if( typeOfCalendar[1] == "month" || typeOfCalendar[1] == "months" )
                {
                    calendar = "months";
                }
                else if(typeOfCalendar[1] == "days" || typeOfCalendar[1] == "days")
                {
                    calendar == "days";
                }
                else if(typeOfCalendar[1] == "year" && typeOfCalendar[1] == "years")
                {
                    calendar = "years";
                }

                endPlanDate = moment(new Date(activePlanExtension.plan_start)).add(typeOfCalendar[0],calendar).format("YYYY-MM-DD");
            }
            else
            {
                // console.warn('calendar2')
                endPlanDate = moment(new Date(activePlanExtension.plan_start)).add(1,"years").format("YYYY-MM-DD");
            }
        }
    }

    console.warn(endPlanDate);
    endPlanDate = moment(new Date(endPlanDate)).subtract(1,"days").format("YYYY-MM-DD");
    console.warn(endPlanDate);
    // console.warn(plan)
    return {plan_start: plan.plan_start, plan_end: endPlanDate};
}

const getCompanyCurrentPlanDates = async (req, res, next) =>{
    if(!req.query.customer_id) {
        return res.status(400).json({
            status: false,
            message: "customer_id is required",
        });
    }

    try {
        let customerID = mongoose.mongo.ObjectId(req.query.customer_id);
        let purchase = await companyModel.getOne("medi_customer_purchase", { _id: customerID });

        if(!purchase) {
            return res.status(404).json({
                status: false,
                message: "Customer does not exist",
            });
        }

        let result = await getCompanyPlanDates(customerID)
        result.status = true;
        result.customer_id = customerID;
        return res.status(200).json(result);

    } catch(error) {
        console.log('error', error)
        return res.status(400).json({
            status: false,
            message: 'id not found',
        });
    }
}

const enrollmentEmployeeValidation = async (user, exceptEnrolleEmailValidation, customerID) => {

    // customerID = customerID || 1;
    let mobileError = false;
    let mobileMessage = "";
    let emailError = false;
    let emailMessage = "";
    let isValid = false;
    let empValidation = new Object();

    if(user.mobile)
    {
        isValid = await validate.joiValidate(user.mobile, validate.addEmployee.enrollmentEmployeeValidation.mobile, true)

        if(typeof isValid != 'boolean')
        {
            empValidation.mobile_error = true;
            empValidation.mobile_message = `*${isValid.details[0].message}`;
        }
        else
        {
            let check = await companyModel.getOne("medi_members", {mobile: user.mobile, active: 1, member_type: 5});

            if(check) {
                empValidation.mobile_error = true;
                empValidation.mobile_message = '*Mobile Phone number is already taken.';
            } else {
                empValidation.mobile_error = false;
                empValidation.mobile_message = '';
            }
        }

    }
    else
    {
        empValidation.mobile_error = true;
        empValidation.mobile_message = '*Mobile Phone number is required.';
    }

    if(user.mobile_country_code) {
        empValidation.mobile_area_code_error = false;
        empValidation.mobile_area_code_message = '';
    } else {
        empValidation.mobile_area_code_error = true;
        empValidation.mobile_area_code_message = '*Mobile Country Code is required.';
    }

    if(user.email) {
        let check = await companyModel.getOne("medi_members", {email: user.email, active: 1, member_type: 5});

        if(check)
        {
            empValidation.email_error = true;
            empValidation.email_message = `*${isValid.details[0].message}`;
        }

        if(!exceptEnrolleEmailValidation)
        {
            let checkEmail = await companyModel.getOne("medi_customer_employee_temp_enrollment", {email: user.email, enrolled_status: 0, member_type: 5});

            if(checkEmail)
            {
                empValidation.email_error = true;
                empValidation.email_message = `*${isValid.details[0].message}`;
            }
        }
    }

    isValid = await validate.joiValidate(user.fullname, validate.addEmployee.enrollmentEmployeeValidation.fullname, true)

    if(typeof isValid != 'boolean')
    {
        empValidation.fullname_error = true;
        empValidation.fullname_message = `*${isValid.details[0].message}`;
    }
    else
    {
        empValidation.fullname_error = false;
        empValidation.fullname_message = '';
    }

    isValid = await validate.joiValidate(new Date(user.dob), validate.addEmployee.enrollmentEmployeeValidation.dob, true)

    if(typeof isValid != 'boolean')
    {
        empValidation.dob_error = true;
        empValidation.dob_message = `*${isValid.details[0].message}`;
    }
    else
    {
        empValidation.dob_error = false;
        empValidation.dob_message = '';
    }

    isValid = await validate.joiValidate(user.postal_code, validate.addEmployee.enrollmentEmployeeValidation.postal_code, true)

    if(typeof isValid != 'boolean')
    {
        empValidation.postal_code_error = true;
        empValidation.postal_code_message = `*${isValid.details[0].message}`;
    }
    else
    {
        empValidation.postal_code_error = false;
        empValidation.postal_code_message = '';
    }

    isValid = await validate.joiValidate(user.nric, validate.addEmployee.enrollmentEmployeeValidation.nric, true)

    if(typeof isValid != 'boolean')
    {
        empValidation.nric_error = true;
        empValidation.nric_message = `*${isValid.details[0].message}`;
    }
    else
    {
        let checkDuplicateNRIC = await companyModel.getOne('medi_customer_employee_temp_enrollment', {nric: user.nric});
        let memberNRIC = await companyModel.getOne('medi_members', {nric: user.nric, active: 1});

        if(checkDuplicateNRIC || memberNRIC)
        {
            empValidation.nric_error = true;
            empValidation.nric_message = '*NRIC/FIN is must be duplicate';
        }
        else
        {
            empValidation.nric_error = false;
            empValidation.nric_message = '';
        }
    }

    isValid = await validate.joiValidate(new Date(user.plan_start), validate.addEmployee.enrollmentEmployeeValidation.plan_start, true)

    if(typeof isValid != 'boolean')
    {
        empValidation.start_date_error = true;
        empValidation.start_date_message = `*${isValid.details[0].message}`;
        empValidation.start_date_result = false;
    }
    else
    {
        let planDates = await getCompanyPlanDates(customerID);
        console.warn('planDates');
        console.warn(planDates)
        let start = parseFloat(moment(new Date(planDates.plan_start)).format("YYYYMMDD"));
        let end = parseFloat(moment(new Date(planDates.plan_end)).format("YYYYMMDD"));
        let _planStart = parseFloat(moment(new Date(user.plan_start)).format("YYYYMMDD"));

        if(_planStart >= start && _planStart <= end)
        {
            empValidation.start_date_error = false;
            empValidation.start_date_message = '';
            empValidation.start_date_result = false;
        }
        else
        {
            empValidation.start_date_error = true;
            empValidation.start_date_message = `*Start Date must be between company's plan start and plan end (${planDates.plan_start} - ${planDates.plan_end}).`;
            empValidation.start_date_result = false;
        }
    }

    if(typeof user.medical_credits == 'undefined' || user.medical_credits <= 0)
    {
        empValidation.credit_medical_amount = 0;
        empValidation.credits_medical_error = false;
        empValidation.credits_medical_message = '';
    }
    else
    {
        if(typeof user.medical_credits == "number")
        {
            empValidation.credits_medical_error = false;
            empValidation.credits_medical_message = '';
        }
        else
        {
            empValidation.credits_medical_error = true;
            empValidation.credits_medical_message = 'Credits is not a number.';
        }
    }

    if(typeof user.wellness_credits == 'undefined' || user.wellness_credits <= 0)
    {
        empValidation.credit_wellness_amount = 0;
        empValidation.credits_wellness_error = false;
        empValidation.credits_wellnes_message = '';
    }
    else
    {
        if(typeof user.wellness_credits == "number")
        {
            empValidation.credits_wellness_error = false;
            empValidation.credits_wellnes_message = '';
        }
        else
        {
            empValidation.credits_wellness_error = true;
            empValidation.credits_wellnes_message = 'Credits is not a number.';
        }
    }

    empValidation.error_status = (Object.values(empValidation)).every(function(e){ return e; });

    return empValidation;

}

const finishEnrollEmployeeTier = async ( req, res, next ) =>
{
    let data = req.body;
    let enrollmentID = parseInt(data.temp_enrollment_id);

    if(!enrollmentID)
    {
        res.json({
            status: false,
            message: 'Employee Enrollee ID is required.'
        })
    }

    console.log('enrollmentID', enrollmentID)
    let checkEnrollee = await companyModel.getOne("medi_customer_employee_temp_enrollment", {temp_enrollment_id: enrollmentID})
    console.log('checkEnrollee', checkEnrollee)
    if(!checkEnrollee)
    {
        return res.json({
            status: false,
            message: 'Employee Enrollee does not exist.'
        });
    }

    if(checkEnrollee.error_logs.error_status)
    {
        return res.json({
            status: false,
            message: 'Please fix the Empoyee Enrollee details as it has errors on employee details.'
        });
    }
    let customerID = checkEnrollee.customer_id;
    let userResult = await createEmployee(enrollmentID, customerID);

    return res.json({
        status: true,
        message: "Saved.",
        result: userResult
    });//{result: userResult}

}

const removeEnrollee = async (req, res, next) =>
{
    if(!req.query.id) {
        return res.status(400).json({
            status: false,
            message: 'id is required',
            data: result
        });
    }
    let id = parseInt(req.query.id);
    let result = await companyModel.removeData("medi_customer_employee_temp_enrollment", {temp_enrollment_id: id});
    if(result)
    {
        return res.status(200).json({
            'status': true,
            'message': 'Success.'
        });
    }

    return res.json({
        status: false,
        message: 'Failed.',
        data: result
    });
}

const createEmployee = async (enrollmentID, customerID) => {

  let createdAt = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
  let updatedAt = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");

  let dataEnrollee = await companyModel.getOne("medi_customer_employee_temp_enrollment",{temp_enrollment_id: enrollmentID});

  if(!dataEnrollee)
  {
    return { status: false, message: "Enrollee does not exist." }
  }

  if(dataEnrollee.enrolled_status == 1) {
    return { status: false, message: "Enrollee already created." }
  }

  // let member_data = new Object();

  let planned = await companyModel.aggregation("medi_customer_plans",
    [
    {$match: {customer_id: customerID}},
    {$sort: {created_at: -1}},
    {$limit:1}
    ]
    );
  // console.log('planned', planned)
  planned = planned[0]
  let planStatus = await companyModel.aggregation( "medi_customer_plan_status",
    [
    {$match: {customer_plan_id: planned.customer_plan_id}},
    {$sort:{created_at: -1}},
    {$limit:1}
    ]
    );
  planStatus = planStatus[0]
      // console.warn('planStatus')
      // console.warn(planStatus)

      let total = parseFloat(planStatus.employees_input) - parseFloat(planStatus.enrolled_employees)

      if(total <= 0) {
        return res.json({
          status: false,
          message: "We realised the current headcount you wish to enroll is over the current vacant member seat/s."
        });
      }

      let customerActivePlanID = await PlanHelper.getCompanyAvailableActivePlan(customerID)
      let activePlan = null;

      if(!customerActivePlanID)
      {
        activePlan = await companyModel.aggregation("medi_customer_active_plans",
          [
          {$match: {customer_id: customerID}},
          {$sort:{created_at: -1}},
          {$limit:1}
          ]
          );
        activePlan = activePlan[0]
      }
      else
      {
        activePlan = await companyModel.getOne("medi_customer_active_plans", {customer_active_plan_id: customerActivePlanID});
      // console.warn('here')
      // console.warn(activePlan)
    }

    let corporate = await companyModel.getOne("medi_customer_purchase", {customer_id: customerID});
    let startDate = moment().format("YYYY-MM-DD");

    if(!dataEnrollee.start_date)
    {
      startDate = moment(new Date(dataEnrollee.start_date)).format("YYYY-MM-DD");
    }

    let temp_password = "mednefits";
    let password = sha256(temp_password);

    let data = {
      name: dataEnrollee.fullname,
      password: password,
      email: dataEnrollee.email,
      phone_no: dataEnrollee.mobile,
      phone_code: "+" + dataEnrollee.mobile_country_code,
      nric: dataEnrollee.nric,
      job_title: dataEnrollee.job_title,
      active: 1,
      zip_code: dataEnrollee.postal_code,
      dob: moment(new Date(dataEnrollee.dob)).format("YYYY-MM-DD"),
    }

    let userID = await UserHelper.createUserFromCorporate(data);
  // console.log('userID sss', userID);
  let corporateMember = {
    company_member_id: await global_helper.getId('medi_company_members', 'company_member_id'),
    customer_id: customerID,
    member_id: userID,
    created_at: createdAt,
    updated_at: updatedAt
  }

  let companyMemberResult = await companyModel.saveOne(
    "medi_company_members", corporateMember);

  if(!companyMemberResult)
  {
      // rollback
    }


  // $plan_type = new UserPlanType();

  let planAddOn = await PlanHelper.getCompanyAccountTypeEnrollee(customerID);
  // console.warn('activePlan--')
  // console.warn(activePlan)
  let result = await PlanHelper.getEnrolleePackages(activePlan.customer_active_plan_id, planAddOn);
  let packageGroupID = 0;

  if(!result)
  {
    packageGroupID = await PackagePlanGroup.getPackagePlanGroupDefault();
  }
  else
  {
    packageGroupID = result;
  }


  let bundleResult = await Bundle.getBundle(packageGroupID);
  console.log('bundleResult', bundleResult);
  // $result_bundle = $bundle->getBundle($group_package_id);

  await map(bundleResult, async element => {
    await UserPackage.createUserPackage(element.benefits_care_package_id, userID);
  })

  let userPlanTypeResult = await UserPlanHistory.createUserPlanHistory({
    member_plan_history_id: await global_helper.getId('medi_member_plan_history', 'member_plan_history_id'),
    member_id: userID,
    type: "started",
    package_group_id: packageGroupID,
    duration: '12 months',
    plan_start: startDate,
    customer_active_plan_id: activePlan.customer_active_plan_id,
    fixed: 1,
    created_at: createdAt,
    updated_at: updatedAt
  });

  let customer = await companyModel.getOne("medi_customer_wallets", {customer_id: customerID});
  // $customer = DB::table('customer_credits')->where('customer_id', $customer_id)->first();
  let resultCustomerActivePlanID = null;
  // let customerActivePlanID = null;
  if(parseFloat(customer.medical_balance) > 0)
  {
    if(parseFloat(customer.medical_balance) >= dataEnrollee.medical_credits)
    {
      await creaditsAllocation(customerID, dataEnrollee, customerActivePlanID, userID, activePlan, createdAt, updatedAt, "medical", customer);
    }
  }

  if(parseFloat(customer.wellness_balance) > 0)
  {
    if(parseFloat(customer.wellness_balance) >= dataEnrollee.wellness_credits)
    {
      await creaditsAllocation(customerID, dataEnrollee, customerActivePlanID, userID, activePlan, createdAt, updatedAt, "wellness",customer);
    }
  }

  console.log('planned.customer_plan_id', planned.customer_plan_id)
  let customerPlanAdjustmentResult = await CustomerPlanStatus.addjustCustomerStatus('employee_enrolled_count', planned.customer_plan_id, 'increment', 1);
  let tempEmployResult = await companyModel.updateOne("medi_customer_employee_temp_enrollment", {
    temp_enrollment_id: enrollmentID
  },
  {
    enrolled_status: 1,
    active_plan_id: customerActivePlanID
  });

  if((Object.keys(dataEnrollee || {})).length > 0)
  {
    if(dataEnrollee.plan_tier)
    {
      let employeePlantier = await companyModel.getOne("medi_customer_plan_tiers", {plan_tier_id: dataEnrollee.plan_tier_id});

      if((Object.keys(employeePlantier || {})).length > 0)
      {
        let plantierUserResult = await PlanTierUsers.createData({
          plan_tier_user_id: await global_helper.getId('medi_customer_plan_tier_users', 'plan_tier_user_id'),
          plan_tier_id: dataEnrollee.plan_tier_id,
          member_id: userID,
          status: 1,
          created_at: createdAt,
          updated_at: updatedAt
        });

        await PlanTier.increamentMemberEnrolledHeadCount(dataEnrollee.plan_tier_id);
      }
    }
  }

    await enrollDependents(enrollmentID, customerID, userID, planned.customer_plan_id)
    let member = await companyModel.getOne("medi_members", { member_id: userID });
    let company = await companyModel.getOne('medi_customer_business_information', { customer_id: customerID });
    if(member.email) {
      var data_sent = {
        email: member.email,
        emailName: member.fullname,
        subject: 'WELCOME TO MEDNEFITS CARE',
        email_page: '../email_templates/mednefits-welcome-member-enrolled',
        name: member.fullname,
        creds: member.nric ? member.nric : member.phone_no,
        password: temp_password,
        plan_start: startDate,
        company: company.company_name,
        plan: activePlan
      }
      // send via email
      await mailHelper.sendMail(data_sent);
    }

    if(member.phone_code) {
      let phone = await smsHelper.formatSmsNumber(member.phone_code, member.phone_no);
      let message = {
        body: await smsHelper.formatSmsMessage({ name: member.fullname, company: company.company_name, plan_start: startDate, phone: member.nric ? member.nric : member.phone_no, password: temp_password }),
        to: phone
      }

      // send to sms
      await smsHelper.sendSms(message);
    }

    return { status: true };
}

const creaditsAllocation = async (customerID, dataEnrollee, customerActivePlanID, userID, activePlan, createdAt, updatedAt, walletType, customer) => {
    console.log('creaditsAllocation userID', userID)
    resultCustomerActivePlanID = allocateCreditBaseInActivePlan(customerID,parseFloat((walletType == "medical" ? dataEnrollee.medical_credits : dataEnrollee.wellness_credits)),walletType);

    customerActivePlanID = (customerActivePlanID ? customerActivePlanID : null);

    let wallet = await companyModel.getOne("medi_member_wallet", {member_id: userID});
    console.log('wallet', wallet);
    let walletUpdate = await WalletHelper.addCredits(userID, (walletType == "medical" ? dataEnrollee.medical_credits : dataEnrollee.wellness_credits), walletType);
    delete _id;
    let walletHistory = {
        "_id": await global_helper.createUuID(),
        "member_wallet_id": wallet._id,
        "credit": (walletType == "medical" ? dataEnrollee.medical_credits : dataEnrollee.wellness_credits),
        "running_balance": (walletType == "medical" ? dataEnrollee.medical_credits : dataEnrollee.wellness_credits),
        "type": "added_by_hr",
        "employee_id": userID,
        "customer_active_plan_id": activePlan._id,
        "wallet_type": walletType,
        "spend": null, //default create
        "created_at": createdAt,
        "updated_at": updatedAt
    };

    let walletHistoryResult = await WalletHistoryHelper.createWalletHistory(walletHistory);

    let customerCreditsResult = await CustomerCreditsHelper.deductCustomerCredits(customer._id, (walletType == "medical" ? dataEnrollee.medical_credits : dataEnrollee.wellness_credits), (walletType == "medical" ? "medical" : "wellness") );
    // let customerCreditsLeft = await companyModel.getOne("medi_customer_wallets", {_id: await mongoose.mongo.ObjectId(customer._id)});
    console.warn('customerCreditsResult',customerCreditsResult)
    // if(customerCreditsResult)
    // {
        let companyDeductLogs = {
            _id: await global_helper.createUuID(),
            customer_wallet_id: customer._id,
            credit: (walletType == "medical" ? dataEnrollee.medical_credits : dataEnrollee.wellness_credits),
            running_balance: (walletType == "medical" ? (parseFloat(customer.medical_balance) - parseFloat(dataEnrollee.medical_credits)) : (parseFloat(customer.wellness_balance) - parseFloat(dataEnrollee.wellness_credits))),
            type:'added_employee_credits',
            employee_id: userID,
            customer_active_plan_id: activePlan.customer_active_plan_id,
            wallet_type: walletType,
            currency_type: "sgd",
            currency_value: "",
            created_at: createdAt,
            updated_at: updatedAt
        }

        console.log('companyDeductLogs', companyDeductLogs)

        await CustomerCreditLogsHelper.createCustomerCreditLogs(companyDeductLogs);
    // }
}

const allocateCreditBaseInActivePlan = async (customerID, credit, type) =>
{
    let plan = await companyModel.aggregation(
        "medi_customer_plans",
        [
            {
                $match: {
                    customer_id: customerID
                }
            },
            // {
            // $group:
            //     {
            //         id: "$customer_id"
            //         // customer_id : `$${customerID}`,
            //         // created_at: `${created_at}`,
            //     }
            // },
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
    // $plan = DB::table('customer_plan')->where('customer_buy_start_id', $id)->orderBy('created_at', 'desc')->first();

    let activePlans = await companyModel.getMany("medi_customer_active_plans", {customer_plan_id: plan.customer_plan_id});
    // $active_plans = DB::table('customer_active_plan')->where('plan_id', $plan->customer_plan_id)->get();

    let totalMedicalAllocation = 0;
    let totalWellnessAllocation = 0;
    let totalAllocatedAmountMedicalWellness = 0;
    let tempMedicalAllocation = null;
    let tempWellnessAllocation = null;
    let tempWellnessDeductAllocation = 0;
    let tempMedicalDeductAllocation = 0;

    await map(activePlans, async active => {
        totalMedicalAllocation = 0;
        totalWellnessAllocation = 0;

        active.total_unallocated_medical = 0;
        active.total_unallocated_wellness = 0;

        totalAllocatedAmountMedicalWellness = await companyModel.aggregation("medi_customer_wallet_history",[
            {
                $not: [ null ]
            },
            {
                $match: {
                    $and: [
                        {customer_active_plan_id: active.customer_active_plan_id},
                        {logs: 'admin_added_credits'},
                        {wallet_type:(type=="medical" ? "medical": "wellness")}
                    ]
                }
            },
            {
                $sum : "credit"
            }
        ]);

        active[(type == "medical" ? "total_allocated_amount_medical" : "total_allocated_amount_wellness")] = totalAllocatedAmountMedicalWellness;

        let joinResult = await companyModel.aggregation("medi_member_wallet", [
                {   $lookup:{
                        from: "medi_wallet_history",
                        localField : "member_wallet_id",
                        foreignField : "member_wallet_id",
                        as : "medi_wallet_history"
                    },
                },
                {   $unwind: "$medi_wallet_history" },
                {   $match: { $and: [
                            {"medi_wallet_history.wallet_type": (type == "medical" ? "medical" : "wellness")},
                            {"medi_wallet_history.type": {
                                $in: ["added_by_hr","deducted_by_hr"]
                            }},
                            {"medi_wallet_history.customer_active_plan_id": active.customer_active_plan_id}
                        ] }
                },
                {   $group: {
                        _id: null,
                        total: {
                            $sum:{
                                $cond: {
                                    if: {$eq:["$medi_wallet_history.type","added_by_hr"]},
                                    then: "$medi_wallet_history.credit",
                                    else: "0"
                                }
                            }
                        },
                        total1: {
                            $sum: {
                                $cond: {
                                    if: { $eq:["$medi_wallet_history.type","deducted_by_hr"]},
                                    then: "$medi_wallet_history.credit",
                                    else: "0"
                                }
                            }
                        },
                    }
                },
                {   $project: {
                        totalMWAllocation: {
                            $subtract: ["$total1","$total"]
                        }
                    }
                }
            ]);

            if(type == "medical")
            {
                active.total_unallocated_medical = (parseFloat(active.total_allocated_amount_medical) - parseFloat((joinResult[0]['totalMWAllocation'] || 0)));
                if(active.total_unallocated_medical > 0 && active.total_unallocated_medical >= parseFloat(credit))
                {
                    return active.customer_active_plan_id;
                }
            }
            else
            {
                active.total_unallocated_wellness = (parseFloat(active.total_allocated_amount_medical) - parseFloat((joinResult[0]['totalMWAllocation'] || 0)));
                if(active.total_unallocated_wellness > 0 && active.total_allocated_amount_wellness >= parseFloat(credit))
                {
                    return active.customer_active_plan_id;
                }
            }

            return false;

    });
}

const enrollDependents = async (tempEnrollmentID, customerID, employeeID, customerPlanID) =>
{
    let dependentEnrollees = await companyModel.getMany(
        "medi_dependent_temp_enrollment",
        {employee_temp_id: tempEnrollmentID}
    );

    console.log('dependentEnrollees', dependentEnrollees)

    if(dependentEnrollees)
    {
        let data = null;
        let packageGroup = null;
        let groupPackageID = null;
        let userID = null;
        await map(dependentEnrollees, async element => {
            data = {
                name: element.fullname,
                active: 1,
                dob: element.dob,
                member_type: "dependent",
            }
            console.log('data dependent', data)
            packageGroup = await getDependentPackageGroup(element.dependent_plan_id);

            if(!packageGroup)
            {
                groupPackageID = await PackagePlanGroup.getPackagePlanGroupDefault();
            }
            else
            {
                groupPackageID = packageGroup.package_group_id
            }

            userID = await UserHelper.createUserFromDependent(data);

            if(userID)
            {
                let familyCoverageResult = await FamilyCoverageAccounts.createData({
                    member_covered_dependent_id: await global_helper.getId('medi_member_covered_dependents', 'member_covered_dependent_id'),
                    owner_id: employeeID,
                    member_id: userID,
                    relationship: element.relationship,
                    deleted: 0,
                    deleted_at: null,
                    created_at: moment(new Date()).format("YYYY-MM-DD hh:mm:ss"),
                    updated_at: moment(new Date()).format("YYYY-MM-DD hh:mm:ss")
                });

                if(familyCoverageResult)
                {
                    if(element.plan_tier_id)
                    {
                        let planTierHistory = {
                            plan_tier_user_id: await global_helper.getId('medi_customer_plan_tier_users', 'plan_tier_user_id'),//primaryID
                            plan_tier_id: element.plan_tier_id,
                            member_id: userID,
                            status: 1,
                            created_at: moment(new Date()).format("YYYY-MM-DD hh:mm:ss"),
                            updated_at: moment(new Date()).format("YYYY-MM-DD hh:mm:ss")
                        }

                        await PlanTier.increamentMemberEnrolledHeadCount(element.plan_tier_id);
                    }

                    await DependentTempEnrollment.updateEnrollementStatus(element.dependent_temp_id);
                    await DependentPlanStatus.incrementEnrolledDependents(customerPlanID)

                }
            }
        })
    }
}


const getDependentPackageGroup = async (dependentPlanID) =>
{
    let wallet = 0;
    let accountType = null;
    let secondaryAccountType = null;

    let dependentPlan = await companyModel.getOne(
        "medi_dependent_plans",
        {dependent_plan_id: dependentPlanID}
    );

    if((Object.keys(dependentPlan || {})).length <= 0)
    {
        return false;
    }

    // let plan = await companyModel.getOne("medi_customer_plans", {customer_plan_id: dependentPlan.customer_plan_id});

    let hr = await companyModel.getOne("medi_customer_purchase", {customer_id: dependentPlan.customer_id});

    if((Object.keys(hr || {})).length > 0)
    {
        if(parseInt(hr.wallet) == 1 && parseInt(hr.qr_payment) == 1)
        {
            wallet = 1;
        }
    }

    if(dependentPlan.account_type == "insurance_bundle")
    {
        if(dependentPlan.secondary_account_type == "pro_plan_bundle")
        {
            secondaryAccountType = "pro_plan_bundle";
        }
        else
        {
            secondaryAccountType = "insurance_bundle_lite";
        }
        accountType = secondaryAccountType;
    }
    else if(dependentPlan.account_type == "trial_plan")
    {
        let packageGroup = await companyModel.getOne("medi_benefits_package_group", {
            default_selection: 1
        });

        return packageGroup;
    }
    else
    {
        accountType = dependentPlan.account_type;
        $secondary_account_type =  dependentPlan.account_type;
    }

    let packageGroup = await companyModel.getOne("medi_benefits_package_group",{
        account_type: accountType,
        secondary_account_type: secondaryAccountType,
        wallet: wallet
    });

    return packageGroup;
}

const getTempEnrollees = async (req, res, next) => {
    if(!req.query.customer_id) {
        return res.status(400).json({
            status: false,
            message: "customer_id is required",
        });
    }

    try {
        let results = await companyModel.getMany('medi_customer_employee_temp_enrollment', { customer_id: req.query.customer_id });
        return res.status(200).json({ status: true, data: results })
    } catch(error) {
        return res.status(400).json({ status: false, message: 'customer id does not exist' })
    }
}

const testAddMemberBalance = async (req, res, next) => {
    const { member_id, type, amount } = req.body;
    let walletUpdate = await WalletHelper.addCredits(member_id, amount, type);

    return res.json({
        status: true,
        message: 'Success.',
        data: walletUpdate
    });
}

const getCompanyInfo = async (req, res, next) => {
    // console.log(req.query.id);
    if(!req.query.customer_id) {
        return res.status(400).json({
            status: false,
            message: "customer_id is required",
        });
    }

    try {
        let customerID = req.query.customer_id;
        let purchase = await companyModel.getOne("medi_customer_purchase", { customer_id: customerID });

        if(!purchase) {
            return res.status(404).json({
                status: false,
                message: "Customer does not exist",
            });
        }

        let customer_active_plans = await companyModel.getMany("medi_customer_active_plans", { customer_id: customerID });

        let customer_billing_contacts = await companyModel.getOne("medi_customer_billing_contact", { customer_id: customerID });

        let customer_business_informations = await companyModel.getOne("medi_customer_business_information", { customer_id: customerID });

        let customer_employee_plan_payment_refunds = await companyModel.getMany("medi_customer_employee_plan_payment_refunds", { customer_id: customerID });

        let customer_employee_plan_refund_details = await companyModel.getMany("medi_customer_employee_plan_refund_details", { customer_id: customerID });

        let customer_employee_temp_enrollments = await companyModel.getMany("medi_customer_employee_temp_enrollment", { customer_id: customerID });

        let customer_hr_accounts = await companyModel.getMany("medi_customer_hr_accounts", { customer_id: customerID });

        let customer_plan_status = await companyModel.getMany("medi_customer_plan_status", { customer_id: customerID });

        let customer_plan_tiers = await companyModel.getMany("medi_customer_plan_tiers", { customer_id: customerID });

        let customer_plans = await companyModel.getMany("medi_customer_plans", { customer_id: customerID });

        let customer_renew_plans = await companyModel.getMany("medi_customer_renew_plans", { customer_id: customerID });

        let customer_spending_deposit_credits = await companyModel.getMany("medi_customer_spending_deposit_credits", { customer_id: customerID });

        let customer_spending_invoices = await companyModel.getMany("medi_customer_spending_invoices", { customer_id: customerID });

        let customer_wallet_history = await companyModel.getMany("medi_customer_wallet_history", { customer_id: customerID });

        let customer_wallets = await companyModel.getOne("medi_customer_wallets", { customer_id: customerID });

        let active_plan_extensions = await companyModel.getMany("medi_active_plan_extensions", { customer_id: customerID });

        let dependent_plans = await companyModel.getMany("medi_dependent_plans", { customer_id: customerID });

        let dependent_invoices = await companyModel.getMany("medi_dependent_invoices", { customer_id: customerID });

        let dependent_plan_status = await companyModel.getMany("medi_dependent_plan_status", { customer_id: customerID });

        let info = {
            customer_purchase: purchase,
            customer_active_plans: customer_active_plans,
            active_plan_extensions: active_plan_extensions,
            customer_plans: customer_plans,
            dependent_plans: dependent_plans,
            dependent_invoices: dependent_invoices,
            dependent_plan_status: dependent_plan_status,
            customer_billing_contacts: customer_billing_contacts,
            customer_business_informations: customer_business_informations,
            customer_employee_plan_payment_refunds: customer_employee_plan_payment_refunds,
            customer_employee_plan_refund_details: customer_employee_plan_refund_details,
            customer_employee_temp_enrollments: customer_employee_temp_enrollments,
            customer_hr_accounts: customer_hr_accounts,
            customer_plan_status: customer_plan_status,
            customer_plan_tiers: customer_plan_tiers,
            customer_spending_deposit_credits: customer_spending_deposit_credits,
            customer_spending_invoices: customer_spending_invoices.Items,
            customer_wallet_history: customer_wallet_history,
            customer_wallets: customer_wallets
        }

        return res.status(200).json({
            status: true,
            message: "Success.",
            info: info
        });

    } catch(error) {
        console.log('error', error)
        return res.status(400).json({
            status: false,
            message: 'id not found',
        });
    }
}

const getTotalMembers = async (req, res, next) => {

    if(!req.query.customer_id) {
        return res.status(400).json({
            status: false,
            message: "customer_id is required",
        });
    }

    try {
        let customerID = req.query.customer_id;
        let purchase = await companyModel.getOne("medi_customer_purchase", { _id: customerID });
        let totalEnrolledDependents = 0;

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
        let planStatus = await companyModel.aggregation( "medi_customer_plan_status",
            [
                {$match: {customer_plan_id: planned._id}},
                {$sort:{created_at: -1}},
                {$limit:1}
            ]
        );
        planStatus = planStatus[0]
        let total = parseFloat(planStatus.employees_input) - parseFloat(planStatus.enrolled_employees)

        return res.json({
            status: true,
            total_members: totalMembers
        });

    } catch(error) {
        return res.status(400).json({
            status: false,
            message: 'id not found',
        });
    }
}

const testEmail = async (req, res, next) => {
    let results = await PlanHelper.planInvoiceDetails(req.query.id);
    console.log('result', results);
    // return res.json(results);
    let data = {
        pdf_page: 'plan_invoice_pending.ejs',
        context: results,
        options: {
            filename: `${ results.company } ${ results.invoice_number }.pdf`
        }
    }
    let attachment = await pdfHelper.processPdf(data, res)
    console.log('attachment', attachment.path)
    let mail = {
        email: 'allan.alzula.work@gmail.com',
        emailName: 'allan cheam alzula',
        company_name: 'MednefitsTech Inc.',
        subject: 'test email',
        email_page: '../email_templates/mednefits_standalone_pending',
        password: '123456',
        account_link: 'https://mednefits.com',
        attachments: [{
            filename: `${ results.company } ${ results.invoice_number }.pdf`,
            path: attachment.path,
            contentType: 'application/pdf',
            customer: true
        }]
    }
    let result = await mailHelper.sendMail(mail);
    return res.send(attachment);
    let options = {
      page: req.query.page,
      limit: req.query.limit,
    };
    // let results = await companyModel.paginate("medi_members", { active: 0}, options)
    // console.log('results', results)
    // res.json(results);
}


  const getNameUser = async (req, res, next) => {
    let customerID = null;
    let data = req.body;
    let data_info = new Object();
    let billingInfo = await companyModel.getMany("medi_customer_billing_contact", { customer_id: data.customer_id});
    let businessInfo = await companyModel.getMany("medi_customer_business_information", { customer_id: data.customer_id});
    let hrAccount = await companyModel.getMany("medi_customer_hr_accounts", { customer_id: data.customer_id});


    console.log('billing',billingInfo);
    let data_temp = {
      home_profile: {
        billing: billingInfo,
        businessInfo: businessInfo,
        hrAccount: hrAccount
      },
    }
    return res.json(data_temp);
  }

  const getCompanyGroups = async (req, res, next) => {
    let customerID = null;
    let data = req.body;
    let data_info = new Object();
    let groupsCompany = await companyModel.getMany("medi_company_groups", { customer_id: data.customer_id});

    let data_temp = {
      Groups: {
        groups: groupsCompany
      },
    }
    return res.json(data_temp);
  }

  const editCompanyProfile = async ( req, res, next) => {
    let data = req.body;
    let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
    let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");
    let customer_id = parseInt(req.body.customer_id);
    delete data.admin_id;
    delete data.customer_id;

    let companyUpdate = {
       // business_information_id: 1, //mariaDB id
       customer_id: 1, // dummy
       company_name: data.company_name,
       company_size: data.company_size,
       company_country_city: data.company_country_city,
       company_address: data.company_address,
       nature_of_busines: "N/A",
       postal_code: parseInt(data.company_postal_code),
       establish: 1900,
       contact: {
         full_name: data.business_contact_full_name,
         // job_title: data.business_job_title,
         email: data.business_contact_email,
         phone: data.business_phone,
         hr_email: data.business_portal_email,
         created_at: createdAt,
         updated_at: updatedAt,
         send_email_communication: (data.business_send_email_comm_related ? 1 : 0),
         send_email_billing: (data.business_send_email_bill_related ? 1 : 0)
       },
       created_at: createdAt,
       updated_at: updatedAt
     }

     isValid = await validate.joiValidate(companyUpdate, validate.createCompany.companyUpdateProfile, true)

     if(typeof isValid != 'boolean')
     {
       return errorFunc(res,{
         status: false,
         message: isValid.details[0].message
       })
     }

    let updateHr = await companyModel.updateOne('medi_customer_hr_accounts', { customer_id: customer_id});

    let updateBilling = await companyModel.updateOne('medi_customer_billing_contact', { customer_id: customer_id});

    let updateBusiness = await companyModel.updateOne('medi_customer_business_information', { customer_id: customer_id});

    if(updateHr, updateBilling, updateBusiness) {
      console.log(updateHr, updateBilling, updateBusiness);
      return res.json({ status: true, message: 'Profile updated successfully' })
    } else {
      return res.status(400).json({ status: false, message: 'Failed to update profile data.' })
    }
    return res.send('ok')
  };

  const createCompanyGroups = async ( req, res, next) =>
  {
    try {


      console.log('req.body', req.body);
      let customerID = null;
      let data = req.body;
      delete data.admin_id;
      // delete data.member_id;
      let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
      let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");
      let group_name = req.body.group_name;
      let set_limit = req.body.set_limit;
      let customer_id = parseInt(req.body.customer_id);

      let companyGroup = {
        customer_id: 1,
        group_name: data.group_name,
        set_limit: 0,
        created_at: createdAt,
        updated_at: updatedAt
      }

    console.log('data', data);
    isValid = await validate.joiValidate(companyGroup, validate.createCompany.createCompanyGroups, true)
    console.log('isValid', isValid)
    if(typeof isValid != 'boolean')
    {
      return res.status(400).json({
        status: false,
        message: isValid.details[0].message
      })
    }

    let groups = await companyModel.saveOne('medi_company_groups', { group_name: group_name, set_limit: set_limit, customer_id: customer_id, createdAt: createdAt, updatedAt: updatedAt});
    if(groups) {
      return res.json({
        status: true,
        message: 'New group successfully added',
        customer_id: customer_id
      });
    };
  } catch (error) {
      return res.status(400).json({ status: false, message: 'Failed to add new group.' })
    }
  };

  const updatePassword = async (req, res, next) =>
  {
     let data = req.body;
     // let customer_id = parseInt(req.body.cutomer_id);
     // let password = sha256(req.body.password);
     delete data.admin_id;
     delete data.cutomer_id;

     let passUpdate = {
       password: data.password,
       new_password: data.new_password,
       re_type_password: data.re_type_password
     }

     data.password = password;
     isValid = await validate.joiValidate(passUpdate, validate.createCompany.updatePass, true)
      if(typeof isValid != 'boolean')
     {
         return res.status(400).json({
             status: false,
             message: isValid.details[0].message
         })
     }
     let change = await employeeModel.updateOne('medi_customer_hr_accounts', {cutomer_id: cutomer_id}, data)
     console.log('change', change)
     if(change) {
       data.password = password;
       return res.json({ status: true, message: 'successfully updated password' })
     } else {
       return res.status(400).json({ status: false, message: 'Failed to update password' })
     }

     return res.send('ok')
   };


   const getPlanInvoice = async (req, res, next) =>
   {
     let customerID = null;
     let data = req.body;
     let data_info = new Object();
     let planInvoices = await companyModel.getMany("medi_active_plan_invoices", {customer_id: data.customer_id});

     let data_temp = {
       plan_invoice: {
         invoices: planInvoices,
       },
     }
     return res.json(data_temp);
   };


   const getActivePlans = async (req, res, next) =>
   {
     let customerID = null;
     let data = req.body;
     let data_info = new Object();
     let activePlan = await companyModel.getMany("medi_customer_active_plans", {customer_id: data.customer_id});

     let data_temp = {
       Active_plans: {
         plans: activePlan,
       },
     }
     return res.json(data_temp);
   }

   const getSpendingInvoiceInNetwork = async (req, res, next) =>
   {
     let customerID = null;
     let data = req.body;
     let data_info = new Object();
     let spendingInvoiceInNetwork = await companyModel.getMany("medi_spending_invoice_in_network_transactions");

     let data_temp = {
       In_Network: {
         Spending_Invoices: spendingInvoiceInNetwork,
       },
     }
     return res.json(data_temp);
   };

   const getCompanyInvoicesDetails = async (req, res, next) =>
   {
     let customerID = null;
     let data = req.body;
     let data_info = new Object();
     let activePlans = await companyModel.getMany("medi_customer_active_plans", {customer_id: data.customer_id});
     let activePlansInvoices = await companyModel.getMany("medi_active_plan_invoices", {customer_id: data.customer_id});
     let spendingDepositCredits = await companyModel.getMany("medi_customer_spending_deposit_credits", {customer_id: data.customer_id});
     let dependentPlanWithdraws = await companyModel.getOne("medi_dependent_plan_withdraws", {member_id: data.member_id});
     let dependentInvoices = await companyModel.getOne("medi_dependent_invoices", {dependent_invoice_id: data.dependent_invoice_id});

     let data_temp = {
       activePlans: {
         Active_Plans: activePlans,
       },
       activePlansInvoices: {
         Active_Plans_Invoices: activePlansInvoices,
       },
       spendingDepositCredits: {
         Spending_Deposit_Credits: spendingDepositCredits,
       },
       dependentPlanWithdraws: {
         Dependent_Plan_Withdraws: dependentPlanWithdraws,
       },
       dependentInvoices: {
         Dependent_Invoices: dependentInvoices,
       },
     }
     return res.json(data_temp);
   }







module.exports = {
    createCompany,
    addEmployee,
    addTempEmployee,
    finishEnrollEmployeeTier,
    removeEnrollee,
    excelEnrollment,
    updatePlanTierEmployeeEnrollment,
    testAddMemberBalance,
    getTempEnrollees,
    getCompanyInfo,
    getCompanyCurrentPlanDates,
    testEmail,
    getNameUser,
    editCompanyProfile,
    createCompanyGroups,
    getCompanyGroups,
    updatePassword,
    getPlanInvoice,
    getActivePlans,
    getSpendingInvoiceInNetwork,
    getCompanyInvoicesDetails
};

const BaseJoi = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);
const iterate = require('p-iteration');
const _ = require('lodash');

module.exports = {
    createCompany : {
        /** 
         * Tables Before Saving
        */
       activePlanExtensionInvoiceValidation: {
            // active_plan_extensions_id: Joi.required(),
            active_plan_extensions_id: Joi.required(),
            customer_id: Joi.required(),
            employees: Joi.required(),
            invoice_number: Joi.required(),
            plan_start: Joi.required(),
            duration: Joi.required(),
            individual_price: Joi.required(),
            invoice_date: Joi.required(),
            invoice_due: Joi.required(),
            refund: Joi.required(),
            currency_type: Joi.required(),
            currency_value: Joi.required(),
            paid: Joi.required(),
            transaction_trail: Joi.object().keys({
                payment_type: Joi.required(),
                transaction_date: Joi.required(),   
                referrence_no: Joi.required(),
                remarks: Joi.required(),
                paid_amount: Joi.required()
            }),
            created_at: Joi.required(),
            updated_at: Joi.required(),
       },
       activePlanExtension: {
            // active_plan_extensions_id: Joi.required(),
            customer_id: Joi.required(),
            customer_active_plan_id: Joi.required(),
            plan_start: Joi.required().label("Employee Plan Start Extension"),
            invoice_date: Joi.required(),
            invoice_due_date: Joi.required(),
            duration: Joi.required().label("Employee Plan Duration Extension"),
            individual_price: Joi.number().required().label("Employee Plan Price Extension"),
            paid: Joi.required(),
            active: Joi.required(),
            enable: Joi.required(),
            account_type: Joi.required().valid('insurance_bundle', 'stand_alone_plan', 'trial_plan', 'lite_plan').label("Employee Plan Account Extension"),
            secondary_account_type: Joi.optional(),
            created_at: Joi.required(),
            updated_at: Joi.required(),
       },
        activePlanExtensionsValidation: {
            // plan_extension_invoice_id: Joi.required(),
            customer_id: Joi.required(),
            customer_active_plan_id: Joi.required(),
            plan_start: Joi.required(),
            invoice_date: Joi.required(),
            invoice_due_date: Joi.required(),
            duration: Joi.required(),
            individual_price: Joi.required(),
            paid: Joi.required(),
            active: Joi.required(),
            enable: Joi.required(),
            account_type: Joi.required(),
            secondary_account_type: Joi.required(),
            created_at: Joi.required(),
            updated_at: Joi.required()
        },
        customerHRDashboardValidation:{
            // hr_account_id: Joi.required(),//mariaDB
            customer_id: Joi.required(),
            email: Joi.required().label("Business Portal Email Address"),
            password: Joi.required().label("Business Portal Password"),
            type: Joi.required(),
            reset_token: Joi.required(),
            active: Joi.required(),
            created_at: Joi.required(),
            updated_at: Joi.required()
        },
        customerActivePlansValidation: {
            // customer_active_plan_id: Joi.required(),
            customer_id: Joi.required(),
            customer_plan_id: Joi.required(),
            expired: Joi.required(),
            employees: Joi.number().min(3).required().label("Employee HeadCount"),
            plan_start: Joi.required().label("Employee Plan Start"),
            duration: Joi.required().label("Employee Plan Duration"),
            new_head_count: Joi.required(),
            account_type: Joi.required().valid('insurance_bundle', 'stand_alone_plan', 'trial_plan', 'lite_plan').label("Employee Account Type"),
            secondary_account_type: Joi.optional(),
            deleted: Joi.required(),
            deleted_at:Joi.required(),
            plan_extension_enable: Joi.required(),
            created_at: Joi.required(),
            updated_at: Joi.required()
        },
        customerPlanStatusValidation: {
            // customer_plan_status_id: Joi.required(),
            customer_id: Joi.required(),
            customer_plan_id: Joi.required(),
            employee_head_count: Joi.required(),
            employee_enrolled_count: Joi.required(),
            created_at: Joi.required(),
            updated_at: Joi.required()
        },
        activePlanInvoicesValidation: {
            // active_plan_invoice_id: Joi.required(),
            customer_id: Joi.required(),
            customer_active_plan_id: Joi.required(),
            employees: Joi.required(),
            invoice_number: Joi.required(),
            plan_start: Joi.required(),
            duration: Joi.required(),
            individual_price: Joi.number().required().label("Employee Plan Price"),
            invoice_date: Joi.required(),
            invoice_due_date: Joi.required(),
            refund: Joi.required(),
            currency_type: Joi.required(),
            currency_value: Joi.required(),
            isPaid: Joi.required(),
            transaction_trail: Joi.object().keys({
                payment_type: Joi.required(),
                transaction_date: Joi.required(),
                referrence_no: Joi.required(),
                remarks: Joi.required(),
                paid_amount: Joi.required()
            }),
            created_at: Joi.required(),
            updated_at: Joi.required()
        },
        dependentInvoicesValidation: {
            // dependent_invoice_id: Joi.required(),
            dependent_plan_id: Joi.required(),
            invoice_number: Joi.required(),
            invoice_date: Joi.required(),
            invoice_due: Joi.required(),
            total_dependents: Joi.required(),
            individual_price: Joi.number().required().label("Dependent Plan Per Price"),
            plan_start: Joi.required(),
            currency_type: Joi.required(),
            currency_value: Joi.required(),
            isPaid: Joi.required(),
            billing_information: {
                contact_name: Joi.required(),
                contact_number: Joi.required(),
                contact_address: Joi.required(),
                contact_email: Joi.required()
            },
            transaction_trail: {
                payment_type: Joi.required(),
                transaction_date: Joi.required(),
                referrence_no: Joi.required(),
                remarks: Joi.required(),
                paid_amount: Joi.required()
            },
            created_at: Joi.required(),
            updated_at: Joi.required()
        },
        dependentPlansValidation: {
            // dependent_plan_id: Joi.required(),
            customer_plan_id: Joi.required(),
            customer_id: Joi.required(),
            customer_active_plan_id: Joi.required(),
            total_dependents: Joi.required().label("Total Dependents to be enrolled"),
            plan_start: Joi.required().label("Dependent Plan Start"),
            duration: Joi.required().label("Dependent Plan Duration"),
            enable: Joi.required(),
            account_type: Joi.required().valid('insurance_bundle', 'stand_alone_plan', 'trial_plan', 'lite_plan').label("Dependent Account Type"),
            secondary_account_type: Joi.optional(),
            type: Joi.required(),
            tagged_active_plan_invoice: Joi.required(),
            created_at: Joi.required(),
            updated_at: Joi.required()
        },
        dependentPlanStatusValidation: {
            // dependent_plan_status_id: Joi.required(),
            customer_id: Joi.required(),
            customer_plan_id: Joi.required(),
            dependent_head_count: Joi.required(),
            dependent_enrolled_count: Joi.required(),
            created_at: Joi.required(),
            updated_at: Joi.required(),
        },
        customerWalletsValidation: {
            // customer_wallet_id: Joi.required(),
            customer_id: Joi.required(),
            medical_balance: Joi.required(),
            wellness_balance: Joi.required(),
            currency_type: Joi.required(),
            currency_value: Joi.required(),
            created_at: Joi.required(),
            updated_at: Joi.required()
        },
        customerMedicalHistoryValidation: {
            // customer_wallet_history_id: Joi.required(),
            customer_id: Joi.required(),
            customer_wallet_id: Joi.required(),
            credit: Joi.required(),
            running_balance: Joi.required(),
            type: Joi.required(),
            employee_id: Joi.required(),
            customer_active_plan_id: Joi.required(),
            wallet_type: Joi.required(),
            currency_type: Joi.required(),
            currency_value: Joi.required(),
            createdAt: Joi.required(),
            updatedAt: Joi.required()
        },
        customerWellnessHistoryValidation: {
            // customer_wallet_history_id: Joi.required(),
            customer_id: Joi.required(),
            customer_wallet_id: Joi.required(),
            credit: Joi.required(),
            running_balance: Joi.required(),
            type: Joi.required(),
            employee_id: Joi.required(),
            customer_active_plan_id: Joi.required(),
            wallet_type: Joi.required(),
            currency_type: Joi.required(),
            currency_value: Joi.required(),
            createdAt: Joi.required(),
            updatedAt: Joi.required()
        },
        customerSpendingDepositCreditsValidation: {
            // customer_deposit_id: Joi.required(),
            customer_active_plan_id: Joi.required(),
            customer_id: Joi.required(),
            medical_credits: Joi.required(),
            wellness_credits: Joi.required(),
            medical_percent: Joi.required(),
            wellness_percent: Joi.required(),
            invoice_number: Joi.required(),
            invoice_date: Joi.required(),
            invoice_due: Joi.required(),
            paid_amount: Joi.required(),
            paid_date: Joi.required(),
            payment_status: Joi.required(),
            payment_remarks: Joi.required(),
            currency_type: Joi.required(),
            currency_value: Joi.required(),
            created_at: Joi.required(),
            updated_at: Joi.required()
        },
        basicValidation: {
            // company_postal_code: Joi.required().label("Company Postal Code is required."),
            employees: Joi.required().label("Total Number of Eligible Employees is required."),
            plan_start: Joi.required().label("Plan Start Date is required."),
            plan_start: Joi.date().required().format(['YYYY/MM/DD', 'YYYY-MM-DD']).label("Plan start invalid format."),
            contact_first_name: Joi.required().label("Business Contact First Name is required."),
            contact_last_name: Joi.required().label("Business Contact Last Name is required."),
            accessibility: Joi.required().label("Account Accessibility is required."),
            reg_email: Joi.string().email({ minDomainAtoms: 2 }).label("Business Portal Email Address is required."),
            employees: Joi.number().min(3).required().label("Total Number of Eligible Employees should be minimum of 3."),
            company: Joi.required().label("Company Name is required."),
            company_address: Joi.required().label("Company Address is required."),
            job_title: Joi.required().label("Business Contact Job Title is required."),
            phone: Joi.required().label("Business Phone Number is required."),
            billing_address: Joi.required().label("Business Billing Address is required.'"),
            billing_name: Joi.required().label("Business Billing Name is required."),
            duration: Joi.required().label("Plan Duration is required.")
        },
        companyValidation: {
            // employees: Joi.number().integer().min(3).required().label("Total Number of Eligible Employees should be minimum of 3."),
            plan_start: Joi.date().format('YYYY-MM-DD').label("Plan Start Date is required."),
            contact_first_name: Joi.string().required().label("First Name is required."),
            contact_last_name: Joi.string().required().label("Business Contact First Name is required."),
            accessibility: Joi.string().required().label("Account Accessibility is required."),
            reg_email: Joi.string().email({ minDomainAtoms: 2 }).required().label("Business Portal Email Address is required."),
            company: Joi.string().required().label("Company Name is required."),
            company_address: Joi.string().required().label("Company Address is required."),
            job_title: Joi.string().required().label("Business Contact Job Title is required."),
            phone: Joi.string().regex(/^[a-zA-Z0-9+()]{3,30}$/).label("Business Phone Number is required."),
            billing_address: Joi.string().required().label("Business Billing Address is required."),
            billing_name: Joi.string().required().label("Business Billing Name is required."),
            duration: Joi.string().required().label("Plan Duration is required."),
        },
        planValidation: {
            plan_invoice_date: Joi.date().format('YYYY-MM-DD').label("Plan Extenstion Invoice Date is required and must be a Date."),
            account_type_extension: Joi.string().required().label("Plan Extenstion Account Type is required."),
            duration_extension: Joi.string().required().label("Plan Extenstion Duration is required."),
            plan_start_extension: Joi.date().format('YYYY-MM-DD').label("Plan Extension Start must be Date.")
        },
        dependentsValidation: {
            account_type_dependents: Joi.string().required().label("Dependent Account Type is required."),
            dependents_employees: Joi.number().integer().min(3).required().label("Dependent Total Number of Eligible Employees is required."),
            plan_price_dependents: Joi.number().required().label("Dependent Plan Price is required."),
        },
        planExtensionDependentsValidation: {
            account_type_extension_dependents: Joi.string().required().label("Dependent Account Type Plan Extension is required."),
            plan_price_extension_dependents: Joi.number().required().label("Dependent Plan Extension Price is required."),
            duration_extension_dependents:  Joi.string().required().label("Dependent Plan Duration Extension is required.")
        },
        businessInformationValidation: {
            // business_information_id: Joi.number().required(),
            customer_id: Joi.number().required(), //.label("1 Account Type is required."),
            company_name: Joi.string().required(), //.label("2 Account Type is required."),
            company_address: Joi.string().required(), //.label("3 Account Type is required."),
            nature_of_busines: Joi.string().required(), //.label("4 Account Type is required."),
            postal_code: Joi.number().required(), //.label("5 Account Type is required."),
            establish: Joi.number().required(), //.label("6 Account Type is required."),
            contact: Joi.object().keys({
                first_name: Joi.string().required().label("Business Contact First Name"),
                last_name: Joi.required().label("Business Contact Last Name"),
                // address: Joi.required(),
                job_title: Joi.required().label("Business Contact Job Title"),
                email: Joi.required().label("Business Contact Email Address"),
                phone: Joi.required().label("Business Phone Contact"),
                hr_email: Joi.string().email({ minDomainAtoms: 2 }).required().label("Business Portal Email Address"),
                send_email_communication: Joi.required(),
                send_email_billing: Joi.required(),
                created_at: Joi.required(),
                updated_at: Joi.required(),
            }), //.label("7 Account Type is required."),
            created_at: Joi.string().required(), //.label("10 Account Type is required."),
            updated_at: Joi.string().required() //.label("11 Account Type is required.")
        },
        customerBillingContactValidation: {
            // billing_contact_id: Joi.number().required(),
            customer_id: Joi.number().required(),
            billing_name: Joi.string().required().label("Billing Name"),
            billing_address: Joi.string().required().label("Billing Address"),
            billing_postal_code: Joi.number().required().label("Billing Postal Code"),
            billing_first_name: Joi.string().required(),
            billing_last_name: Joi.string().required(),
            billing_email: Joi.string().email({ minDomainAtoms: 2 }).required().label("Business Portal Email Address."),
            billing_phone: Joi.required().label("Billing Phone"),
            bill_send_email_bill_related: Joi.number().required(),
            bill_send_email_comm_related: Joi.number().required(),
            created_at: Joi.string().required(),
            updated_at: Joi.string().required()
        },
        customerPurchaseValidation: {
            // customer_id: Joi.required(),
            cover_type: Joi.required(),
            status: Joi.required(),
            agree_status: Joi.required(),
            peak_status: Joi.required(),
            wallet: Joi.required(),
            qr: Joi.required(),
            currency_type: Joi.required(),
            currency_value: Joi.required(),
            created_at: Joi.required(),
            updated_at: Joi.required()
        },
        customerHrAccountsValidation: {
            // hr_account_id: Joi.required(),
            customer_id: Joi.required(),
            email: Joi.required(),
            password:Joi.required(),
            type: Joi.required(),
            reset_token: Joi.required(),
            active: Joi.required(),
            created_at: Joi.required(),
            updated_at: Joi.required()
        },
        customerPlansValidation: {
            // customer_plan_id: Joi.required(),
            customer_id: Joi.required(),
            plan_start: Joi.required(),
            active:Joi.required(),
            account_type: Joi.required().valid('insurance_bundle', 'stand_alone_plan', 'trial_plan', 'lite_plan').label("Employee Account Type"),
            secondary_account_type: Joi.optional(),
            plan_extension_enable: Joi.required(),
            // active_plans: Joi.required(),
            created_at: Joi.required(),
            updated_at: Joi.required()
        }

    },
    addEmployee: {
        basicValidation: {
            code: Joi.required().label("Phone Code is required."),
            phone: Joi.required().label("Phone Number is required."),
            corporate_id: Joi.required().label("Corporate ID is required."),
            customer_id: Joi.required().label("Customer ID is required."),
            customer_plan_id: Joi.required().label("Customer Plan ID is required."),
            first_name: Joi.required().label("First name is required."),
            last_name: Joi.required().label("Last name is required."),
            nric: Joi.required().label("NRIC/FIN is required."),
            plan_start: Joi.required().label("Plan start date is required."),
            package_group_id: Joi.required().label("Package group is required."),
            postal_code: Joi.required().label("Postal Code is required."),
            dob: Joi.required().label("Date of Birth is required."),
            dob: Joi.date().format('YYYY-MM-DD').options({ convert: false }).required().label("Date of birth is not a valid date."),
            plan_start: Joi.date().format('YYYY-MM-DD').options({ convert: false }).required().label("Plan start is not a valid date.")
        },
        employeeDependentValidation: {
            dob: Joi.date().format('YYYY-MM-DD').options({ convert: false }).required().label("Date of birth is not a valid date."),
            first_name: Joi.string().required(),
            isDone: Joi.required(),
            last_name: Joi.string().required(),
            nric: Joi.string().min(9).required(),
            plan_start: Joi.date().format('YYYY-MM-DD').options({ convert: false }).required().label("Plan start is not a valid date."),
            relationship: Joi.required()
        },
        enrollmentEmployeeValidation: {
           email: Joi.string().email({ minDomainAtoms: 2 }).required(),
           first_name: Joi.required(),
           last_name: Joi.required(),
           dob: Joi.date().required().format('YYYY-MM-DD'),
           postal_code: Joi.required(),
           nric: Joi.string().min(9).required(),
           plan_start: Joi.date().required().format('YYYY-MM-DD')
        }
    },
    updateEmployee: {
        fullname: Joi.string().optional(),
        nric: Joi.string().optional(),
        email: Joi.string().optional(),
        password: Joi.string().optional(),
        address: Joi.string().optional(),
        country: Joi.string().optional(),
        city: Joi.string().optional(),
        postal_code: Joi.string().optional(),
        image: Joi.string().optional(),
        phone_code: Joi.string().optional(),
        phone_no: Joi.string().optional(),
        dob: Joi.string().optional(),
        bmi: Joi.string().optional(),
        weight: Joi.string().optional(),
        height: Joi.string().optional(),
        blood_type: Joi.string().optional(),
        job_title: Joi.string().optional(),
        bank_account_number: Joi.string().optional(),
        bank_code: Joi.string().optional(),
        bank_brh: Joi.string().optional(),
        communication_type: Joi.string().optional(),
        updated_at: Joi.date().optional()
    },
    updateDependent: {
        fullname: Joi.string().optional(),
        nric: Joi.string().optional(),
        dob: Joi.date().max('now').optional(),
        relationship: Joi.string().optional(),
        updated_at: Joi.date().optional()
    },
    validateCapUpdate: {
        member_id: Joi.required(),
        cap_amount: Joi.number().required(),
        admin_id: Joi.optional()
    },
    getAllocation: {
        customer_id: Joi.required().label("Customer ID"),
        start_date: Joi.date().required().label("Start Date"),
        end_date: Joi.date().required().label("End Date"),
        spending_type: Joi.valid('medical', 'wellness').required()
    },
    updateBusinessContact: {
        customer_id: Joi.required().label("Customer ID"),
        admin_id: Joi.optional(),
        first_name: Joi.string().optional(),
        last_name: Joi.string().optional(),
        address: Joi.string().optional(),
        job_title: Joi.string().optional(),
        email: Joi.string().optional(),
        phone: Joi.string().optional(),
        hr_email: Joi.string().optional(),
        billing_recipient: Joi.optional().valid(true, false),
        send_email_billing: Joi.optional().valid(true, false),
        send_email_communication: Joi.optional().valid(true, false),
    },
    updateBillingContact: {
        customer_id: Joi.required().label("Customer ID"),
        admin_id: Joi.optional(),
        billing_name: Joi.string().optional(),
        billing_first_name: Joi.string().optional(),
        billing_last_name: Joi.string().optional(),
        billing_address: Joi.string().optional(),
        billing_postal_code: Joi.string().optional(),
        billing_email: Joi.string().optional(),
        billing_phone: Joi.string().optional(),
        bill_send_email_billing: Joi.optional().valid(true, false),
        bill_send_email_communication: Joi.optional().valid(true, false),
    },
    unsetParams: async (schema, data) =>
    {
        // console.warn(schema);
        // console.warn(data)
    },
    joiValidate: async (body, schema, err) =>
    {
        /** 
         * Get fields to validate
        */
       
        let keys = await Object.keys(schema);
        let data = new Object()

        /**
         * iterate required fields 
         * */

        // _.forEach(keys, async function(value) {
        //     data[value] = await body[value]
        // })
        // console.warn('test')
        // console.warn(body);
        // console.warn(schema)
        let dataReturn = Joi.validate(body, schema)
        // console.warn(dataReturn)
        if(dataReturn.error)
        {
            if(typeof err != 'undefined')
            {
                return dataReturn.error
            }
            return false
        }
        
        return true
    }
}
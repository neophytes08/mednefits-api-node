require('express-async-errors');

const APPPATH = require('app-root-path');
const config = require(`${APPPATH}/config/config`)
require('dotenv').config();
const express = require('express');
const sha256 = require('sha256');
const generator = require('generate-password');
const generatePassword = require('password-generator');
const authModel = require('./auth.model');
const validate = require('./auth.validator');
const ip = require('public-ip');
const global_helper = require(`${APPPATH}/server/helpers/global.helper.js`);
const jwt = require('jsonwebtoken');
const moment = require('moment');
const mongoModel = config.schema;
const mongoose = require('mongoose');
const mailHelper = require(`${APPPATH}/server/helpers/mailer.helper`);

async function login(req, res, next)
{
    // console.warn('controller')
    try {
        let email = req.body.username
        let password = sha256(req.body.password)

        let userDetails = await authModel.getOne("medi_customer_hr_accounts", {email:email, password:password});
       // console.warn(userDetails._id)
        if(userDetails)
        {
            console.log(userDetails);
            let token = await jwt.sign({hr_id: userDetails._id, customer_id: userDetails.customer_id, username: email, role: "hr"}, config.jwtSecret, { expiresIn: '30days' })

            if(token)
            {
                return res.json({
                    status: true,
                    token: token,
                    username: userDetails.username,
                    role: userDetails.type,
                    message: "login successfully"
                })
            }
            else
            {
                return res.status(500).json({
                status: false,
                message: "Unable to log your account. Please try again."
                })
            }
        }
        else
        {
            return res.status(404).json({
                status: false,
                message: "Username and password not match!"
            })
        }

    } catch (error) {
        console.warn(error)
        return res.status(404).json({
            status: false,
            message: "Username and password not match!"
        })
    }
}

async function createHrCompany (req, res, next)
{
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
    let password = generator.generate({length: 10, numbers: true, sha256});

    if(accessibility)
    {
      qrPayment = 1;
      wallet = 1;
    } else {
      qrPayment = 0;
      wallet = 0;
    }
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
        /**
         * Data Insertion Section
         * */

        /**
         * Customer Business Information
         */
         let businessInformation = {
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
            password: password,
            type: 'hr', //default
            reset_token: resetToken,
            active: 1, //default
            created_at: createdAt,
            updated_at: updatedAt
          }


          isValid = await validate.joiValidate(customerHRDashboard, validate.createCompany.customerHRDashboardValidation, true)
          //
          if(typeof isValid != 'boolean')
          {
            return errorFunc(res,{
              status: false,
              message: isValid.details[0].message
            })


          //
          // if(!data.generate_password)
          // {
          //   if(data.password)
          //   {
          //     return res.json({
          //       status: false,
          //       message: "Business Portal Password is required."
          //     });
          //   }

            password = sha256(data.password);
            password_show = data.password;
          } else {
            password = sha256('mednefits');
            password_show = 'mednefits';
          }
          console.log('password', password);
          customerHRDashboard.password = password;

          let emailExists = await authModel.getOne('medi_customer_hr_accounts', {email: data.business_portal_email});

          if(emailExists)
          {
            return res.status(400).json({
              status: false,
              message: "Email Address already taken."
            });
          }


          customerPurchase.customer_id = await global_helper.getId('medi_customer_purchase', 'customer_id');
          let customerPurchaseResult = await authModel.saveOne('medi_customer_purchase', customerPurchase);

          console.log('customerPurchaseResult', customerPurchaseResult);
          customerID = customerPurchaseResult.customer_id;
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
             businessInformation.customer_business_information_id = await global_helper.getId('medi_customer_business_information', 'customer_business_information_id');
            /**
             * Save Customer Business Information
             * */
             let businessInformationResult = await authModel.saveOne(
              'medi_customer_business_information', businessInformation);

             if(typeof businessInformationResult != "object" && Object.keys(businessInformationResult).length <= 0)
             {
              return errorFunc(res,{
                status: false,
                message: "Data not saved."
              })
            }

            // /**
            //  * Customer Billing Contact
            //  */
             customerBillingContact.customer_id = customerID;
             customerBillingContact.customer_billing_contact_id = await global_helper.getId('medi_customer_billing_contact', 'customer_billing_contact_id');
            /**
             * Save Customer Billing Contact
             * */
             let customerBillingContactResult = await authModel.saveOne(
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
             customerHRDashboard.hr_account_id = await global_helper.getId('medi_customer_hr_accounts', 'hr_account_id');
            /**
             * Save Customer HR Dashboard
             * */
             let customerHRDashboardResult = await authModel.saveOne(
              'medi_customer_hr_accounts', customerHRDashboard);

             if(typeof customerHRDashboardResult != "object" && Object.keys(customerHRDashboardResult).length <= 0)
             {
              return errorFunc(res,{
                status: false,
                message: "Data not saved."
              })
            }


            // /**
            //  * Send E-mail
            //  *  */
            //  let domainURL = 'http://medicloud.local';
             let domainURL = 'http://localhost:8080';
            //  let emailData = new Array();
            //
            //  if(req.get('host') == 'https://admin.medicloud.sg')
            //  {
            //   domainURL = 'https://medicloud.sg';
            // }
            // else if(req.get('host') == 'http://stage.medicloud.sg')
            // {
            //   domainURL = 'http://staging.medicloud.sg';
            // }

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

const forgotPassword = async ( req, res, next) => {
  let email = req.body.email;

  if(!email) {
    return res.status(400).json({ status: false, message: 'email is required' });
  }

  let token = generator.generate({length: 20, numbers: false, sha256});
  let data = req.body;
  let hr = await authModel.getOne("medi_customer_hr_accounts", {email: email});

  if(hr)
  {

    var business = await authModel.getOne('medi_customer_business_information', { customer_id: hr.customer_id });
    // return res.json(business);
    var data_sent = {
      email: hr.email,
      emailName: `${business.contact.first_name} ${business.contact.last_name}`,
      company_name: business.company_name,
      token: token,
      subject: 'HR/Benefits Password Reset',
      email_page: '../email_templates/global-reset-password-template',
      context: 'Forgot your company password?',
      link: 'api-hr.medicloud.sg/#/reset-password?token=' + token
    }
    // update
    authModel.updateOne('medi_customer_hr_accounts', { hr_account_id: hr.hr_account_id }, { reset_token: token });
    let result = await mailHelper.sendMail(data_sent);
    console.log('result', result);
    return res.status(200).json({
        status: true,
        message: "Reset Password sent to your Email Address."
    });
    return res.json({status: true, message: 'User found', token: token})
  } else {
    return res.status(400).json({status: false, message: 'No user exist'})
  }
}

const resetPassword = async (req, res, next) => {
  let data = req.body;

  let passwordUpdate = {
    token: data.token,
    password: data.password,
    new_password: data.confirm_password
  }
  isValid = await validate.joiValidate(passwordUpdate, validate.createCompany.forgotPasswordValidation, true)
  //
  if(typeof isValid != 'boolean')
  {
    return res.status(400).json({
      status: false,
      message: isValid.details[0].message
    })
  }

  if(data.password != data.confirm_password) {
    return res.status(400).json({
      status: false,
      message: 'password did not match'
    })
  }

  let token_check = await authModel.getOne('medi_customer_hr_accounts', { reset_token: data.token });
console.log(token_check);
  if(!token_check) {
    return res.status(400).json({
      status: false,
      message: 'invalid token'
    })
  }

  // return res.json(token_check);
  // update
  var password = await sha256(data.password);
  console.log('new password', password)
  let result = await authModel.updateOne('medi_customer_hr_accounts', { hr_account_id: token_check.hr_account_id }, { password: password, reset_token: null });
  console.log('result', result)
  if(result) {
    return res.status(201).json({ status: true, message: 'Password resetted' });
  }

  return res.status(400).json({ status: false, message: 'Failed to reset password' });
}

const saveForm = async (req, res, next) =>
{

  authModel.saveForm('medi_users', validate.unsetParams('medi_users',req.body));

}

async function listHrCompany(req, res, next){
  try {
    let data = req.body;
    const companyId = data.company_id;
    const companyList = await authModel.getList(
              'medi_customer_hr_accounts', {}, req.query);

    return res.status(201).json({
      status: true,
      message: "Success",
      data: companyList
    });
  } catch(error) {
    console.log(error);
    return errorFunc(res,{
      status: false,
      message: error
    })
  }
}

async function deleteHrCompany(req, res, next){
  try {
    let data = req.body;
    const companyId = data.company_id;
    const deleteCompany = await authModel.saveOne(
              'medi_customer_hr_accounts', {_id: companyId});

    return res.status(201).json({
      status: true,
      message: "Success",
      data: deleteCompany
    });
  } catch(error) {
    console.log(error);
    return errorFunc(res,{
      status: false,
      message: error
    })
  }
}


module.exports = {
    login,
    saveForm,
    createHrCompany,
    forgotPassword,
    resetPassword,
    listHrCompany,
    deleteHrCompany
};

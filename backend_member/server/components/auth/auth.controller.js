require('express-async-errors');

const APPPATH = require('app-root-path');
const config = require(`${APPPATH}/config/config`)
const express = require('express');
const sha256 = require('sha256');
const authModel = require('./auth.model');
const validate = require('./auth.validator');
const ip = require('public-ip');
const global_helper = require(`${APPPATH}/server/helpers/global.helper.js`);
const jwt = require('jsonwebtoken');
const moment = require('moment');
const mongoModel = config.schema;

async function login(req, res, next)
{
    // console.warn('controller')
    try {
        let email = req.body.username
        let password = sha256(req.body.password)
        let userDetails = await authModel.getOne("medi_members",
                { $or: [{ email: email, password: password }, { phone_no: email, password: password }, { nric: email, password: password }] }
            );

        console.log('userDetails', userDetails)
        if(userDetails)
        {

            let token = await jwt.sign({_id: userDetails._id, member_id: userDetails.member_id, username: email, role: "member"}, config.jwtSecret, { expiresIn: '30days' })

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




async function saveForm(req, res, next)
{
    authModel.saveForm('medi_users', validate.unsetParams('medi_users',req.body))
}

module.exports = {
    login,
    forgotPassword,
    resetPassword,
    saveForm
};

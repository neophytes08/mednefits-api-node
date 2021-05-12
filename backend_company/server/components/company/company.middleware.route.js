const express = require('express');
const router = express.Router();
const eJwt = require('express-jwt');
const APPPATH = require('app-root-path')
const config = require(`${APPPATH}/config/config`)
const validate = require('./company.validator');
const jwt = require('jsonwebtoken');
const ip = require('public-ip');
// console.warn(config)
require('dotenv');
router.use('/hr/:route',
async (req, res, next) => {
      try {
        // let publicIP = await ip.v4();
        let token = req.headers.authorization || req.query.token;

        req.headers.authorization = req.headers.authorization || req.query.token;
        token = token.includes("Bearer") ? token.split(" ")[1] : token;

        if(token.length > 0 && ( typeof token != 'undefined' && token != 'undefined'))
        {
          let tokenResult = await jwt.verify(token,config.jwtSecret);
          console.log('tokenResult', tokenResult)
          if(typeof tokenResult == "object")
          {
            // if(tokenResult.ip == publicIP){
              req.headers.authorization = token;
              req.body.admin_id = tokenResult.admin_id;
              req.body.customer_id = tokenResult.customer_id;
              req.query.customer_id = tokenResult.customer_id;
              return next();
            // }
          }
        }

        return res.status(401).json({
          status: false,
          message: "Session is expired"
        });

      } catch (error) {
        return res.status(401).json({
          status: false,
          message: "Session is expired"
        });
      }
}
  ,async(req, res, next) => {

    console.warn('valid area')
    let _route = req.params.route || null;
    let isValid = false;
    let method = req.method;
    let validRoutes = [
      "create_company",
      "add_temp_employee",
      "get_temp_enrollees",
      "finish_enroll_employee",
      "remove_enrollee",
      "excel_enrollment",
      "update_employee_enrollment",
      "notification",
      "get_hr_session",
      "check_plan",
      "test_add_balance",
      "company_info",
      "get_total_members",
      "get_company_plan_date",
      "check_balance",
      "get_plan_status",
      "get_dependent_status",
      "task_list",
      "get_current_plan_total_due",
      "get_current_spending_total_due",
      "get_intro_overview",
      "enrollment_progress",
      "company_details",
      "employee_allocate_credits",
      "employee_lists",
      "get_employee_dependents",
      "update_dependent_details",
      "update_employee_details",
      "company_validate_password",
      "update_employee_cap_per_visit",
      "total_credits_allocation",
      "get_company_information",
      "update_company_business_contact",
      "update_company_billing_contact",
      "resend_employee_account",
      "create_dependent_account",
      "get_activity",
      "get_activity_transactions",
      "get_e_claim_activity",
      "upload_out_of_network_receipt",
      "revert_out_of_network_to_pending",
      "test_email",
      // "create_hr_company"
      "get_home_details",
      "edit_company_profile",
      "create_company_groups",
      "get_company_groups",
      "update_company_password",
      "get_plan_invoice",
      "get_customer_active_plans",
      "get_spending_invoice_in_network_transactions",
      "get_full_transactions",
      "get_company_invoices_details"
    ];

    if(validRoutes.indexOf(_route) <= -1)
    {
      return res.status(404).json({
        status: false,
        message: "Page not found."
      })
    }

    next()
  }
);


module.exports = router

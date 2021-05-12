const express = require('express');
const router = express.Router();
const APPPATH = require('app-root-path')
const config = require(`${APPPATH}/config/config`)
const jwt = require('jsonwebtoken');

require('dotenv');
router.use('/employees/:route',
async (req, res, next) => {
      try {
        let token = req.headers.authorization || req.query.token;

        req.headers.authorization = req.headers.authorization || req.query.token;
        token = token.includes("Bearer") ? token.split(" ")[1] : token;

        if(token.length > 0 && ( typeof token != 'undefined' && token != 'undefined'))
        {
          let tokenResult = await jwt.verify(token,config.jwtSecret);
          console.log('tokenResult', tokenResult)
          if(typeof tokenResult == "object")
          {
            req.headers.authorization = token;
            if(tokenResult.admin_id) {
              req.body.admin_id = tokenResult.admin_id;
              req.query.admin_id = tokenResult.admin_id;
            }
            req.body.member_id = tokenResult.member_id;
            req.query.member_id = tokenResult.member_id;
            return next();
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
    let _route = req.params.route || null;
    let isValid = false;
    let method = req.method;
    let validRoutes = [
      "employee_care_package",
      "employee_e_card_details",
      "employee_current_spending",
      "get_activity",
      "update_profile",
      "clinic_category_list",
      "new_allergy",
      "new_medication",
      "new_condition",
      "new_medical_history",
      "search_clinic",
      "member_profile",
      "reset_password",
      "medical_wellness_list",
      // "temp_clinic_types_add",
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

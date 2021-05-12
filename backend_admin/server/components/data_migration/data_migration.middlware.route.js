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
router.use('/migration/:route',
async (req, res, next) => {
      try {
        let publicIP = await ip.v4();
        let token = req.headers.authorization || req.query.token;
  
        req.headers.authorization = req.headers.authorization || req.query.token;
        token = token.includes("Bearer") ? token.split(" ")[1] : token;
        
        if(token.length > 0 && ( typeof token != 'undefined' && token != 'undefined'))
        {
          let tokenResult = await jwt.verify(token,config.jwtSecret);
          
          if(typeof tokenResult == "object")
          { 
            // if(tokenResult.ip == publicIP){
              req.headers.authorization = token;
              req.body.admin_id = tokenResult.admin_id;
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
      "create_hr_migration",
      "create_benefits_dependencies",
      "create_employee_member_data_migration",
      "create_dependent_member_data_migration",
      "create_types_migration"
      "create_clinic_migration"
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
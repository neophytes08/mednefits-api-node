const express = require('express');
const router = express.Router();
const eJwt = require('express-jwt');
const APPPATH = require('app-root-path')
const config = require(`${APPPATH}/config/config`)
const validate = require('./heath_provider.validator');
require('dotenv');

router.use('/clinics/:route',
eJwt({secret: config.jwtSecret,
  getToken: function fromHeaderOrQuerystring (req) {
    
    let token = req.headers.authorization || req.query.token
    req.headers.authorization = req.headers.authorization || req.query.token
    token = token.includes("Bearer") ? token.split(" ")[1] : token

    if(token.length > 0 && ( typeof token != 'undefined' && token != 'undefined'))
    {
      req.headers.authorization = token

      return token
    }
    else
    {
      return null
    }

  }}).unless({ 
    path: ["/clinics/create_heath_provider", 
      "/clinics/create_heath_provider_manage_times", 
      "/clinics/create_heath_provider_peak_times", 
      "/clinics/create_heath_provider_holiday_peak_times", 
      "/clinics/create_heath_provider_professional",
      "/clinics/create_heath_provider_service",
      "/clinics/create_heath_provider_professional_service"
    ] 
  })
  ,async(req, res, next) => {
    
    let _route = req.params.route || null
    let isValid = false
    let method = req.method
    let validRoutes = [
      "create_heath_provider",
      "create_heath_provider_manage_times",
      "create_heath_provider_peak_times",
      "create_heath_provider_holiday_peak_times",
      "create_heath_provider_professional",
      "create_heath_provider_service",
      "create_heath_provider_professional_service"
    ]
    console.warn(validRoutes.indexOf(_route))
    
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
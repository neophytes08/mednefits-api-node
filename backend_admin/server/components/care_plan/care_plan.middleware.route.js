const express = require('express');
const router = express.Router();
const eJwt = require('express-jwt');
const APPPATH = require('app-root-path')
const config = require(`${APPPATH}/config/config`)
require('dotenv');

router.use('/care_plan/:route',
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

  }}).unless({ path: ["/care_plan/create_care_plan_list"] })
  ,async(req, res, next) => {
    
    let _route = req.params.route || null
    let isValid = false
    let method = req.method
    let validRoutes = [
      "create_care_plan_list",
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
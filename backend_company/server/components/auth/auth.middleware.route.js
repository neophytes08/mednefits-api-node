const express = require('express');
const router = express.Router();
const eJwt = require('express-jwt')
const APPPATH = require('app-root-path');
const config = require(`${APPPATH}/config/config`)
const roles = require(`${APPPATH}/server/helpers/users.roles`)
const jwt = require('jsonwebtoken');
const validate = require('./auth.validator');
require('dotenv');
router.use('/auth/:route',

eJwt({secret: config.jwtSecret,
  getToken: function fromHeaderOrQuerystring (req) {

    let token = req.headers.authorization || req.query.token
    req.headers.authorization = req.headers.authorization || req.query.token
    token = token.includes("Bearer") ? token.split(" ")[1] : token

    if(token.length > 0 && ( typeof token != 'undefined' && token != 'undefined'))
    {
      req.headers.authorization = token
      req.body.admin_id = tokenResult.admin_id;
      req.body.customer_id = tokenResult.customer_id;
      req.query.customer_id = tokenResult.customer_id;
      return next();
    }
    else
    {
      return null
    }

  }}).unless({ path: ["/auth/signin", "/auth/create_hr_company", "/auth/forgot_password", "/auth/reset_password"] })
  ,async (req, res, next) => {
    let userRole = (typeof req.headers.role == 'undefined' ? null : req.headers.role)
    let _route = req.params.route || null

    let isValid = false
    let method = req.method
    if(_route == null)
    {
      isValid = await validate.joiValidate(req.body, validate.basicAuth)

      if(!isValid)
      {
        res.status(302).json({
          status: false,
          message: 'Username and password not match.'
        })
      }

    }
    else
    {

      let validRoutes = [
        "signin",
        "create_hr_company",
        "forgot_password",
        "reset_password"
      ]

      if(validRoutes.indexOf(_route) > -1)
      {
        if(_route == "signin")
        {
          isValid = await validate.joiValidate(req.body, validate.basicAuth)

          if(!isValid)
          {
            return res.json({
              status: false,
              message: "Username and password not match!"
            })
          }
        }

      }
      else
      {
        return res.status(404).json({
          status: false,
          message: "page not found."
        })
      }
    }
    next()
  }
);


module.exports = router

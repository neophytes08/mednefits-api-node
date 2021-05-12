const express = require('express');
const router = express.Router();
const jwt = require('express-jwt')
const config = require('../../config/config')
const validate = require('./activity.validator');
const toks = require('jsonwebtoken')

router.use('/activity/:route',

// jwt({secret: config.jwtSecret
  // ,
  // getToken: function fromHeaderOrQuerystring (req) {
  //   // toks.sign({user: 'user'}, process.env.JWTSECRET, { expiresIn: '2h' },(jwt_err, token) => {
  //   //   console.warn(token)
  //   // })
  //   console.warn('FROM ACTIVITY')
  //   let token = req.headers.authorization || req.query.token
    
  //   if(token.includes("Bearer"))
  //   {
  //     return token.split(" ")[1]
  //   }
  //   else
  //   {
  //     return token
  //   }

  // }}).unless({ path: ["/login/login"] })
  // ,
  async(req, res, next) => {
    
    let _route = req.params.route || null
    let valid = false

    if(_route == null)
    {
      console.warn('no route')
    }
    else
    {

      let validRoutes = [
        "login",
        "signin"
      ]
      
      if(validRoutes.indexOf(_route) > 0)
      {
        valid = await validate.joiValidate(req.body, validate.basicAuth)

        if(!valid)
        {
          res.status(404).json({
              status: false,
              message: 'Username and password not match'
          })
        }
      }
      else
      {
        res.status(404).json({
          status: false,
          message: "page not found."
        })
      }
    }
    
    next()
  }
);


module.exports = router
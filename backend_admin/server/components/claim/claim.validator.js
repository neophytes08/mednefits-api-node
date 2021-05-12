const Joi = require('joi');
const iterate = require('p-iteration');
const _ = require('lodash');

module.exports = {
    loginUser: {
        body: {
            userName: Joi.string().email({ minDomainAtoms: 2 }),
            password: Joi.string().min(6).required()
        }
    },
    basicAuth: {
        userName: Joi.string().email({ minDomainAtoms: 2 }),
        password: Joi.string().min(6).required()
    },
    joiValidate: async function(body, schema)
    {
        /** 
         * Get fields to validate
        */

        let keys = await Object.keys(schema);
        let data = new Object()

        /**
         * iterate required fields 
         * */

        _.forEach(keys, await function(value) {
            data[value] = body[value]
        })

        let dataReturn = Joi.validate(data, schema)
        
        if(dataReturn.error)
        {
            return false
        }
        
        return true
    }
}
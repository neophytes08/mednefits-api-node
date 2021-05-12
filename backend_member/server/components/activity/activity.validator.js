const Joi = require('joi');
const iterate = require('p-iteration');
const _ = require('lodash');

module.exports = {
    activityQuery: {
        start: Joi.date().required().label('Start Date.'),
        end: Joi.date().required().label('End Date.'),
        spending_type: Joi.required().valid('medical', 'wellness').label("Spending Wallet Type"),
    },
    activityType: {
        type: Joi.required().valid('in_network', 'out_of_network').label("Type"),
    },
    unsetParams: async (schema, data) =>
    {
        // console.warn(schema);
        // console.warn(data)
    },
    joiValidate: async (body, schema, err) =>
    {
        /** 
         * Get fields to validate
        */
       
        let keys = await Object.keys(schema);
        let data = new Object()

        /**
         * iterate required fields 
         * */

        // _.forEach(keys, async function(value) {
        //     data[value] = await body[value]
        // })
        // console.warn('test')
        // console.warn(body);
        // console.warn(schema)
        let dataReturn = Joi.validate(body, schema)
        // console.warn(dataReturn)
        if(dataReturn.error)
        {
            if(typeof err != 'undefined')
            {
                return dataReturn.error
            }
            return false
        }
        
        return true
    }
}
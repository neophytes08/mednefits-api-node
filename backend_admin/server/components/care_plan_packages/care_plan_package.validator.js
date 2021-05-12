const BaseJoi = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);
const iterate = require('p-iteration');
const _ = require('lodash');

module.exports = {
	createCarePlanPackage: 
	{
		package: {
            account_type: Joi.required().valid('stand_alone_plan', 'insurance_bundle', 'trial_plan', 'lite_plan'),
            name: Joi.required(),
            secondary_account_type: Joi.required(),
            wallet: Joi.required().valid(1, 0),
            default_selection: Joi.required().valid(0, 1),
            created_at: Joi.required(),
            updated_at: Joi.required(),
            deleted: Joi.optional(),
            deleted_at: Joi.optional()
		}
	},
	joiValidate: async function(body, schema, err)
    {
        /** 
         * Get fields to validate
        */
       
        let keys = await Object.keys(schema);``
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
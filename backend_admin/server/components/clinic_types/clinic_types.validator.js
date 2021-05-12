const BaseJoi = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);
const iterate = require('p-iteration');
const _ = require('lodash');

module.exports = {
	createClinicTypes: 
	{
		clinicTypes: {
			provider_type_id: Joi.required(),
            name: Joi.required(),
			image_url: Joi.optional(),
			spending_type: Joi.required().valid('medical', 'wellness').label('Spending Account Type'),
            co_paid_enabled_status: Joi.optional().valid(1, 0),
            co_paid_status: Joi.optional().valid(1, 0),
            co_paid_amount: Joi.optional(),
            lite_plan_enabled: Joi.optional().valid(1, 0),
            discount_enabled_status: Joi.optional().valid(1, 0),
            discount_type: Joi.optional().valid('fixed', 'percent').label('Discount Type'),
            discount_value: Joi.optional(),
            created_at: Joi.optional(),
            updated_at: Joi.optional(),
            deleted: Joi.optional(),
            deleted_at: Joi.optional(),
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
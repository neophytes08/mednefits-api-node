const BaseJoi = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);
const iterate = require('p-iteration');
const _ = require('lodash');

module.exports = {
	createCarePlanLists: 
	{
		care: {
            package_name: Joi.required(),
            package_description: Joi.optional(),
            image: Joi.optional(),
            package_discount: Joi.optional(),
            position: Joi.optional(),
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
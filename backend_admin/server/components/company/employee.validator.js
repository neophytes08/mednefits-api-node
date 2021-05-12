const BaseJoi = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);
const iterate = require('p-iteration');
const _ = require('lodash');

module.exports = {
    
    requiredDependentsField: {
        first_name: Joi.string().required().label("Dependent First Name is required."),
        last_name: Joi.string().required().label("Dependent Last Name is required."),
        dob: Joi.date().format('YYYY-MM-DD').options({ convert: false }).required().label('Dependent Date of Birth is required.'),
        relationship: Joi.string().required().label("Dependent Relationship is required."),
       
    },
    replaceEmployee: {
        replace_id: Joi.string().required().label('Employee ID is required.'),
        first_name: Joi.string().required().label('First Name is required.'),
        last_name: Joi.string().required().label('Last Name is required.'),
        nric: Joi.string().required().label('NRIC/FIN is required.'),
        email: Joi.string().email({ minDomainAtoms: 2 }).required().label('Work Email is required.'),
        dob: Joi.string().required().label('Date of Birth is required.'),
        mobile: Joi.string().required().label('Mobile No. is required.'),
        postal_code: Joi.string().required().label('Postal Code is required.'),
        last_day_coverage: Joi.string().required().label('Last Day of Coverage of Employee is required.'),
        plan_start: Joi.string().required().label('Plan Start of new Employee is required.')
    },
    allocationValidation: {
        customer_id: Joi.required(),
        member_id: Joi.required(),
        spending_type: Joi.required().valid('medical', 'wellness'),
        allocation_type: Joi.required().valid('add', 'deduct'),
        credits: Joi.number().required()
    },
    transferEmployee: {
        old_customer_id: Joi.required(),
        new_customer_id: Joi.required(),
        member_id: Joi.required(),
        start_date: Joi.date().format('YYYY-MM-DD').options({ convert: false }).required(),
    },
    employeeFunc: {
        employee_id: Joi.required()
    },
    joiValidate: async (body, schema, err) =>
    {
        /** 
         * Get fields to validate
        */
       
        let keys = await Object.keys(schema);
        let data = new Object()
        
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
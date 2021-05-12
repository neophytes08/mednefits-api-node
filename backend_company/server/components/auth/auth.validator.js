const Joi = require('joi');
const _ = require('lodash');
const fs = require('fs');

const joiValidate = async (body, schema) => {
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
    console.warn(dataReturn.error)
    if(dataReturn.error)
    {
        return false
    }

    return true
}

/**
 * Remove unnecessary fields for the table
*/
const unsetParams = (model, data) => {
    // let dataObject = new Object();

    // if(typeof tableFields[model] != "undefined")
    // {
    //     let modelFields = tableFields[model]
    //     _.forOwn(modelFields, function(value, key) {
    //         dataObject[key] = data[value] || null
    //     } );
    // }

    // return dataObject
}

module.exports = {
    loginUser: {
        body: {
            username: Joi.string().email({ minDomainAtoms: 2 }),
            password: Joi.string().min(6).required()
        }
    },

    createCompany: {

    businessInformationValidation: {
        // business_information_id: Joi.number().required(),
        customer_id: Joi.number().required(), //.label("1 Account Type is required."),
        company_name: Joi.string().required(), //.label("2 Account Type is required."),
        company_size: Joi.string().required(),
        company_country_city: Joi.string().required(),
        company_address: Joi.string().required(), //.label("3 Account Type is required."),
        nature_of_busines: Joi.string().required(), //.label("4 Account Type is required."),
        postal_code: Joi.number().required(), //.label("5 Account Type is required."),
        establish: Joi.number().required(), //.label("6 Account Type is required."),
        contact: Joi.object().keys({
            full_name: Joi.string().required().label("Business Contact Fullname"),
            // address: Joi.required(),
            // job_title: Joi.required().label("Business Contact Job Title"),
            email: Joi.required().label("Business Contact Email Address"),
            phone: Joi.required().label("Business Phone Contact"),
            hr_email: Joi.string().email({ minDomainAtoms: 2 }).required().label("Business Portal Email Address"),
            send_email_communication: Joi.required(),
            send_email_billing: Joi.required(),
            created_at: Joi.required(),
            updated_at: Joi.required(),
        }), //.label("7 Account Type is required."),
        created_at: Joi.string().required(), //.label("10 Account Type is required."),
        updated_at: Joi.string().required() //.label("11 Account Type is required.")
    },
    customerHRDashboardValidation:{
        // hr_account_id: Joi.required(),//mariaDB
        customer_id: Joi.required(),
        email: Joi.required().label("Business Portal Email Address"),
        password: Joi.optional().label("Password"),
        type: Joi.required(),
        reset_token: Joi.required(),
        active: Joi.required(),
        created_at: Joi.required(),
        updated_at: Joi.required()
    },
    forgotPasswordValidation:{
      token: Joi.required(),
      password: Joi.required(),
      new_password: Joi.required()
    },

    customerBillingContactValidation: {
        // billing_contact_id: Joi.number().required(),
        customer_id: Joi.number().required(),
        billing_name: Joi.string().required().label("Billing Name"),
        billing_address: Joi.string().required().label("Billing Address"),
        billing_first_name: Joi.string().required(),
        billing_last_name: Joi.string().required(),
        created_at: Joi.string().required(),
        updated_at: Joi.string().required()
    },
},
    basicAuth: {
        username: Joi.string().required(),
        password: Joi.string().min(3).required()
    },
    joiValidate,
    unsetParams
}

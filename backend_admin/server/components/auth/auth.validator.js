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
    basicAuth: {
        username: Joi.string().required(),//.email({ minDomainAtoms: 2 }),
        password: Joi.string().min(3).required()
    },
    joiValidate,
    unsetParams
}
const Joi = require('joi');
const iterate = require('p-iteration');
const _ = require('lodash');

module.exports = {
  updateEmployee: {
    fullname:
    Joi.string().
    optional().
    label('First Name'),
    phone_no:
    Joi.string().
    optional().
    label('Mobile No.'),
    nric:
    Joi.string().
    optional().
    label('NRIC'),
    dob:
    Joi.string().
    optional().
    label('Date of Birth'),
    weight:
     Joi.string().
     optional().
     label('Weight type'),
     address:
     Joi.string().
     optional().
     label('Address'),
    height:
      Joi.string().
      optional().
      label('Height type'),
    blood_type:
     Joi.string().
     optional().
     label('Blood type type'),

  },
  changePass: {
      password: Joi.string().required()
  },

  createAllergy: {
    member_id:
    Joi.number().
    optional(),
    allergy_name:
    Joi.string().
    optional(),
    created_at:
    Joi.date().
    optional(),
    updated_at:
    Joi.date().
    optional(),
  },
  // createClinicTypes: {
  //   health_type_id:
  //   Joi.number().
  //   optional(),
  //   type_name:
  //   Joi.string().
  //   optional(),
  //   type:
  //   Joi.string().
  //   optional(),
  //   created_at:
  //   Joi.date().
  //   optional(),
  //   updated_at:
  //   Joi.date().
  //   optional(),
  // },

  createMedication: {
    member_id:
    Joi.number().
    optional(),
    medication_name:
    Joi.string().
    optional(),
    medication_dosage:
    Joi.string().
    optional(),
    created_at:
    Joi.date().
    optional(),
    updated_at:
    Joi.date().
    optional(),
  },
  createCondition: {
    member_id:
    Joi.number().
    optional(),
    condition_name:
    Joi.string().
    optional(),
    date:
    Joi.date().
    optional(),
    active:
    Joi.number().
    optional(),
    created_at:
    Joi.date().
    optional(),
    updated_at:
    Joi.date().
    optional(),
  },
  createMedicalHistory: {
    member_id:
    Joi.number().
    optional(),
    visit_type:
    Joi.string().
    optional(),
    date:
    Joi.date().
    optional(),
    doctor_name:
    Joi.string().
    optional(),
    note:
    Joi.string().
    optional(),
    clinic_name:
    Joi.string().
    optional(),
    created_at:
    Joi.date().
    optional(),
    updated_at:
    Joi.date().
    optional(),
  },
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

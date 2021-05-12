const BaseJoi = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);
const iterate = require('p-iteration');
const _ = require('lodash');

module.exports = {
    healthProvider: 
    {
        health: {
            provider_id: Joi.required(),
            provider_type_ids: Joi.required(),
            email_address: Joi.required(),
            password: Joi.string().min(6).max(20),
            communication_email: Joi.required(),
            name: Joi.required(),
            description: Joi.optional(),
            custom_title: Joi.optional(),
            website_link: Joi.optional(),
            provider_image: Joi.required(),
            address: Joi.required(),
            city: Joi.required(),
            state: Joi.optional(),
            country: Joi.required(),
            postal_code: Joi.required(),
            district: Joi.optional(),
            latittude: Joi.required(),
            longitude: Joi.required(),
            phone_code: Joi.required(),
            phone_no: Joi.required(),
            mrt: Joi.optional(),
            opening_schedule: Joi.optional(),
            calendar_type: Joi.required(),
            calender_day: Joi.required(),
            calendar_duration: Joi.required(),
            calender_start_hour: Joi.required(),
            require_pin: Joi.optional(),
            active: Joi.optional(),
            billing_name: Joi.optional(),
            billing_address: Joi.optional(),
            billing_status: Joi.optional(),
            currency_type: Joi.required(),
            discount_status: Joi.optional().valid(1, 0),
            discount_type: Joi.optional().valid('fixed', 'percent').label('Discount Type'),
            discount_value: Joi.optional(),
            mednefits_discount_status: Joi.optional().valid(1, 0),
            mednefits_discount_type: Joi.optional().valid('fixed', 'percent').label('Mednefits Discount Type'),
            mednefits_discount_value: Joi.optional(),
            peak_hour_status: Joi.optional().valid(1, 0),
            peak_hour_amount: Joi.optional(),
            co_paid_enabled: Joi.optional().valid(1, 0),
            co_paid_status: Joi.optional().valid(1, 0),
            co_paid_amount: Joi.optional(),
            consultation_gst_status: Joi.optional().valid(1, 0),
            consultation_fees: Joi.optional(),
            gst_value: Joi.optional(),
            test_account: Joi.optional(),
            configure: Joi.optional(),
            created_at: Joi.optional(),
            updated_at: Joi.optional(),
            deleted: Joi.optional(),
            deleted_at: Joi.optional()
        },
        existence: {
            provider_id: Joi.required()
        },
        professional: {
            professional_id: Joi.required(),
            provider_id: Joi.required(),
            name: Joi.required(),
            email_address: Joi.required(),
            type: Joi.required().valid("doctor", "staff"),
            description: Joi.optional(),
            qualifications: Joi.optional(),
            specialty: Joi.optional(),
            gender: Joi.optional().valid("male", "female"),
            dob: Joi.optional(),
            image: Joi.optional(),
            phone_no: Joi.optional(),
            phone_code: Joi.optional(),
            gmail_address: Joi.optional(),
            cc_emails: Joi.optional(),
            check_pin: Joi.optional(),
            check_sync: Joi.optional(),
            pin: Joi.optional(),
            professional_availabity: Joi.optional(),
            start_availability_time: Joi.optional(),
            end_availability_time: Joi.optional(),
            active: Joi.optional(),
            created_at: Joi.optional(),
            updated_at: Joi.optional(),
            deleted: Joi.optional(),
            deleted_at: Joi.optional()
        },
        service: {
            provider_service_id: Joi.required(),
            provider_id: Joi.required(),
            service_name: Joi.required(),
            description: Joi.optional(),
            duration: Joi.required(),
            duration_type: Joi.required().valid("minutes", "duration"),
            price: Joi.required(),
            currency_type: Joi.optional(),
            consultation: Joi.optional(),
            co_paid_status: Joi.optional(),
            co_paid_amount: Joi.optional(),
            active: Joi.optional(),
            position: Joi.optional(),
            scan_pay_show: Joi.optional(),
            deleted: Joi.optional(),
            deleted_at: Joi.optional(),
            created_at: Joi.optional(),
            updated_at: Joi.optional()
        },
        prof_service: {
            professional_service_id: Joi.required(),
            professional_id: Joi.required(),
            provider_id: Joi.required(),
            provider_service_id: Joi.required(),
            active: Joi.optional(),
            deleted: Joi.optional(),
            deleted_at: Joi.optional(),
            created_at: Joi.optional(),
            updated_at: Joi.optional()
        }
    },
    joiValidate: async function(body, schema, err)
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
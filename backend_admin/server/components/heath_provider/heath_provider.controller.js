require('express-async-errors');

const config = require('./../../../config/config')
const healthProviderModel = require('./heath_provider.model');
const validate = require('./heath_provider.validator');
const holidayPeaks = require('./../../helpers/healthProvider.helper');
const moment = require('moment');
const sha256 = require('sha256');
// const strtotime = require('locutus/php/datetime/strtotime');
require('dotenv').config();

async function errorFunc(res, params){
    healthProviderModel.transactionRollback()
    return res.status(400).json(params)
}

async function aggregation(model, fieldName, objectContainer, res)
{
    // console.warn("test")
    try {
        fieldName = (typeof fieldName != 'undefined' ? fieldName : "provider_type_id" )

        let getReturnID = await clinicTypesModel.aggregation(
            model,
            [
                {
                $group:
                    {
                        _id : {_id : "$_id"},
                        maxInfoID: { $max:  `$${fieldName}`},
                    }
                },
                {
                    $sort:{
                        maxInfoID: -1
                    }
                },
                {
                    $limit:1
                }
            ]
        );

        if(!isNaN(getReturnID[0].maxInfoID))
        {
            objectContainer[fieldName] = getReturnID[0].maxInfoID + 1
            return objectContainer;
        }
        else
        {
            clinicTypesModel.transactionRollback()
            return res.status(500).json({
                status: false,
                message: "Database error."
            });
        }
    } catch (error) {
        console.warn(error)
        clinicTypesModel.transactionRollback()
        // console.warn
        return res.status(500).json({
            status: false,
            message: "Server error."
        });
    }

}


async function createHealthProvider(req, res, next) {
	try {
        let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
        let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");
        let temp_id = await healthProviderModel.countCollection('medi_health_providers');

        console.log(req.body);

        // if(!req.body.provider_type_ids || req.body.provider_type_ids.length == 0) {
        //     return res.status(400).json({
        //         status: false,
        //         message: "Health Provider Type id is required."
        //     });
        // }

		let basicValidation = {
			provider_id: temp_id + 1,
            provider_type_ids: req.body.provider_type_ids,
			email_address: req.body.email_address,
			password: req.body.password,
			communication_email: req.body.communication_email,
			name: req.body.name,
			description: req.body.description ? req.body.description : null,
			custom_title: req.body.custom_title ? req.body.custom_title : null,
			website_link: req.body.website_link ? req.body.website_link : null,
            provider_image: req.body.provider_image ? req.body.provider_image : null,
            address: req.body.address,
            city: req.body.city,
            state: req.body.state ? req.body.state : null,
            country: req.body.country,
            postal_code: req.body.postal_code,
            district: req.body.district ? req.body.district : null,
            latittude: req.body.latittude,
            longitude: req.body.longitude,
            phone_code: req.body.phone_code ? req.body.phone_code : '+65',
            phone_no: req.body.phone_no,
            mrt: req.body.mrt ? req.body.mrt : null,
            opening_schedule: req.body.opening_schedule ? req.body.opening_schedule : null,
            calendar_type: req.body.calendar_type ? req.body.calendar_type : 1,
            calender_day: req.body.calender_day ? req.body.calender_day : 1,
            calendar_duration: req.body.calendar_duration ? req.body.calendar_duration : 15,
            calender_start_hour: req.body.calender_start_hour ? req.body.calender_start_hour : '12:00 AM',
            require_pin: 0,
            active: 1,
            billing_name: req.body.billing_name ? req.body.billing_name : null,
            billing_address: req.body.billing_address ? req.body.billing_address : null,
            billing_status: req.body.billing_status == true ? 1 : 0,
            currency_type: req.body.currency_type,
            discount_status: req.body.discount_status == true ? 1 : 0,
            discount_type: req.body.discount_type ? req.body.discount_type : 'fixed',
            discount_value: req.body.discount_value ? req.body.discount_value : 0,
            mednefits_discount_status: req.body.mednefits_discount_status == true ? 1 : 0,
            mednefits_discount_type: req.body.mednefits_discount_type ? req.body.mednefits_discount_type : 'fixed',
            mednefits_discount_value: req.body.mednefits_discount_value ? req.body.mednefits_discount_value : 0,
            peak_hour_status: 0,
            peak_hour_amount: 0,
            co_paid_enabled: req.body.co_paid_enabled == true ? 1 : 0,
            co_paid_status: req.body.co_paid_status == true ? 1 : 0,
            co_paid_amount: req.body.co_paid_amount ? req.body.co_paid_amount : 0,
            consultation_gst_status: req.body.consultation_gst_status == true ? 1 : 0,
            consultation_fees: req.body.consultation_fees ? req.body.consultation_fees : 0,
            gst_value: 0.007,
            test_account: 0,
            configure: 0,
            created_at: createdAt,
            updated_at: updatedAt,
            deleted: 0,
            deleted_at: null
		}
		console.log(basicValidation);

		isValid = await validate.joiValidate(basicValidation, validate.healthProvider.health, true)
    
        if(typeof isValid != 'boolean')
        {
            errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }

        /* check if provider type ids exist */
        for(var i = 0; i < basicValidation.provider_type_ids.length; i++) {
            let exists = await healthProviderModel.getOne('medi_health_provider_types', {provider_type_id: basicValidation.provider_type_ids[i]});

            if(!exists)
            {
                return res.status(400).json({
                    status: false,
                    message: "Health Provider Type does not exist."
                });
            }
        }

        // check if email address is taken
        let emailExists = await healthProviderModel.getOne('medi_health_providers', {email_address: basicValidation.email_address});

        if(emailExists)
        {
            return res.status(400).json({
                status: false,
                message: "Email Address already taken."
            });
        }
         /**
         * Save Clinic Details
         * */
        basicValidation.password = sha256(basicValidation.password);
        let clinicResult = await healthProviderModel.saveOne('medi_health_providers', basicValidation);
        
        if(typeof clinicResult != "object" && Object.keys(clinicResult).length <= 0)
        {
            errorFunc(res,{
                status: false,
                message: "Data not saved."
            })
        }

        /* create healh provider time lists */
        await createHealthProviderManageTimes(basicValidation.provider_id, 'health_provider');
        /* create healt provider peak time lists */
        await createHealthProviderPeakTimes(basicValidation.provider_id);
        /* creat health provider peak time holiday lists */
        await createHealthProviderHolidayPeaks(basicValidation.provider_id);
        return res.status(201).json({
            status: true,
            message: "Saved.",
            data: clinicResult
        });
	} catch (error) {
		console.log(error);
		errorFunc(res,{
            status: false,
            message: error
        })
	}
}

async function createManageTime(req, res, next) {
    try {
        console.log(req.body.provider_id)
        isValid = await validate.joiValidate(req.body, validate.healthProvider.existence, true)
    
        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }

        /* check if clinic exist */
        let provider = await healthProviderModel.getOne('medi_health_providers', {provider_id: req.body.provider_id});
        // console.log('provider', provider)
        if(!provider)
        {
            return res.status(404).json({
                status: false,
                message: "Health Provider Does not exist."
            });
        }

        let create_times = await createHealthProviderManageTimes(provider.provider_id);
        
        if(create_times.status) {
            return res.status(200).json({
                status: true,
                message: "Success.",
                data: create_times.data
            });
        } else {
            return res.status(404).json({
                status: false,
                message: "Failed."
            });
        }
    } catch(error) {
        console.log(error);
        errorFunc(res,{
            status: false,
            message: error
        })
    }
}

async function createHealthProviderManageTimes(id, type) {
    try {
        /* check if provider has a time lists */
        let times = await healthProviderModel.getOne('medi_manage_times', {id: id, 'type': type});
        let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
        let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");

        if(!times) {
            // create times
            var temp_id = await healthProviderModel.countCollection('medi_manage_times') + 1;
            let time = {
                id: id,
                type: type,
                start_time: '08:00 AM',
                end_time: '05:30 PM',
                mon: 0,
                tue: 0,
                wed: 0,
                thu: 0,
                fri: 0,
                sat: 0,
                sun: 0,
                created_at: createdAt,
                updated_at: updatedAt
            }

            time.manage_time_id = temp_id;
            time.mon = 1;
            // create monday
            await healthProviderModel.saveOne('medi_manage_times', time);

            var temp_id = await healthProviderModel.countCollection('medi_manage_times') + 1;
            time.manage_time_id = temp_id;
            time.mon = 0;
            time.tue = 1;
            delete time._id
            // create tue
            await healthProviderModel.saveOne('medi_manage_times', time);
            var temp_id = await healthProviderModel.countCollection('medi_manage_times') + 1;
            time.manage_time_id = temp_id;
            time.mon = 0;
            time.tue = 0;
            time.wed = 1
            delete time._id
            // create wed
            await healthProviderModel.saveOne('medi_manage_times', time);

            console.log('time 3', time);
            var temp_id = await healthProviderModel.countCollection('medi_manage_times') + 1;
            time.manage_time_id = temp_id;
            time.mon = 0;
            time.tue = 0;
            time.wed = 0;
            time.thu = 1;
            delete time._id
            // create thu
            await healthProviderModel.saveOne('medi_manage_times', time);

            console.log('time 4', time);
            var temp_id = await healthProviderModel.countCollection('medi_manage_times') + 1;
            time.manage_time_id = temp_id;
            time.mon = 0;
            time.tue = 0;
            time.wed = 0;
            time.thu = 0;
            time.fri = 1;
            delete time._id
            // create fri
            await healthProviderModel.saveOne('medi_manage_times', time);

            console.log('time 5', time);
            var temp_id = await healthProviderModel.countCollection('medi_manage_times') + 1;
            time.manage_time_id = temp_id;
            time.mon = 0;
            time.tue = 0;
            time.wed = 0;
            time.thu = 0;
            time.fri = 0;
            time.sat = 1;
            delete time._id
            // create sat
            await healthProviderModel.saveOne('medi_manage_times', time);

            console.log('time 6', time);
            var temp_id = await healthProviderModel.countCollection('medi_manage_times') + 1;
            time.manage_time_id = temp_id;
            time.mon = 0;
            time.tue = 0;
            time.wed = 0;
            time.thu = 0;
            time.fri = 0;
            time.sat = 0;
            time.sun = 1;
            delete time._id
            // create sun
            await healthProviderModel.saveOne('medi_manage_times', time);
            console.log('time 7', time);
        } else {
            console.log('it has');
        }

        return { status: true, data: id }
        
    } catch( error ){
        console.log(error);
        return { status: false, message: error }
    }
}

async function createHealthProviderPeaks(req, res, next) {
    try {
        isValid = await validate.joiValidate(req.body, validate.healthProvider.existence, true)
    
        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }

        /* check if clinic exist */
        let provider = await healthProviderModel.getOne('medi_health_providers', {provider_id: req.body.provider_id});
        // console.log('provider', provider)
        if(!provider)
        {
            return res.status(404).json({
                status: false,
                message: "Health Provider Does not exist."
            });
        }

        let result = await createHealthProviderPeakTimes(provider.provider_id);
        
        if(result.status) {
            return res.status(200).json({
                status: true,
                message: "Success.",
                data: result.data
            });
        } else {
            return res.status(404).json({
                status: false,
                message: "Failed."
            });
        }
    } catch(error) {
        console.log(error);
        errorFunc(res,{
            status: false,
            message: error
        })
    }
}

async function createHealthProviderPeakTimes(provider_id) {
    try {
        /* check if provider has a peak time lists */
        let peaks = await healthProviderModel.getOne('medi_provider_peaks', {provider_id: provider_id});
        let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
        let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");

        let start = "6:00 AM";
        let end = "6:00 PM";
        console.log(peaks)
        if(!peaks) {
            var days = await ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
            console.log(days.length);
            for (var x = 0; x < days.length; x++) {
                var temp_id = await healthProviderModel.countCollection('medi_provider_peaks') + 1;
                var peak = {
                    provider_peak_id: temp_id,
                    provider_id: provider_id,
                    type: "full",
                    day: days[x],
                    amount: 0,
                    start: start,
                    end: end,
                    active: 0,
                    created_at: createdAt,
                    updated_at: updatedAt
                }
                
                await healthProviderModel.saveOne('medi_provider_peaks', peak);
                console.log(peak);
                delete peak._id;
            }
        } else  {
            console.log('it has');
        }
        return { status: true, data: provider_id }
    } catch(error) {
        console.log(error);
        return { status: false, message: error }
    }
}

async function createHealthHolidayPeaks(req, res, next) {
    try {
        isValid = await validate.joiValidate(req.body, validate.healthProvider.existence, true)
    
        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }

        /* check if clinic exist */
        let provider = await healthProviderModel.getOne('medi_health_providers', {provider_id: req.body.provider_id});
        // console.log('provider', provider)
        if(!provider)
        {
            return res.status(404).json({
                status: false,
                message: "Health Provider Does not exist."
            });
        }

        let result = await createHealthProviderHolidayPeaks(provider.provider_id);
        
        if(result.status) {
            return res.status(200).json({
                status: true,
                message: "Success.",
                data: result.data
            });
        } else {
            return res.status(404).json({
                status: false,
                message: "Failed."
            });
        }
    } catch(error) {
        console.log(error);
        errorFunc(res,{
            status: false,
            message: error
        })
    }
}

async function createHealthProviderHolidayPeaks(provider_id) {
    try {
        /* check if provider has a peak time lists */
        let holidays = await healthProviderModel.getOne('medi_provider_peak_holidays', {provider_id: provider_id});
        let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
        let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");

        let start = "6:00 AM";
        let end = "6:00 PM";
        console.log(holidays)

        let holiday_lists = await holidayPeaks.getHealthProviderHolidayPeakLists();
        if(!holidays) {
            // console.log(days.length);
            for (var x = 0; x < holiday_lists.length; x++) {
                var temp_id = await healthProviderModel.countCollection('medi_provider_peak_holidays') + 1;
                var holiday = {
                    provider_peak_holiday_id: temp_id,
                    provider_id: provider_id,
                    type: "full",
                    month: holiday_lists[x].month,
                    day_number: holiday_lists[x].day_number,
                    day_week: holiday_lists[x].day_week,
                    description: holiday_lists[x].description,
                    amount: 0,
                    start: start,
                    end: end,
                    active: 0,
                    created_at: createdAt,
                    updated_at: updatedAt
                }
                
                await healthProviderModel.saveOne('medi_provider_peak_holidays', holiday);
                console.log(holiday);
                delete holiday._id;
            }
        } else {
            console.log('it has');
        }
        return { status: true, data: provider_id }
    } catch(error) {
        console.log(error);
        return { status: false, message: error }
    }
}

async function createHealthProviderProfessional(req, res, next) {
    try {
        let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
        let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");
        let temp_id = await healthProviderModel.countCollection('medi_professionals') + 1;

        let professional = {
            professional_id: temp_id,
            provider_id: req.body.provider_id,
            name: req.body.name,
            email_address: req.body.email_address,
            type: req.body.type,
            description: req.body.description ? req.body.description : null,
            qualifications: req.body.qualifications ? req.body.qualifications : null,
            specialty: req.body.specialty ? req.body.specialty : null,
            gender: req.body.gender ? req.body.gender : null,
            dob: req.body.dob ? req.body.dob : null,
            image: req.body.image ? req.body.image : null,
            phone_no: req.body.phone_no ? req.body.phone_no : null,
            phone_code: req.body.phone_code ? req.body.phone_code : null,
            gmail_address: req.body.gmail_address ? req.body.gmail_address : null,
            cc_emails: req.body.cc_emails ? req.body.cc_emails : null,
            check_pin: req.body.check_pin && req.body.check_pin == true ? 1 : 0,
            check_sync: req.body.check_sync && req.body.check_sync == true ? 1 : 0,
            pin: req.body.pin && req.body.pin == true ? 1 : 0,
            professional_availabity: req.body.professional_availabity && req.body.professional_availabity == true ? 1 : 0,
            start_availability_time: req.body.start_availability_time ? req.body.start_availability_time : null,
            end_availability_time: req.body.end_availability_time ? req.body.end_availability_time : null,
            active: 1,
            created_at: createdAt,
            updated_at: updatedAt,
            deleted: 0,
            deleted_at: null
        }

        isValid = await validate.joiValidate(professional, validate.healthProvider.professional, true)
    
        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }

        /* check if clinic exist */
        let provider = await healthProviderModel.getOne('medi_health_providers', {provider_id: req.body.provider_id});

        if(!provider)
        {
            return res.status(404).json({
                status: false,
                message: "Health Provider Does not exist."
            });
        }

        let professionalResult = await healthProviderModel.saveOne('medi_professionals', professional);
        
        if(typeof professionalResult != "object" && Object.keys(professionalResult).length <= 0)
        {
            return errorFunc(res,{
                status: false,
                message: "Data not saved."
            })
        }

        /* create professional time lists */
        await createHealthProviderManageTimes(professional.professional_id, 'professional');

        return res.status(201).json({
            status: true,
            message: "Saved.",
            data: professionalResult
        });

    } catch(error) {
        console.log(error);
        return errorFunc(res,{
            status: false,
            message: error
        })
    }
}

async function createHealthProviderServices(req, res, next) {
    try {
        let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
        let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");
        let temp_id = await healthProviderModel.countCollection('medi_health_provider_services') + 1;

        let service = {
            provider_service_id: temp_id,
            provider_id: req.body.provider_id,
            service_name: req.body.service_name,
            description: req.body.description,
            duration: req.body.duration,
            duration_type: req.body.duration_type,
            price: req.body.price,
            currency_type: req.body.currency_type ? req.body.currency_type : "sgd",
            consultation: req.body.consultation && req.body.consultation == true ? 1 : 0,
            co_paid_status: req.body.co_paid_status && req.body.co_paid_status == true ? 1 : 0,
            co_paid_amount: req.body.co_paid_amount ? req.body.co_paid_amount : 0,
            active: 1,
            position: req.body.position ? req.body.position : 0,
            scan_pay_show: 1,
            deleted: 0,
            deleted_at: null,
            created_at: createdAt,
            updated_at: updatedAt
        };

        isValid = await validate.joiValidate(service, validate.healthProvider.service, true)
    
        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }

        /* check if clinic exist */
        let provider = await healthProviderModel.getOne('medi_health_providers', {provider_id: req.body.provider_id});

        if(!provider)
        {
            return res.status(404).json({
                status: false,
                message: "Health Provider Does not exist."
            });
        }


        let serviceResult = await healthProviderModel.saveOne('medi_health_provider_services', service);
        
        if(typeof serviceResult != "object" && Object.keys(serviceResult).length <= 0)
        {
            return errorFunc(res,{
                status: false,
                message: "Data not saved."
            })
        }

        /* check if professional ids exits */
        for(var i = 0; i < req.body.professional_ids.length; i++) {
            await createHealthProviderProfessionalServices(serviceResult.provider_service_id, req.body.professional_ids[i], req.body.provider_id, true);
        }

        return res.status(201).json({
            status: true,
            message: "Saved.",
            data: serviceResult
        });
    } catch(error) {
        console.log(error);
        return errorFunc(res,{
            status: false,
            message: error
        })
    }
}

async function createProfessionalService(req, res, next) {
    try {
        if(!req.body.provider_service_id) {
            return res.status(400).json({
                status: false,
                message: "Health Provider Service ID is required."
            });
        }

        if(!req.body.provider_id) {
            return res.status(400).json({
                status: false,
                message: "Health Provider ID is required."
            });
        }

        if(!req.body.professional_id) {
            return res.status(400).json({
                status: false,
                message: "Health Provider Professional ID is required."
            });
        }

        if(typeof req.body.active == 'undefined') {
            return res.status(400).json({
                status: false,
                message: "Health Provider Professional Active Status is required."
            });
        }

        let result = await createHealthProviderProfessionalServices(req.body.provider_service_id, req.body.professional_id, req.body.provider_id, req.body.active && req.body.active == true ? 1 : 0);

        if(result.status) {
            return res.status(201).json({
                status: true,
                message: result.message,
                data: result.data
            });
        } else {
            return res.status(400).json({
                status: false,
                message: result.message
            });
        }

    } catch(error) {
        console.log(error);
        return errorFunc(res,{
            status: false,
            message: error
        })
    }
}

async function createHealthProviderProfessionalServices(service_id, professional_id, provider_id, active) {
    try {
        let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
        let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");
        /* check if service exist */
        let service = await healthProviderModel.getOne('medi_health_provider_services', {provider_service_id: service_id});

        if(!service)
        {
            return res.status(404).json({
                status: false,
                message: "Health Provider Service Does not exist."
            });
        }

        /* check if professional exist */
        let professional = await healthProviderModel.getOne('medi_professionals', {professional_id: professional_id});

        if(!service)
        {
            return res.status(404).json({
                status: false,
                message: "Health Provider Professional Does not exist."
            });
        }

        /* check if professional exist */
        let professional_service = await healthProviderModel.getOne('medi_professional_services', {professional_id: professional_id, provider_service_id: service_id});

        if(professional_service)
        {
            var deleted = 0;
            var deleted_at = null;
            if(active == true) {
                var deleted = 0;
                var deleted_at = null;
            } else {
                var deleted = 1;
                var deleted_at = moment().format("YYYY-MM-DD HH:mm:ss");;
            }
            // update
            let update = {
                professional_id: professional_id,
                provider_id: provider_id,
                provider_service_id: service_id,
                active: active,
                deleted: deleted,
                deleted_at: deleted_at,
                updated_at: updatedAt
            }
            console.log('update herer');
            let profServiceUpdateResult = await healthProviderModel.updateOne('medi_professional_services', { professional_id: professional_id, provider_service_id: service_id, provider_id: provider_id }, update);
        
            if(typeof profServiceUpdateResult != "object" && Object.keys(profServiceUpdateResult).length <= 0)
            {
                return errorFunc(res,{
                    status: false,
                    message: "Data failed to update."
                })
            }

            return { status: true, message: "Success", data: profServiceUpdateResult };
        } else {
            let temp_id = await healthProviderModel.countCollection('medi_professional_services') + 1;
            // create
            let prof_service = {
                professional_service_id: temp_id,
                professional_id: professional_id,
                provider_id: provider_id,
                provider_service_id: service_id,
                active: active,
                deleted: 0,
                deleted_at: null,
                created_at: createdAt,
                updated_at: updatedAt
            }

            isValid = await validate.joiValidate(prof_service, validate.healthProvider.prof_service, true)
    
            if(typeof isValid != 'boolean')
            {
                return { status: false, message: isValid.details[0].message }
            }

            let profServiceResult = await healthProviderModel.saveOne('medi_professional_services', prof_service);
        
            if(typeof profServiceResult != "object" && Object.keys(profServiceResult).length <= 0)
            {
                return errorFunc(res,{
                    status: false,
                    message: "Data not saved."
                })
            }

            return { status: true, message: "Success", data: profServiceResult };
        }

    } catch(error) {
        console.log(error);
        return { status: false, message: error }
    }
}


module.exports = {
	createHealthProvider,
    createManageTime,
    createHealthProviderPeaks,
    createHealthHolidayPeaks,
    createHealthProviderProfessional,
    createHealthProviderServices,
    createProfessionalService
}
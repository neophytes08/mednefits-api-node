require('express-async-errors');

const config = require('./../../../config/config')
const clinicTypesModel = require('./clinic_types.model');
const validate = require('./clinic_types.validator');
const moment = require('moment');
require('dotenv').config();

async function errorFunc(res, params){
    clinicTypesModel.transactionRollback()
    return res.json(params)
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

async function createClinicType(req, res, next) {
	console.log('pasok sa banga');
	try {
		let getReturnID = null;
        let getReturnData = null;
        let createdAt = moment().format("YYYY-MM-DD hh:mm:ss");
        let updatedAt = moment().format("YYYY-MM-DD hh:mm:ss");
        let temp_id = await clinicTypesModel.getCount('medi_health_provider_types');

		let basicValidation = {
			provider_type_id: temp_id + 1,
			name: req.body.name,
            image_url: req.body.image_url,
			spending_type: req.body.spending_type,
            co_paid_enabled_status: req.body.co_paid_enabled_status == true ? 1 : 0,
            co_paid_status: req.body.co_paid_status == true ? 1 : 0,
            co_paid_amount: req.body.co_paid_amount ? req.body.co_paid_amount : 0,
            lite_plan_enabled: req.body.lite_plan_enabled == true ? 1 : 0,
            discount_enabled_status: req.body.discount_enabled_status == true ? 1 : 0,
            discount_type: req.body.discount_type ? req.body.discount_type : 'fixed',
            discount_value: req.body.discount_value ? req.body.discount_value : 0,
            created_at: createdAt,
            updated_at: updatedAt,
            deleted: 0,
            deleted_at: null
		}
        console.log(req.body);
		console.log(basicValidation);

		isValid = await validate.joiValidate(basicValidation, validate.createClinicTypes.clinicTypes, true)
    
        if(typeof isValid != 'boolean')
        {
            errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }

         /**
         * Save Clinic Type
         * */
        let customerPurchaseResult = await clinicTypesModel.saveOne('medi_health_provider_types', basicValidation);
        
        if(typeof customerPurchaseResult != "object" && Object.keys(customerPurchaseResult).length <= 0)
        {
            errorFunc(res,{
                status: false,
                message: "Data not saved."
            })
        }

        return res.json({
            status: true,
            message: "Saved.",
            data: customerPurchaseResult
        });
	} catch (error) {
		errorFunc(res,{
            status: false,
            message: error
        })
	}
}

async function getClinicTypes(req, res, next) {
    console.log('getClinicTypes');
    let types = await clinicTypesModel.getMany('medi_health_provider_types');
    return res.json({
        status: true,
        message: "Success",
        data: types
    });
}

module.exports = {
    createClinicType,
    getClinicTypes
};
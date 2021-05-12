require('express-async-errors');
const APPPATH = require('app-root-path');
const config = require('./../../../config/config')
const carePlanModel = require('./care_plan_package.model');
const validate = require('./care_plan_package.validator');
const moment = require('moment');
const global_helper = require(`${APPPATH}/server/helpers/global.helper.js`);
require('dotenv').config();
const mongoose = require('mongoose');

async function errorFunc(res, params){
    carePlanModel.transactionRollback()
    return res.json(params)
}

async function createCarePlanPackage(req, res, next) {
	console.log('pasok sa banga');
	try {
        // let result = autoCreateCarePlanList();
        // return res.json({
        //     status: true,
        //     message: "Saved.",
        //     data: result
        // });
        let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
        let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");

		let basicValidation = {
            name: req.body.name,
            account_type: req.body.account_type,
            secondary_account_type: req.body.secondary_account_type,
            wallet: req.body.wallet && req.body.wallet == true ? 1 : 0,
            default_selection: req.body.default_selection && req.body.default_selection == true ? 1 : 0,
            created_at: createdAt,
            updated_at: updatedAt,
            deleted: 0,
            deleted_at: null
        }
        console.log(req.body);
        console.log(basicValidation);
        isValid = await validate.joiValidate(basicValidation, validate.createCarePlanPackage.package, true)
    
        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }
        
        basicValidation._id = await global_helper.createUuID();
        let result = await carePlanModel.saveOne("medi_benefits_package_group", basicValidation);

        if(typeof result != "object" && Object.keys(result).length <= 0)
        {
            return errorFunc(res,{
                status: false,
                message: "Data not saved."
            })
        }

        return res.json({
            status: true,
            message: "Saved.",
            data: 1
        });
	} catch (error) {
		return errorFunc(res,{
            status: false,
            message: error
        })
	}
}

async function createPackageBundle(req, res, next) {
    try {
        let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
        let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");
        let benefits_bundle_ids = req.body.benefits_bundle_ids;
        console.log(req.body);
        for(var i = 0; i < benefits_bundle_ids.length; i++) {

            let list = {
                benefits_care_package_id: benefits_bundle_ids[i],
                package_group_id:  req.body.package_group_id
            }
            console.log(list);
            list._id = await global_helper.createUuID();
            await carePlanModel.saveOne("medi_benefits_package_bundle", list);
            delete list._id;
        }
        return res.json({
            status: true,
            message: "Saved.",
            data: 1
        });
    } catch(error) {
        console.log(error);
        return errorFunc(res,{
            status: false,
            message: error
        })
    }
}



module.exports = {
    createCarePlanPackage,
    createPackageBundle
};
require('express-async-errors');
const APPPATH = require('app-root-path');
const config = require('./../../../config/config')
const carePlanModel = require('./care_plan.model');
const validate = require('./care_plan.validator');
const moment = require('moment');
const global_helper = require(`${APPPATH}/server/helpers/global.helper.js`);
require('dotenv').config();

async function errorFunc(res, params){
    carePlanModel.transactionRollback()
    return res.json(params)
}

async function aggregation(model, fieldName, objectContainer, res)
{
    // console.warn("test")
    try {
        fieldName = (typeof fieldName != 'undefined' ? fieldName : "provider_type_id" )

        let getReturnID = await carePlanModel.aggregation(
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
            carePlanModel.transactionRollback()
            return res.status(500).json({
                status: false,
                message: "Database error."
            });
        }
    } catch (error) {
        console.warn(error)
        carePlanModel.transactionRollback()
        // console.warn
        return res.status(500).json({
            status: false,
            message: "Server error."
        });
    }

}

async function createCarePlanList(req, res, next) {
	console.log('pasok sa banga');
	try {
        let results = await autoCreateCarePlanList();
        return res.json({
            status: true,
            message: "Saved.",
            data: results
        });
		let getReturnID = null;
        let getReturnData = null;
        let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
        let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");

		let basicValidation = {
            package_name: req.body.name,
            package_description: req.body.description,
            image: req.body.image,
            package_discount: req.body.discount,
            position: 0,
            created_at: createdAt,
            updated_at: updatedAt,
            deleted: 0,
            deleted_at: null
        }
        console.log(req.body);
        console.log(basicValidation);

        isValid = await validate.joiValidate(basicValidation, validate.createCarePlanLists.care, true)
    
        if(typeof isValid != 'boolean')
        {
            return errorFunc(res,{
                status: false,
                message: isValid.details[0].message
            })
        }
        
        basicValidation._id = await global_helper.createUuID();
        let result = await carePlanModel.saveOne("medi_benefits_care_package", basicValidation);

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

async function autoCreateCarePlanList( ) {
    let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
    let updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");

    let list = [
        {
            _id: await global_helper.createUuID(),
            package_name: "Outpatient GP",
            package_description: "Consultation: S$0, covered by us. Medicine & Treatment: Pay using Mednefits Credits.",
            image: "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515238/tidzdguqbafiq4pavekj.png",
            discount: "100%",
            position: 1,
            created_at: createdAt,
            updated_at: updatedAt
        },
        {
            _id: await global_helper.createUuID(),
            package_name: "Dental Care",
            package_description: "Up to 30% off dental services.",
            image: "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515231/lhp4yyltpptvpfxe3dzj.png",
            discount: "30%",
            created_at: createdAt,
            updated_at: updatedAt
        },
        {
            _id: await global_helper.createUuID(),
            package_name: "Outpatient GP",
            package_description: "Consultation: S$0, covered by us. Medicine & Treatment: Pay using Mednefits Credits.",
            image: "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515238/tidzdguqbafiq4pavekj.png",
            discount: "30%",
            created_at: createdAt,
            updated_at: updatedAt
        },
        {
            _id: await global_helper.createUuID(),
            package_name: "TCM",
            package_description: "100% consultation covered by Mednefits. You only need to pay for medicine",
            image: "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515256/jyocn9mr7mkdzetjjmzw.png",
            discount: "100%",
            created_at: createdAt,
            updated_at: updatedAt
        },
        {
            _id: await global_helper.createUuID(),
            package_name: "Health Specialist",
            package_description: "Save up to 60% on consultation.",
            image: "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515247/toj22uow68w9yf4xnn41.png",
            discount: "",
            created_at: createdAt,
            updated_at: updatedAt
        },
        {
            _id: await global_helper.createUuID(),
            package_name: "Wellness Benefits",
            package_description: "Save up to 40% on wellness services.",
            image: "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515261/phvap8vk0suwhh2grovj.png",
            discount: "40%",
            created_at: createdAt,
            updated_at: updatedAt
        },
        {
            _id: await global_helper.createUuID(),
            package_name: "Outpatient GP",
            package_description: "Consultation: Covered by your company. Medicine & Treatment: You pay directly to your Health Provider.",
            image: "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515238/tidzdguqbafiq4pavekj.png",
            discount: "0",
            position: 1,
            created_at: createdAt,
            updated_at: updatedAt
        },
        {
            _id: await global_helper.createUuID(),
            package_name: "Outpatient GP",
            package_description: "Consultation: S$0, covered by us. Medicine & Treatment: You pay directly to your Health Provider.",
            image: "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515238/tidzdguqbafiq4pavekj.png",
            discount: "0",
            position: 1,
            created_at: createdAt,
            updated_at: updatedAt
        },
        {
            _id: await global_helper.createUuID(),
            package_name: "Outpatient GP",
            package_description: "Consultation: S$13 (subject to GST), auto deducted from your Mednefits Credits. Medicine & Treatment: Pay using your Mednefits Credits.",
            image: "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515238/tidzdguqbafiq4pavekj.png",
            discount: "0",
            position: 1,
            created_at: createdAt,
            updated_at: updatedAt
        },

    ];

    for(var x = 0; x < list.length; x++) {
        delete _id;
        await carePlanModel.saveOne("medi_benefits_care_package", list[x]);
        console.log('element', list[x])
    }

    // let result = await carePlanModel.saveMany("medi_benefits_care_package", list);
    // console.log(result);
    return { status: true};
}



module.exports = {
    createCarePlanList
};
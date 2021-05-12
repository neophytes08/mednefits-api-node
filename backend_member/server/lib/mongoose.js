const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const fs = require('fs');
const APPPATH = require('app-root-path');
const {map} = require('p-iteration')
const _ = require('lodash');

// const AutoIncrement = require('mongoose-auto-increment-fix-offset');
const schemaSourceModels = `${APPPATH}/schemas.json`;
let Models = new Object();
let schemas = null;
let uri = null;
// console.log(schemaSourceModels);
let modelList = new Object();
if(process.env.NODE_ENV == "staging") {
  uri = process.env.MONGO_CLIENT;
} else {
  uri = `mongodb://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;
}


mongoose.connect(uri,{ useNewUrlParser: true },async function (err, client) {
  console.log('error', err);
  fs.readFile(schemaSourceModels, async (err, data) => {  
      if (err) throw err;
      console.log('connected...')
      let schemas = JSON.parse(data);
      // console.warn(schemas)
      modelList =  new Promise(async function(resolve, reject) {
        await _.each(schemas, async (value, key) => {
          Schema = new mongoose.Schema(value, { timestamps: true, _id : false });
          Schema.index({'$**': 'text'});
          Schema.plugin(mongoosePaginate);
          // console.log('Schema', Schema)
          Models[key] = await mongoose.model(key, Schema)
        });
        resolve(Models)
      })
  });
})

module.exports = {
  model: async function(modelName){
      return await modelList.then(async (model) => {
        // console.log('model', model)
          return await model[modelName]
      })
  },
  update: async (model, params, data) => {
    try {
      return await module.exports.model(model)
          .then(async (db) => {
            let mongoResult = await db.updateMany(params, data)
            return mongoResult;
          });
     } catch (error) {
        console.warn('error testing',error)
        return false;
    }
  },
  insertOne: async (model, data) => {

    try {
      let result = await module.exports.model(model)
          .then(async (db) => {
              let validData = data//validate.unsetParams(db.schema.obj, data) 
              // console.warn(validData)
              let mongoResult = await db.collection.insertOne(validData)
              return mongoResult
          })
          
      return (typeof result.ops != "undefined" ? result.ops[0] : false)
    } catch(error) {
      console.log('error', error)
    }
  },
  insertMany: async (model, data) => {
    try {
      let result = await module.exports.model(model)
          .then(async (db) => {
              // let validData = validate.unsetParams(db.schema.obj, data) 
              let mongoResult = await db.insertMany(data)
              return mongoResult
          })

      return (typeof result.ops != "undefined" ? result.ops[0] : false)
    } catch (error) {
        console.warn(error)
        return false;
    }
  },
  fetchOne: async (model, params) => {
    try {
      let result = await module.exports.model(model)
        .then(async (db) => {
            let mongoResult = await db.findOne(params).lean()
            return mongoResult
        })
        // console.warn('Model Name',model)
        // console.warn('result set',result)
      return result
    } catch (error) {
      console.warn('error', error)
      return false;
    }
  },
  fetchMany: async (model, params) => {
    try {
      let result = await module.exports.model(model)
          .then(async (db) => {
              let mongoResult = await db.find(params).lean()
              return mongoResult
          })

      return result
    } catch (error) {
      console.warn(error)
      return false;
    }
  },
  paginate: async (model, query, options) => {
    try {
      let result = await module.exports.model(model)
          .then(async (db) => {
              let mongoResult = await db.paginate(query, options)
              return mongoResult
          })

      return result
    } catch (error) {
      console.warn(error)
      return false;
    }
  },
  getOne: async (model, params) => {
    try {
        let result = await module.exports.model(model)
            .then(async (db) => {
                let mongoResult = await db.findOne(params).lean()
                return mongoResult
            })
        return result
    } catch (error) {
      console.log(error);
        return false;
    }
  },
  remove: async (model, params) => {
    try {
        let result = await module.exports.model(model)
            .then(async (db) => {
                let mongoResult = await db.remove(params).exec();
                return mongoResult
            })

        return result
    } catch (error) {
        console.warn(error)
        return false;
    }
  },
  countCollection: async (model, params, flag) => {
    try {
        if(typeof flag == 'undefined' || (typeof flag != 'undefined' && !flag))
        {
            let result = await module.exports.model(model)
                .then(async (db) => {
                    let mongoResult = await db.count()
                    return mongoResult
                })
                
            return result;
        }
        else
        {
            let result = await module.exports.model(model)
                .then(async (db) => {
                    let mongoResult = await db.find(params).count()
                    return mongoResult
                })
                
            return result;
        }
    } catch (error) {
      return false;
    }
  },
  aggregation: async (model, params) => {
    try {
        let result = await module.exports.model(model)
            .then(async (db) => {
                let mongoResult = await db
                    .aggregate(params)

                return mongoResult
            })
        return result;
    } catch (error) {
        return false;
    }
  },
  getPrimaryID: async (model, objectContainer) => {
    console.warn('test')
    let primaryKeys = {
      medi_admin: "_id"
      ,medi_member_benefits_package: "_id"
      ,medi_members: "_id"
      ,medi_customer_purchase: "_id"
      ,medi_customer_business_information: "_id"
      ,medi_customer_billing_contact: "_id"
      ,medi_customer_plans: "_id"
      ,medi_customer_plan_status: "_id"
      ,medi_active_plan_invoices: "_id"
      ,medi_active_plan_extensions: "_id"
      ,medi_active_plan_extension_invoices: "_id"
      ,medi_company_members: "_id"
      ,medi_company_member_deleted: "_id"
      ,medi_customer_hr_accounts: "_id"
      ,medi_customer_spending_deposit_credits: "_id"
      ,medi_customer_wallets: "_id"
      ,medi_customer_wallet_history: "_id"
      ,medi_customer_spending_invoices: "_id"
      ,medi_spending_invoice_in_network_transactions: "_id"
      ,medi_spending_invoice_out_network_transactions: "_id"
      ,medi_wallet_resets: "_id"
      ,medi_company_block_clinic_access: "_id"
      ,medi_customer_renew_plans: "_id"
      ,medi_customer_employee_plan_payment_refunds: "_id"
      ,medi_customer_employee_plan_refund_details: "_id"
      ,medi_customer_plan_tiers: "_id"
      ,medi_customer_plan_tier_users: "_id"
      ,medi_dependent_plans: "_id"
      ,medi_dependent_invoices: "_id"
      ,medi_dependent_plan_status: "_id"
      ,medi_dependent_plan_history: "_id"
      ,medi_dependent_payment_refunds: "_id"
      ,medi_dependent_plan_withdraws: "_id"
      ,medi_agent_referral_company: "_id"
      ,medi_customer_active_plans: "_id"
      ,medi_customer_employee_temp_enrollment: "id"
      ,medi_dependent_temp_enrollment: "id"
      ,medi_member_wallet_history: "_id"
      ,medi_e_wallet: "_id"
      ,medi_benefits_package_group: "_id"
      ,medi_member_wallet: "_id"
      ,medi_member_plan_history: "_id"
      ,medi_benefits_package_bundle: '_id'
      ,medi_spending_invoice_in_network_transactions: "_id"
    }

    try {
      console.warn(model)
      let result = await module.exports.model(model)
        .then(async (db) => {
          // console.warn(primaryKeys[model])
          // return 0
            let mongoResult = await db.aggregate(
                [
                    {
                    $group:
                        {
                            _id : {_id : "$_id"},
                            maxInfoID: { $max:  `$${primaryKeys[model]}`},
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
            // console.warn('mongoResult')
            if(typeof mongoResult[0] != 'undefined')
            {
              if(!isNaN(mongoResult[0].maxInfoID))
              {
                objectContainer[primaryKeys[model]] = mongoResult[0].maxInfoID + 1
                return objectContainer
              }
            }

            objectContainer[primaryKeys[model]] = 1
            return objectContainer;
        })

      return result
    } catch (error) {
      console.warn(error)
      return false;
    }
  },
  mongoose: mongoose
}
require('express-async-errors');

const APPPATH = require('app-root-path');
const mongoose = require(APPPATH + '/server/lib/mongoose')
const validate = require(APPPATH + '/server/components/auth/auth.validator');
const moment = require('moment')
// const ObjectId = mongoose.mongoose.Schema.ObjectId;
const mongo = mongoose.mongoose;
const { map } = require('p-iteration');
const _ = require('lodash');


let transactionInputs = new Array();

const trnsactionInit = () => {
    transactionInputs['insert'] = [];
    transactionInputs['update'] = [];
    transactionInputs['delete'] = [];
}

trnsactionInit();

const transactionInsertRegistry = async (model, data) => {
    transactionInputs['insert'].push({model: model, data: data});
}

const transactionUpdateRegistry = async (model, data) => {
    transactionInputs['update'].push({model: model, data: data});
}

const transactionDeleteRegistry = async (model, data) => {
    transactionInputs['delete'].push({model: model, data: data});
}

const transactionRollback = async () => {
    
    if((transactionInputs['insert']).length > 0)
    {
        await map(transactionInputs['insert'], async element => {
            await removeData(element.model, {_id: element.data._id});
        })
    }
    
    if((transactionInputs['update']).length > 0)
    {
        await map(transactionInputs['update'], async element => {
            await updateOne(element.model,{_id: element.data._id}, element.data);
        })
    }

    if((transactionInputs['delete']).length > 0)
    {
        await map(transactionInputs['delete'], async element => {
            await saveOne(element.model,element.data);
        })
    }

    trnsactionInit();
}

const countCollection = async (model, params, flag) => {

    try {
        let result = await mongoose.model(model)
            .then(async (db) => {
                let mongoResult = await db.find(params || {}).countDocuments();
                return mongoResult;
            })
            
        return result;
    } catch (error) {
        console.log('error', error)
        return false;
    }
}

const aggregation = async (model, params) => {
    try {
        let result = await mongoose.model(model)
            .then(async (db) => {
                let mongoResult = await db
                    .aggregate(params);

                return mongoResult;
            })
        return result;
    } catch (error) {
        console.log('error', error)
        return false;
    }
}

const getPrimaryID = async (moden, obj) => {
    return await mongoose.getPrimaryID(moden, obj);
}
const saveOne = async (model, data) => {
    try {
        let result = await mongoose.insertOne(model, data);
        transactionInsertRegistry(model, result);
        return result;
    } catch (error) {
        console.log('error', error)
        return false;
    }
}

const saveMany = async (model, data) => {
    try {
        let result = await mongoose.model(model)
            .then(async (db) => {
                // let validData = validate.unsetParams(db.schema.obj, data) 
                let mongoResult = await db.insertMany(data)
                return mongoResult
            })

        return (typeof result.ops != "undefined" ? result.ops[0] : false)
    } catch (error) {
        return false;
    }
}

const getMany = async (model, params) => {
    try {
        let result = await mongoose.model(model)
            .then(async (db) => {
                let mongoResult = await db.find(params).lean()
                // console.warn('mongoResult',mongoResult)
                return mongoResult
            })
        return result
    } catch (error) {
        console.warn('error',error)
        return false;
    }
}

const getIds = async (model, params, id) => {
    try {
        let result = await mongoose.model(model)
            .then(async (db) => {
                let mongoResult = await db.find(params).distinct(id)
                return mongoResult
            })
        return result
    } catch (error) {
        console.warn('error',error)
        return false;
    }
}

const getOne = async (model, params) => {
    try {
        let result = await mongoose.model(model)
            .then(async (db) => {
                let mongoResult = await db.findOne(params).lean()
                return mongoResult
            })
        return result
    } catch (error) {
        return false;
    }
}

const getBySort = async (model, params, sort_key) => {
    try {
        let result = await mongoose.model(model)
            .then(async (db) => {
                let mongoResult = await db.find(params).sort(sort_key)
                return mongoResult
            })
        return result
    } catch (error) {
        return false;
    }
}

const getMaxValue = async (model, key) => {
    try {
        let result = await mongoose.model(model)
            .then(async (db) => {
                let mongoResult = await db.find().sort({ key: -1 }).lean()
                return mongoResult ? mongoResult[0] : mongoResult
            })
        return result
    } catch (error) {
        return false;
    }
}

const updateOne = async (model, params, data) => {
    try {
        let result = await mongoose.model(model)
            .then(async (db) => {
                let mongoResult = await db.updateOne(
                        params,
                        { $set: data }
                     )
                    transactionUpdateRegistry(model, data)
                return mongoResult
            })
        return result
    } catch (error) {
        return false;
    }
}

const updateMany = async (model, params, data) => {
    try {
        let result = await mongoose.model(model)
            .then(async (db) => {
                let mongoResult = await db.updateMany(
                        params,
                        { $set: data }
                    );
                return mongoResult
            })
        return result
    } catch (error) {
        return false;
    }
}

const removeData = async (model, params, data) => {
    try {
        let result = await mongoose.model(model)
            .then(async (db) => {
                // let y = await mongo.startSession()
                // await y.startTransaction()
                let mongoResult = await db.deleteOne(params).exec();
                // console.warn('test');
                // await y.abortTransaction();
                return mongoResult
            })
        transactionDeleteRegistry(model, data)
        return result
    } catch (error) {
        return false;
    }
}

const paginate = async (model, query, options) => {
    try {
      let result = await mongoose.model(model)
          .then(async (db) => {
              let mongoResult = await db.paginate(query, options)
              return mongoResult
          })
      return result
    } catch (error) {
      console.warn(error)
      return false;
    }
}

const rawQuery = async (model, params, populateList) => {
    try {
        let result = await mongoose.model(model)
            .then(async (db) => {
                if (populateList.length > 0) {
                    return await db.find(params)
                            .exec();
                } else { 
                    return await db.find(params)
                            .populate(populateList)
                            .exec();
                }
                
            });
            
        return result
    } catch (error) {
        console.log(error);
    }
};

const getLimit = async (model, params, limit, skip) => {
    
    try {
        let result = await mongoose.model(model)
            .then(async (db) => {
                
                if (skip <= 1) {
                    return await db.find(params)
                                .limit(parseInt(limit))
                                .exec();
                } else {
                    return await db.find(params)
                                .skip(parseInt(skip) * parseInt(limit))
                                .limit(parseInt(limit))
                                .exec();
                }
            
            })
        return result
    } catch (error) {
        return false;
    }
}

const getOneSelectedField = async(model, params, fields) => {
    try {
        return await mongoose.model(model)
            .then(async (db) => {
                return await db.findOne({params})
                                .select(fields);
            });
    } catch (error) {
        return false;
    }
}

const getManySelectedField = async(model, params, fields, sort) => {
    
    try {
        return await mongoose.model(model)
            .then(async (db) => {
                if (!sort) {
                    return await db.find(params)
                                .select(fields)
                                .exec();
                } else {
                    return await db.find(params)
                                .select(fields)
                                .sort(sort)
                                .exec();
                }
                
            });
    } catch (error) {
        return false;
    }
}

const getTwoTable = async(params = []) => {
    if (params.length) {
        try {
            let prev_ref = [],
            loop_table_data = [],
            ref_value = [],
            data,
            new_table = false,
            documents = [];

            for(let x = 0; x < params.length; x++) {
                let parameter = params[x]['params'] ? params[x]['params'] : {},
                model = params[x]['model'],
                fields = params[x]['fields'],
                sort = params[x]['sort'];
                     
                    //Get table data
                    data = await getManySelectedField(model, prev_ref.length > 0 ? prev_ref: parameter, fields, sort);
                           
                    // Assigned data value to loop_table_data holder
                    ref_value = [];
                    
                    let column_field = {};
                    
                    _.forEach(data, (item, key) => {

                        // push ref value into array.
                       ref_value.push(item[params[x]['ref']])
                          
                        // push data
                        Object.keys(fields).forEach(field => {
                            let istruthy = fields[field];
                            
                            if (istruthy) {
                                // Use spread operator in es6
                                column_field = {...column_field, [field]: item[field]};
                            }
                        });
                        
                        // push column fields
                        if (new_table) {
                            let index = _.findIndex(loop_table_data, { [prev_ref_index]: item[prev_ref_index] });
                            documents.push({...loop_table_data[index], ...column_field});
                        } else {
                            loop_table_data.push(column_field);
                        }
                        
                    });
                    
                    // assign ref value as prev_ref
                    prev_ref = {
                        [params[x]['ref']] : { $in:  ref_value } 
                    };
                    prev_ref_index = params[x]['ref'];
                    new_table = true;
            }

            // return loop_table_data
            return documents.length > 0 ? documents : loop_table_data; 
        } catch (error) {
            throw error;
        }
    } else return [];
}

module.exports = {
    saveOne,
    saveMany,
    getMany,
    getOne,
    updateOne,
    updateMany,
    removeData,
    aggregation,
    countCollection,
    transactionRollback,
    getPrimaryID,
    getMaxValue,
    paginate,
    getIds,
    getBySort,
    rawQuery,
    getLimit,
    getOneSelectedField,
    getManySelectedField,
    getTwoTable
}
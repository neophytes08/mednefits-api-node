require('express-async-errors');

const APPPATH = require('app-root-path');
const mongoose = require(APPPATH + '/server/lib/mongoose')
// const validate = require(APPPATH + '/server/components/auth/auth.validator');
const moment = require('moment')
// const ObjectId = mongoose.mongoose.Schema.ObjectId;
const mongo = mongoose.mongoose;
const { map } = require('p-iteration')


let transactionInputs = new Array();

const trnsactionInit = () => {
    transactionInputs['insert'] = []
    transactionInputs['update'] = []
    transactionInputs['delete'] = []
}

trnsactionInit()

const transactionInsertRegistry = async (model, data) => {
    transactionInputs['insert'].push({model: model, data: data})
}

const transactionUpdateRegistry = async (model, data) => {
    transactionInputs['update'].push({model: model, data: data})
}

const transactionDeleteRegistry = async (model, data) => {
    transactionInputs['delete'].push({model: model, data: data})
}

const transactionRollback = async () => {
    
    if((transactionInputs['insert']).length > 0)
    {
        await map(transactionInputs['insert'], async element => {
            await removeData(element.model, {_id: element.data._id})
        })
    }
    
    if((transactionInputs['update']).length > 0)
    {
        await map(transactionInputs['update'], async element => {
            await updateOne(element.model,{_id: element.data._id}, element.data)
        })
    }

    if((transactionInputs['delete']).length > 0)
    {
        await map(transactionInputs['delete'], async element => {
            await saveOne(element.model,element.data)
        })
    }

    trnsactionInit()
}

const countCollection = async (model, params) => {

    try {
        let result = await mongoose.model(model)
            .then(async (db) => {
                let mongoResult = await db.count()
                return mongoResult
            })
            
        return result;
    } catch (error) {
        
        return false;
    }
}

const getPrimaryID = async (moden, obj) => {
    return await mongoose.getPrimaryID(moden, obj);
}

const aggregation = async (model, params) => {
    try {
        let result = await mongoose.model(model)
            .then(async (db) => {
                let mongoResult = await db
                    .aggregate(params)

                return mongoResult
            })
        return result;
    } catch (error) {
        return false;
    }
}
const saveOne = async (model, data) => {
    try {
        let result = await mongoose.insertOne(model, data)
        transactionInsertRegistry(model, result)
        return result;
    } catch (error) {
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
        console.log(error);
        return false;
    }
}

const getMany = async (model, params) => {
    try {
        let result = await mongoose.model(model)
            .then(async (db) => {
                let mongoResult = await db.find(params).lean()
                return mongoResult
            })
        return result
    } catch (error) {
        return false;
    }
}

const getCount = async (model) => {
    try {
        let result = await mongoose.model(model)
            .then(async (db) => {
                let mongoResult = await db.count()
                return mongoResult
            })
        return result
    } catch (error) {
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
                let mongoResult = await db.remove(params).exec();
                return mongoResult
            })
        transactionDeleteRegistry(model, data)
        return result
    } catch (error) {
        return false;
    }
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
    getCount,
    getPrimaryID
    // transactionRollback,
    // transactionInsert
}
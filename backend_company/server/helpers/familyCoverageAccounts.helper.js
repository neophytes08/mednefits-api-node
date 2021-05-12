require('express-async-errors');
const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const { map } = require('p-iteration');
// const wallet = require('./wallet.helper');
const moment = require('moment');

const createData = async (data) => {

    let familyDependentResult = await mongoose.insertOne(
        "medi_member_covered_dependents", data);
    
    return familyDependentResult;
}
module.exports = {
    createData
};
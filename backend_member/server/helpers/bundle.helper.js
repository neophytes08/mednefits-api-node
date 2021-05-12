require('express-async-errors');
const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const { map } = require('p-iteration');
// const wallet = require('./wallet.helper');
const moment = require('moment');

const getBundle = async (id) => {

    let bundle = await mongoose.fetchMany("medi_benefits_package_bundle", {package_group_id: id});
    console.log('bundle', bundle);
    return bundle;
}
module.exports = {
    getBundle
};
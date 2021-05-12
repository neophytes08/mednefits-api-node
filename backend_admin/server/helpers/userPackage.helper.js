require('express-async-errors');
const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const { map } = require('p-iteration');
// const wallet = require('./wallet.helper');
const moment = require('moment');
const global_helper = require(`${APPPATH}/server/helpers/global.helper.js`);

const createUserPackage = async (carePackageID, ID) => {
    let packageResult = await mongoose.insertOne(
        "medi_member_benefits_package", {
            member_benefits_package_id: await global_helper.getId('medi_member_benefits_package', 'member_benefits_package_id'),
            benefits_care_package_id: carePackageID,
            member_id: ID,
            created_at: moment(new Date()).format("YYYY-MM-DD HH:MM:SS"),
            updated_at: moment(new Date()).format("YYYY-MM-DD HH:MM:SS")
        });
    console.log('packageResult', packageResult)
    return packageResult;
}

module.exports = {
    createUserPackage
};

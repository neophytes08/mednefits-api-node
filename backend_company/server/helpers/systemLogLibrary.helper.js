require('express-async-errors');
const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const { map } = require('p-iteration');

const createAdminLog = async (data, res) => {
	let result = await mongoose.insertOne("medi_admin_logs", data);
    return result;
}


module.exports = {
    createAdminLog
}
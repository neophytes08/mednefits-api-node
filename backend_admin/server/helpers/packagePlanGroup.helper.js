const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const { map } = require('p-iteration');
const moment = require('moment');

const getPackagePlanGroupDefault = async () => {
    let result = await mongoose.fetchOne("medi_benefits_package_group", { default_selection: 1 });

    if(result)
    {
        return result.benefits_package_group_id;
    }

    return false;
}

module.exports = {
    getPackagePlanGroupDefault
}

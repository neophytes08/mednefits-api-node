require('express-async-errors');
const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const { map } = require('p-iteration');
// const wallet = require('./wallet.helper');
const moment = require('moment');

const getPackagePlanGroupDefault = async () => {

    let defaultDataResult = await mongoose.fetchOne("medi_benefits_package_group", {default_selection: 1});
    
    return defaultDataResult;
}

const createUserFromCorporate = async (data) => {

    let dataEntry = {
        member_id: 1,//dummy
        address: data.address,//
        country: data.country,//
        city: data.city,//
        postal_code: data.postal_code,//
        otp_code: data.otp_code,//
        bmi: data.bmi,//
        weight: data.weight,//
        height: data.height,//
        blood_type: data.blood_type,//
        bank_account: data.bank_account,//
        communication_type: data.communication_type,//
        member_type: data.member_type,//
        fullname: data.name,
        password: data.password,
        email: data.email,
        phone_no: data.phone_no,
        phone_code: data.phone_code,
        dob: data.dob,
        lat: "",
        lang: "",
        nric: data.nric,
        zip_code: data.zip_code,
        fin: "",
        image: 'https://res.cloudinary.com/www-medicloud-sg/image/upload/v1427972951/ls7ipl3y7mmhlukbuz6r.png',
        active: 1,
        created_at: moment(new Date()).format("YYYY-MM-DD"),
        updated_at: moment(new Date()).format("YYYY-MM-DD"),
        user_type: 5,
        access_type: 0,
        source_type: 0,
        job_title: data.job_title
    }

    let memberResult = await mongoose.insertOne(
        "medi_members", 
        await mongoose.getPrimaryID("medi_members", dataEntry)
    );
    
    if(memberResult)
    {
        let insertedID = memberResult.member_id;
        if(!await wallet.createWallet({
            user_id: insertedID,
            balance: 0,
            created_at: moment().format("YYYY-MM-DD"),
            updated_at: moment().format("YYYY-MM-DD")
        }))
        {
            return insertedID;
        }
    }
    return false;
}
module.exports = {
    createUserFromCorporate,
    getPackagePlanGroupDefault
};

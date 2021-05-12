require('express-async-errors');
const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const { map } = require('p-iteration');
const wallet = require('./wallet.helper');
const moment = require('moment');
const sha256 = require('sha256');
const global_helper = require(`${APPPATH}/server/helpers/global.helper.js`);

const createUserFromDependent = async(data) =>
{
    let dataObject = {
        member_id: await global_helper.getId('medi_members', 'member_id'),
        fullname: data.name,
        postal_code: data.postal_code,
        image: 'https://res.cloudinary.com/www-medicloud-sg/image/upload/v1427972951/ls7ipl3y7mmhlukbuz6r.png',
        dob: moment(new Date(data.dob)).format("YYYY-MM-DD"),
        member_type: data.member_type,
        active: 1,
        created_at: moment(new Date()).format("YYYY-MM-DD hh:mm:ss"),
        updated_at: moment(new Date()).format("YYYY-MM-DD hh:mm:ss")
    }

    console.log('dataObject', dataObject)
    let result = await mongoose.insertOne("medi_members", dataObject);

    if((Object.keys(result || {})).length > 0)
    {
        return result.member_id;
    }

    return false;
}

const createUserFromCorporate = async (data) => {
    let dataEntry = {
        member_id: await global_helper.getId('medi_members', 'member_id'),
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
        created_at: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
        updated_at: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
        user_type: 5,
        access_type: 0,
        source_type: 0,
        job_title: data.job_title,
        member_type: "employee"
    }

    let memberResult = await mongoose.insertOne(
        "medi_members", dataEntry);
    
    if(memberResult)
    {
        let insertedID = memberResult.member_id;
        await wallet.createWallet({
            member_wallet_id: await global_helper.getId('medi_member_wallet', 'member_wallet_id'),
            member_id: insertedID,
            medical_balance: 0,
            wellness_balance: 0,
            created_at: moment().format("YYYY-MM-DD HH:mm:ss"),
            updated_at: moment().format("YYYY-MM-DD HH:mm:ss")
        });
        
        return insertedID;
    }
    console.log(memberResult);
    return false;
}

module.exports = {
    createUserFromCorporate,
    createUserFromDependent
};

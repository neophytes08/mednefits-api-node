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
    // protected $table = 'user';
    let dataObject = {
        member_id: 1 //primary
        ,fullname: data.name
        ,nric: data.nric
        ,email: data.email
        ,password: sha256(data.password)
        ,address: data.address
        ,country: data.country
        ,city: data.city
        ,postal_code: data.postal_code
        ,image: 'https://res.cloudinary.com/www-medicloud-sg/image/upload/v1427972951/ls7ipl3y7mmhlukbuz6r.png'
        ,phone_code: ""
        ,phone_no: ""
        ,otp_code: data.otp_code || null
        ,dob: mpment(new Date(data.dob)).format("YYYY-MM-DD")
        ,bmi: data.bmi || null
        ,weight: data.weight || null
        ,height: data.height || null
        ,blood_type: data.blood_type || null
        ,job_title: data.job_title  || null
        ,bank_account: data.bank_account || null
        ,communication_type: data.communication_type || null
        ,member_type: data.member_type || null
        ,created_at: moment(new Date()).format("YYYY-MM-DD hh:mm:ss")
        ,updated_at: moment(new Date()).format("YYYY-MM-DD hh:mm:ss")
    }
    // $user_data = array(
    //     'Name'      => $data['Name'],
    //     'Password'  => '123456',
    //     'Email'     => $data['Email'],
    //     'PhoneNo'   => null,
    //     'PhoneCode' => $data['PhoneCode'],
    //     'Lat'       => '',
    //     'Lng'       => '',
    //     'NRIC'      => $data['NRIC'],
    //     'FIN'       => '',
    //     'Image'     => 'https://res.cloudinary.com/www-medicloud-sg/image/upload/v1427972951/ls7ipl3y7mmhlukbuz6r.png',
    //     'Active'    => 1,
    //     'created_at'    => time(),
    //     'updated_at'    => time(),
    //     'UserType'      => 5,
    //     'access_type'   => 2,
    //     'source_type'   => 1,
    //     'Job_Title'     => null
    // );

    let result = await mongoose.insertOne("medi_members", dataObject);

    if((Object.keys(result || {})).length > 0)
    {
        return result.member_id;
    }

    return false;
}

const createUserFromCorporate = async (data) => {

    let dataEntry = {
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
        job_title: data.job_title
    }

    dataEntry._id = await global_helper.createUuID();
    let memberResult = await mongoose.insertOne(
        "medi_members", dataEntry);
    
    if(memberResult)
    {
        let insertedID = memberResult._id;
        await wallet.createWallet({
            _id: await global_helper.createUuID(),
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

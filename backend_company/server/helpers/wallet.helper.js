require('express-async-errors');
const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const { map } = require('p-iteration');
const moment = require('moment');
// e_wallet

const deductCredits = async (memberID, credits, spendingType) => {
    let updated_at = moment().format("YYYY-MM-DD HH:mm:ss");
    let walletResult = await mongoose.update("medi_member_wallet", 
        {"member_id": memberID},
        (spendingType == "medical" ? {$inc:{medical_balance: (parseFloat(credits) * -1)}, updated_at: updated_at} : {$inc:{wellness_balance: (parseFloat(credits) * -1)}, updated_at: updated_at})     
    );

    console.warn('walletResult', walletResult)
    return walletResult;
}

const addCredits = async (memberID, credits, typeOfbalance) => {
    console.log('memberID', memberID);
    console.log('credits', credits);
    console.log('typeOfbalance', typeOfbalance);
    let updated_at = moment().format("YYYY-MM-DD HH:mm:ss");
    let walletResult = await mongoose.update("medi_member_wallet", 
        {"member_id":  memberID},
        (typeOfbalance == "medical" ? {$inc:{medical_balance: (parseFloat(credits))}, updated_at: updated_at} : {$inc:{wellness_balance: (parseFloat(credits))}, updated_at: updated_at}) 
    );
      
    console.log('walletResult', walletResult);
    return walletResult;
}

const createWallet = async (data) => {
    console.warn('test crate wallet')
    // let check = await mongoose.countCollection("medi_member_wallet", {member_id: data.member_id});
    // console.log('check', check);
    // if(check <= 0)
    // {
    console.warn('test crate wallet insert')
        let walletResult = await mongoose.insertOne(
            "medi_member_wallet", data);
        
            console.log('walletResult', walletResult);

        if(walletResult)
        {
            return walletResult;
        }

        return false;
    // }

    return 0;
}

module.exports = {
    createWallet,
    addCredits,
    deductCredits
}
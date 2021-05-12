const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const { map } = require('p-iteration');
const moment = require('moment');

const deductCustomerCredits = async (customerWalletID, credits, typeOfbalance) =>
{

    let updated_at = moment().format("YYYY-MM-DD HH:mm:ss");
    let walletResult = await mongoose.update("medi_customer_wallets", 
        {"_id": customerWalletID},
        (typeOfbalance=="medical" ? {$inc:{medical_balance: (parseFloat(credits) * -1)}, updated_at: updated_at} : {$inc:{wellness_balance: (parseFloat(credits) * -1)}, updated_at: updated_at})     
    );

    console.warn('walletResult',customerWalletID)
    
    return walletResult;
}

module.exports = {
    deductCustomerCredits
}
require('express-async-errors');
const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const moment = require('moment');
const _ = require('lodash');

const getEmployeeTransactions = async (member_id, start_date, end_date) => {
    console.log('member_id', member_id)
    console.log('start_date', start_date)
    console.log('end_date', end_date)
    let ids = await mongoose.getIds('medi_member_covered_dependents', { owner_id: member_id }, 'member_id');

    var temp_trans_lite_plan = await mongoose.aggregation('medi_member_in_network_transactions',
        [
            {
                $match: {
                    member_id: {
                        $in: ids
                    },
                    deleted: 0,
                    paid_status: 1,
                    lite_plan_enabled: 1,
                    created_at: {
                        $gte: start_date,
                        $lte: end_date
                    }
                }
            },
            {$sort:{created_at: -1}},
        ]
    );

    var temp_trans = await mongoose.aggregation('medi_member_in_network_transactions',
        [
            {
                $match: {
                    member_id: {
                        $in: ids
                    },
                    deleted: 0,
                    paid_status: 1,
                    credit_cost: {
                        $gt: 0
                    },
                    created_at: {
                        $gte: start_date,
                        $lte: end_date
                    }
                }
            },
            {$sort:{created_at: -1}},
        ]
    );
    // return {temp_trans_lite_plan: temp_trans_lite_plan, temp_trans: temp_trans};
    let results = await _.merge(temp_trans_lite_plan, temp_trans);
    return results;
}

const tranfereMemberTransaction = async (member_id, transactions, start, customer_id) => {
    let createdAt = moment().format("YYYY-MM-DD HH:mm:ss");
    let updatedAt = createdAt;

    for(var t = 0; t < transactions.length; t++) {
        let transaction_invoice = await mongoose.fetchOne("medi_spending_invoice_in_network_transactions", { in_network_transaction_id: transactions[t].in_network_transaction_id}); 
        console.log('transaction_invoice', transaction_invoice)
        if(transaction_invoice) {
            // delete transaction invoice
            await mongoose.remove("medi_spending_invoice_in_network_transactions", { _id: transaction_invoice._id });
            let transfer_spending_invoice = await mongoose.fetchOne("medi_customer_spending_invoices", { customer_id: customer_id, start_date: start });
            if(transfer_spending_invoice) {
                // insert
                let spending_invoice_in_network_transaction_id = await global_helper.getId('medi_spending_invoice_in_network_transactions', 'spending_invoice_in_network_transaction_id');
                let result = await mongoose.insertOne("medi_spending_invoice_in_network_transactions", { spending_invoice_in_network_transaction_id: spending_invoice_in_network_transaction_id, customer_spending_invoice_id: transfer_spending_invoice.customer_spending_invoice_id, created_at: createdAt, updated_at: updateAt });
                console.log('medi_spending_invoice_in_network_transactions', result);
            }
        }
    }

    return true;
}

module.exports = {
    getEmployeeTransactions,
    tranfereMemberTransaction
};

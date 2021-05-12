require('express-async-errors');
const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);
const { map } = require('p-iteration');
const _ = require('lodash');
// const wallet = require('./wallet.helper');
const format = require('format-number');
const moment = require('moment');
const ucwords = require('ucwords');

const getInvoiceSpending = async (invoiceID, fields) =>  {


    let data = await mongoose.fetchOne("medi_customer_spending_invoices", {customer_spending_invoice_id: invoiceID});
    let consultationAmountDue = 0;
    let amountDue = 0;

    let results = await getTotalCreditsInNetworkTransactions(data.customer_spending_invoice_id, data.customer_id, fields);
    let companyDetails = await mongoose.fetchOne("medi_customer_business_information", {customer_id: data.customer_id});
   
    let litePlan = ((parseInt(data.lite_plan) == 1 || results.consultation_status) ? true : false);
   

    if(litePlan)
    {
        let consultationAmountDueTemp = await mongoose.aggregation("medi_member_in_network_transactions", [

            {   
                $lookup:{
                    from: "medi_spending_invoice_in_network_transactions",
                    localField : "in_network_transaction_id",
                    foreignField : "in_network_transaction_id",
                    as : "medi_spending_invoice_in_network_transactions"
                },
            },  
            {   
                $unwind: "$medi_spending_invoice_in_network_transactions" 
            },
            {   
                $match: { 
                    $and: [
                        {"medi_spending_invoice_in_network_transactions.status": 0},
                        {"medi_spending_invoice_in_network_transactions.customer_spending_invoice_id": data.customer_spending_invoice_id},
                        {"deleted": 0},
                        {"paid_status": 1},
                        {"lite_plan_enabled": 1},
                    ] 
                }
            },
            // {   $group: { 
            //         _id: null, 
            //         total: {
            //             $sum: "consultation_fees"
            //         }
            //     }
            // },
            // {   $project: { 
            //         $sum: ["total"]
            //     } 
            // }
        ])
        await map(consultationAmountDueTemp, element => {
            console.log('element', element.consultation_fees)
            consultationAmountDue += parseFloat(element.consultation_fees)
        })
        // consultationAmountDue = _.uniq(consultationAmountDue, data => data.consultation_fees);
        // consultationAmountDue = consultationAmountDue.length > 0 ? consultationAmountDue = consultationAmountDue[0].total : 0;
        // console.log('consultationAmountDue', consultationAmountDue)
    }


    let latestTrail = null;
    let diffDays = 0;

    await map(data.trail_transaction, async element => {
        if(latestTrail == null)
        {
            latestTrail = element;
        }
        else
        {
            diffDays = moment(new Date(latestTrail.transaction_date)).diff(moment(new Date(element.transaction_date)).format("YYYY-MM-DD"),'days');
            if(diffDays <= 0){
                element.paid_amount = parseFloat(latestTrail.paid_amount) + parseFloat(element.paid_amount);
                latestTrail = element;
            }
        }
    });

    if(parseInt(data.payment_status) == 1)
    {
        amountDue = parseFloat(latestTrail.paid_amount) - (parseFloat(results.credits) + parseFloat(results.total_consultation));
    }
    else
    {
        amountDue = (parseFloat(results.credits) + parseFloat(results.total_consultation));
    }
    
    return {
        company: ucwords(companyDetails.company_name),
        company_address: ucwords(companyDetails.company_address),
        statement_contact_email: data.billing_information.contact_email,
        statement_contact_name: ucwords(data.billing_information.contact_name),
        statement_contact_number: data.billing_information.contact_number,
        customer_id: data.customer_id,
        statement_date: moment(new Date(data.invoice_date)).format("YYYY-MM-DD"),
        statement_due: moment(new Date(data.invoice_due_date)).format("YYYY-MM-DD"),
        statement_start_date: moment(new Date(data.start_date)).format("YYYY-MM-DD"),
        statement_end_date: moment(new Date(data.end_date)).format("YYYY-MM-DD"),
        start_date: moment(new Date(data.start_date)).format("YYYY-MM-DD"),
        end_date: moment(new Date(data.end_date)).format("YYYY-MM-DD"),
        period: moment(new Date(data.start_date)).format("YYYY-MM-DD") + ' - ' + moment(new Date(data.end_date)).format("YYYY-MM-DD"),
        statement_id: data.customer_spending_invoice_id,
        statement_number: data.invoice_number,
        statement_status: data.status,
        statement_total_amount: parseFloat(results.credits) + parseFloat(results.total_consultation),
        total_in_network_amount: results.credits,
        statement_amount_due: amountDue,
        consultation_amount_due: consultationAmountDue,
        in_network: results.transactions,
        paid_date: latestTrail.transaction_date ? moment(new Date(latestTrail.transaction_date)).format("YYYY-MM-DD") : null,
        payment_remarks: latestTrail.remarks,
        payment_amount: latestTrail.paid_amount,
        lite_plan: litePlan,
        total_consultation: results.total_consultation
    };
}

const getTotalCreditsInNetworkTransactions = async (invoiceID, customerID, fields) =>
{
    // SpendingInvoiceTransactions
	// protected $table = 'spending_invoice_transactions';
    // protected $guarded = ['spending_invoice_transaction_id'];

    let totalCredits = 0;
    let transactionDetails = new Array();
    let totalConsultation = 0;
    let inNetworkTransactions = 0;
    let consultationStatus = false;
    let mednefitsFee = 0;
    let healthProviderStatus = false;

    let consultationCash = false;
    let consultationCredits = false;
    let serviceCash = false;
    let serviceCredits = false;
    let logsLitePlan = null;
    let mednefitsCredits = 0;
    let cash = 0;
    let procedure = "";
    let clinicName = "";
    let receiptStatus = false;
    let paymentType = "Cash";
    let transactionType = "cash";
    let subAccount = null;
    let subAccountType = null;
    let ownerID = null;
    let dependentRelationship = null;

    let transactionInvoices = await mongoose.fetchMany("medi_spending_invoice_in_network_transactions", {
        customer_spending_invoice_id: invoiceID
    });

    await map(transactionInvoices, async transaction =>  {
        mednefitsFee = 0;
        var trans = await mongoose.fetchOne("medi_member_in_network_transactions",{in_network_transaction_id: transaction.in_network_transaction_id, paid_status: 1, refunded: 0});
        

        if(trans != null)
        {
            consultationCash = false;
            consultationCredits = false;
            serviceCash = false;
            serviceCredits = false;

            if(parseInt(trans.deleted) == 0)
            {
                inNetworkTransactions = inNetworkTransactions + parseFloat(trans.credit_cost);

                if(parseInt(trans.lite_plan_enabled) == 1) {
                    consultationStatus = true;

                    logsLitePlan = await mongoose.fetchOne("medi_member_wallet_history",{
                        id: transaction.in_network_transaction_id,
                        wallet_type: (trans.spending_type == "medical" ? "medical" : "wellness")
                    });

                    if(logsLitePlan)
                    {
                        if(parseFloat(trans.credit_cost) >= 0 && parseFloat(trans.lite_plan_use_credits) == 0)
                        {
                            totalConsultation = totalConsultation + parseFloat(logsLitePlan.credit);
                            consultationCredits = true;
                            serviceCredits = true;
                        }
                        else if(parseFloat(trans.procedure_cost) && parseFloat(trans.lite_plan_use_credits) == 1)
                        {
                            totalConsultation = totalConsultation + parseFloat(logsLitePlan.credit);
                            consultationCredits = true;
                            serviceCredits = true;
                        }
                        else{
                            totalConsultation = totalConsultation + parseFloat(trans.consultation_fees);
                        }
                    }
                    else{
                        totalConsultation = totalConsultation + parseFloat(trans.consultation_fees);
                    }
                }

                if(fields)
                {
                    if(parseFloat(trans.credit_cost) > 0)
                    {
                        mednefitsCredits = parseFloat(trans.credit_cost);
                        cash = "0.00";
                    }
                    else
                    {
                        mednefitsCredits = "0.00";
                        cash = parseFloat(trans.procedure_cost);
                    }

                    let imageReceipts = await mongoose.fetchMany("medi_in_network_transaction_receipt", {in_network_transaction_id: trans.in_network_transaction_id});
                    let clinic = await mongoose.fetchOne("medi_health_providers", {
                        provider_id: trans.provider_id
                    });
                    let clinicType = await mongoose.fetchOne("medi_health_provider_types", {provider_type_id: clinic.provider_type_ids});
                    let customer = await mongoose.fetchOne("medi_members", {member_id: trans.member_id});
                    let procedureTemp = "";
                    let services = "";

                    if((trans.procedure_ids).length > 0)
                    {
                    
                        let seviceList = await mongoose.aggregation("medi_health_provider_services",[
                            {
                                $match: {
                                    provider_service_id: {
                                        $in: trans.procedure_ids
                                        }
                                    }
                            }
                        ]);

                        _.each(seviceList, function(service, key){
                            if(key == seviceList.length - 2)
                            {
                                procedureTemp = procedureTemp + ucwords(service.service_name) + ' and ';
                            }
                            else
                            {
                                procedureTemp = procedureTemp + ucwords(service.service_name) + ',';
                            }
                            procedure = procedureTemp.replace(/,\s*$/, "");
                        });
                        clinicName = ucwords(clinicType.service_name) + ' - ' + procedure;
                    }
                    else
                    {
                        let seviceList = await mongoose.aggregation("medi_health_provider_services",[
                            {
                                $match: {
                                    provider_service_id: {
                                        $in: trans.procedure_ids
                                        }
                                    }
                            },
                            {
                                $limit:1
                            }
                        ]);
                        if(seviceList) {
                            procedure = ucwords(seviceList[0].service_name);
                            clinicName = ucwords(clinicType.name) + ' - ' + procedure;
                        } else {
                            clinicName = ucwords(clinicType.name);
                        }
                    }


                    let numReceipts = await mongoose.countCollection("medi_in_network_transaction_receipt", {in_network_transaction_id: trans.in_network_transaction_id});
    
                    receiptStatus = false;
                    if(numReceipts > 0)
                    {
                        receiptStatus = true;
                    }

                    let totalAmount = trans.credit_cost;
                    let procedureCost = trans.procedure_cost;
                    let treatment = trans.credit_cost;
                    let consultation = 0;

                    if(parseInt(trans.health_provider_done) == 1)
                    {
                        receiptStatus = true;
                        healthProviderStatus = true;
                        paymentType = "Cash";
                        transactionType = "cash";

                        if(parseInt(trans.lite_plan_enabled) == 1)
                        {
                            totalAmount = trans.co_paid_amount;
                            procedureCost = "0.00";
                            treatment = 0;
                            consultation = trans.co_paid_amount;
                        }
                    }
                    else
                    {
                        paymentType = "Mednefits Credits";
                        transactionType = "credits";
                        healthProviderStatus = false;

                        if(parseInt(trans.lite_plan_enabled) == 1)
                        {
                            totalAmount = parseFloat(trans.credit_cost) + parseFloat(trans.co_paid_amount);
                            treatment = trans.credit_cost;
                            consultation = trans.co_paid_amount;
                        }
                    }

                    let clinic_Type = await mongoose.aggregation("medi_health_provider_types",[
                        {
                            $match: {
                                provider_type_id: {
                                    $in: clinic.provider_type_ids
                                    }
                                }
                        },
                        {
                            $limit:1
                        }
                    ]);

                    clinicType = clinic_Type[0];

                    let type = "";
                    let clinicTypeName = "";
                    let image = "";
                    let findHead = clinicType;

                    if(parseInt(clinicType.service_head) != 1)
                    {
                        findHead = await mongoose.fetchOne(
                            "medi_health_provider_types",
                            { provider_type_id: clinicType.service_sub }
                        );
                    }

                    if(findHead.name == "General Practitioner")
                    {
                        type = "general_practitioner";
                        clinicTypeName = "General Practitioner";
                        image = "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515238/tidzdguqbafiq4pavekj.png";
                    }
                    else if(findHead.name == "Dental Care")
                    {
                        type = "dental_care";
                        clinicTypeName = "Dental Care";
                        image = "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515231/lhp4yyltpptvpfxe3dzj.png";
                    }
                    else if(findHead.name == "Traditional Chinese Medicine")
                    {
                        type = "tcm";
                        clinicTypeName = "Traditional Chinese Medicine";
                        image = "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515256/jyocn9mr7mkdzetjjmzw.png";
                    }
                    else if(findHead.name == "Health Screening")
                    {
                        type = "health_screening";
                        clinicTypeName = "Health Screening";
                        image = "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515243/v9fcbbdzr6jdhhlba23k.png";
                    }
                    else if(findHead.name == "Wellness")
                    {
                        type = "wellness";
                        clinicTypeName = "Wellness";
                        image = "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515261/phvap8vk0suwhh2grovj.png";
                    }
                    else if(findHead.name == "Health Specialist")
                    {
                        type = "health_specialist";
                        clinicTypeName = "Health Specialist";
                        image = "ttps://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515247/toj22uow68w9yf4xnn41.png";
                    }

                    if(customer.member_type == "dependents")
                    {
                        let tempSub = await mongoose.fetchOne("medi_member_covered_dependents", {
                            member_id: customer.member_id
                        });

                        let tempAccount = await mongoose.fetchOne("medi_members", {member_id: tempSub.owner_id});
                        subAccount = ucwords(tempAccount.fullname);
                        subAccountType = "dependent";
                        ownerID = tempSub.member_id;
                        dependentRelationship = ucwords(tempSub.relationship);
                    }
                    else
                    {
                        subAccount = false;
                        subAccountType = false;
                        ownerID = customer.member_id;
                        dependentRelationship = false;
                    }

                    let transactionID = ((trans.in_network_transaction_id).toString()).padStart(6,0)
                    transactionDetails.push({
                        clinic_name: clinic.name,
                        clinic_image: clinic.provider_image,
                        total_amount:  totalAmount,
                        procedure_cost: procedureCost,
                        clinic_type_and_service: clinicName,
                        service: procedure,
                        clinic_type_name: clinicTypeName,
                        date_of_transaction :  date('d F Y, h:ia', strtotime($trans['date_of_transaction'])),
                        member:  ucwords(customer.name),
                        transaction_id:  ((clinic.name).padStart(6,0)).toUpperCase() + transactionID.toString(),
                        receipt_status:  receiptStatus,
                        health_provider_status :  healthProviderStatus,
                        user_id:  trans.member_id,
                        type:  'In-Network',
                        month:  moment(new Date(trans.date_of_transaction)).format("MMMM"),//date('M', strtotime($trans['date_of_transaction'])),
                        day:  moment(new Date(trans.date_of_transaction)).format("DD"),//date('d', strtotime($trans['date_of_transaction'])),
                        time:  moment(new Date(trans.date_of_transaction)).format("hh:mm A"),//date('h:ia', strtotime($trans['date_of_transaction'])),
                        clinic_type:  type,
                        clinic_type_name  :  clinicTypeName,
                        clinic_type_image :  image,
                        owner_account: subAccount,
                        owner_id: ownerID,
                        sub_account_user_type : subAccountType,
                        co_paid: transco_paid_amount,
                        payment_type: paymentType,
                        nric:  customer.nric,
                        mednefits_credits: mednefitsCredits,
                        cash: cash,
                        consultation_credits : consultationCredits,
                        consultation: consultation,
                        service_credits:  serviceCredits,
                        transaction_type:  transactionType,
                        treatment: treatment,
                        amount: treatment,
                        spending_type: trans.spending_type,
                        dependent_relationship	: dependentRelationship,
                        lite_plan: (parseInt(trans['lite_plan_enabled']) == 1 ? true : false)
                    }); 
                }
            }
        }
    });

    if(fields) {
        let entries = Object.entries(transactionDetails);
        let sorted = entries.sort((a, b) => a[1].bar - b[1].bar);
       transactionDetails = sorted.map((x) => x[1] );
    }

    return {
        credits :  inNetworkTransactions,
        consultation_status	:  consultationStatus,
        total_consultation	:  totalConsultation, 
        transactions :  transactionDetails
    };
}


module.exports = {
    getInvoiceSpending
}
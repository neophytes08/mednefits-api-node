require('express-async-errors');
require('dotenv').config();
const fs = require('fs');
const APPPATH = require('app-root-path');
const validate = require('./claim.validator');
const config = require(`${APPPATH}/config/config`);
const sha256 = require('sha256');
const moment = require('moment');
const { map } = require('p-iteration');
const claimModel = require('./claim.model');
const ucfirst = require('ucfirst');
const format = require('format-number');
const PlanHelper = require(`${APPPATH}/server/helpers/plan.helper.js`);
const clinicHelper = require(`${APPPATH}/server/helpers/clinic.helper.js`);
const eClaimHelper = require(`${APPPATH}/server/helpers/e_claim.helper.js`);
const _ = require('lodash');
const ucwords = require('ucwords');

const eClaimActivity = async(req, res, next) => {
	let data = req.query;

	if(!data.start || !data.end) {
		return res.status(400).json({ status: false, message: 'Start Date or End Date is required.' });
	}

	if(!data.spending_type) {
		return res.status(400).json({ status: false, message: 'Spending Type is required.' });
	}

	let options = {
	  page: req.query.page ? req.query.page : 1,
	  limit: req.query.limit ? req.query.limit : 10,
	};

	let customerID = parseInt(data.customer_id);
  let start = moment(data.start).format('YYYY-MM-DD');
  let end = moment(data.end).add(59, 'minutes').format('YYYY-MM-DD HH:mm:ss');
  let outOfNetworkTransactionDetails = [];
  let out_of_network_spent = 0;
  let total_claim = 0;
  let total_pending = 0;
  let total_approved = 0;
  let total_rejected = 0;

  if(data.member_id) {
  	console.log('hello paginate')
  	members = await claimModel.paginate('medi_company_members', { member_id: data.member_id }, options);
  } else {
  	members = await claimModel.paginate('medi_company_members', { customer_id: customerID }, options);
  }

  for(var a = 0; a < members.docs.length; a++) {
  	let id = members.docs[a].member_id;

  	let user_ids = await claimModel.getIds('medi_member_covered_dependents', { 'owner_id': id }, 'member_id')
    user_ids.push(id);

    // get transactions in out-network
	  let out_networks = await claimModel.aggregation('medi_out_of_network_transactions',
	    [
	    {
        $addFields: {
            convertedDate: { $toDate: "$created_at" }
          }
        },
	      {
	          $match: {
	              member_id: {
	                  $in: user_ids
	              },
	              spending_type: data.spending_type,
	              created_at: {
                	$gte: start,
                	$lte: end
                }
	          }
	      },
	      {$sort:{created_at: -1}}
	    ]
	  );

	  for(var e = 0; e < out_networks.length; e++) {
	  	total_claim += out_networks[e].claim_amount;
		  let e_claim_data = new Object();
		  let id = "MN" + (out_networks[e].out_of_network_transaction_id.toString()).padStart(6,0);
		  let docs = await claimModel.getMany('medi_out_of_network_files', { out_of_network_id: out_networks[e].out_of_network_transaction_id } );
		  let status_text = null;
		  let doc_files = new Array();
		  let member = await claimModel.getOne('medi_members', { member_id: out_networks[e].member_id });

		  for(var d = 0; d < docs.length; d++) {
	      let file = new Object();
	      file.out_of_network_file_id = docs[d].out_of_network_file_id;
	      file.out_of_network_file_id = docs[d].out_of_network_id;
	      file.file_type = docs[d].file_type;

	      if(docs[d].file_type == "pdf" || docs[d].file_type == "xls" || docs[d].file_type == "xlsx") {
	          file.file_url = await eClaimHelper.getPresignedUrl(docs[d].file_name);
	      } else {
	          file.file_url = docs[d].file_name;
	      }

	      doc_files.push(file);
		  }

		  if(out_networks[e].claim_status == 0) {
		      status_text = 'Pending';
		      total_pending += parseFloat(out_networks[e].claim_amount);
		  } else if(out_networks[e].claim_status == 1) {
		      status_text = 'Approved';
		      total_approved += parseFloat(out_networks[e].claim_amount);
		  } else if(out_networks[e].claim_status == 2) {
		      status_text = 'Rejected';
		      total_rejected += parseFloat(out_networks[e].claim_amount);
		  } else {
		      status_text = 'Pending';
		      total_pending += parseFloat(out_networks[e].claim_amount);
		  }

		  e_claim_data.transaction_id = id;
		  e_claim_data.member = member.fullname;
		  e_claim_data.merchant = out_networks[e].provider;
		  e_claim_data.service = out_networks[e].claim_type;
		  e_claim_data.amount = out_networks[e].claim_amount;
		  e_claim_data.visit_date = out_networks[e].visit_date;
		  e_claim_data.claim_date = out_networks[e].created_at;
		  e_claim_data.time = out_networks[e].visit_time;
		  e_claim_data.files = out_networks[e].doc_files;
		  e_claim_data.rejected_reason = out_networks[e].status_reason;
		  e_claim_data.rejected_date = out_networks[e].status_date != "Invalid date" ? out_networks[e].status_date : null;
		  e_claim_data.spending_type = out_networks[e].spending_type;
		  e_claim_data.approved_date = out_networks[e].status_date != "Invalid date" ? out_networks[e].status_date : null;
		  e_claim_data.remarks = out_networks[e].status_reason;
		  e_claim_data.status = out_networks[e].claim_status;
		  e_claim_data.status_text = status_text;
		  outOfNetworkTransactionDetails.push(e_claim_data);
		}
  }

  delete members.data;
  let temp_data = {
  	total_claim: total_claim,
  	total_approved: total_approved,
  	total_pending: total_pending,
  	total_rejected: total_rejected,
  	out_of_network_transactions: outOfNetworkTransactionDetails,
  	spending_type: data.spending_type,
  	current_page: members.page,
  	total: members.totalPages,
  	nextPage: members.nextPage,
  	prevPage: members.prevPage,
  	limit: members.limit

  }

  return res.json(temp_data)
}

const uploadEclaimReceipt = async(req, res, next) => {
	console.log('req', req)
	let data = req.body;
	console.log('data', data)
	// if(!data.id) {
	// 	return res.status(400).json({ status: false, message: 'id is required.' });
	// }

	// let e_claim = await claim.getOne('medi_out_of_network_transactions', { out_of_network_transaction_id: data.id });

	// if(!e_claim) {
	// 	return res.status(404).json({ status: false, message: 'Out of Network data does not exist' });
	// }

	// return res.json(e_claim);

	// req.fileExtension = ['xlsx','xlsm','xls','pdf', 'jpeg', 'png', 'jpg', 'PNG', 'JPEG', 'JPG']
 //  config.uploadTemp.single('file')(req, {}, async function (err) {
	// console.log('err', err)
	// console.log('req.serverFileName', req.serverFileName);
	// console.log('req.mimetype', req.mimetype);
 //    if (err)
 //    {
 //      return res.json({
 //        status: false,
 //        message: 'File not uploaded.',
 //        errorMessage: err
 //      })
 //    }
 //    else if (!req.fileIsAllowed) {
 //    	return res.json({
 //        status: false,
 //        message: 'File not authorized format.',
 //        errorMessage: err
 //    	})
 //    }

 //  });

 return res.send('ok');
}

const revertToPending = async(req, res, next) => {
	let data = req.body;

	if(!data.id) {
		return res.status(400).json({ status: false, message: 'id is required.' });
	}

	let e_claim = await claimModel.getOne('medi_out_of_network_transactions', { out_of_network_transaction_id: data.id });

	if(!e_claim) {
		return res.status(404).json({ status: false, message: 'Out of Network data does not exist' });
	}

	let result = await claimModel.getOne('medi_out_of_network_transactions', { out_of_network_transaction_id: data.id });

	if(result.claim_status == 0) {
		return res.status(400).json({ status: false, message: 'Out of Network data is already in pending status' });
	}

	// revert to pending
	let update = await claimModel.updateOne('medi_out_of_network_transactions', { out_of_network_transaction_id: data.id }, { claim_status: 0 });

	return res.json(update);
}

module.exports = {
	eClaimActivity,
	uploadEclaimReceipt,
	uploadEclaimReceipt,
	revertToPending
}
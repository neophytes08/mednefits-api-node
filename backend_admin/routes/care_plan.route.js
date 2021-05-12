const express = require('express');
const router = express.Router();

const APPPATH = require('app-root-path');
// const config = require(`${APPPATH}/config/config`);
// const companyValidator = require(`${APPPATH}/server/components/company/company.validator`);
const carePlanController = require(`${APPPATH}/server/components/care_plan/care_plan.controller`);

/* create care plan list data. */
router.post('/create_care_plan_list', function(req, res, next) {
  try {
    carePlanController.createCarePlanList(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});


module.exports = router;

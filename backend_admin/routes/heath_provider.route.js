const express = require('express');
const router = express.Router();

const APPATH = require('app-root-path');
// const companyValidator = require(`${APPATH}/server/components/company/company.validator`);
const healthProviderController = require(`${APPATH}/server/components/heath_provider/heath_provider.controller`);



/* CREATE clinic details. */
router.post('/create_heath_provider', function(req, res, next) {
  try {
    healthProviderController.createHealthProvider(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

/* create clinic time lists*/
router.post('/create_heath_provider_manage_times', function(req, res, next) {
  try {
    healthProviderController.createManageTime(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

/* create clinic peak time lists*/
router.post('/create_heath_provider_peak_times', function(req, res, next) {
  try {
    healthProviderController.createHealthProviderPeaks(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

/* create clinic holiday peak time lists*/
router.post('/create_heath_provider_holiday_peak_times', function(req, res, next) {
  try {
    healthProviderController.createHealthHolidayPeaks(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

/* create clinic professional */
router.post('/create_heath_provider_professional', function(req, res, next) {
  try {
    healthProviderController.createHealthProviderProfessional(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

/* create clinic service */
router.post('/create_heath_provider_service', function(req, res, next) {
  try {
    healthProviderController.createHealthProviderServices(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

/* create/assign clinic professiona service */
router.post('/create_heath_provider_professional_service', function(req, res, next) {
  try {
    healthProviderController.createProfessionalService(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

module.exports = router;

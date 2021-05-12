const express = require('express');
const router = express.Router();

const APPATH = require('app-root-path');
// const clinicTypesValidator = require(`${APPATH}/server/components/clinic_types/clinic_types.validator`);
const clinicTypesController = require(`${APPATH}/server/components/clinic_types/clinic_types.controller`);

/* Create Clinic Type. */
router.post('/create_clinic_type', function(req, res, next) {
  try {
    clinicTypesController.createClinicType(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

/* Get Clinic Type Lists */
router.get('/get_clinic_types', function(req, res, next) {
  try {
  	console.log('/get_clinic_types');
    clinicTypesController.getClinicTypes(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

module.exports = router;

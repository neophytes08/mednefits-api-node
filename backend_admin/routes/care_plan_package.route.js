const express = require('express');
const router = express.Router();

const APPATH = require('app-root-path');
// const clinicTypesValidator = require(`${APPATH}/server/components/clinic_types/clinic_types.validator`);
const carePlanPackageController = require(`${APPATH}/server/components/care_plan_packages/care_plan_package.controller`);

/* Create Care Plan Package. */
router.post('/create_care_plan_package', function(req, res, next) {
  try {
    carePlanPackageController.createCarePlanPackage(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

/* Create Care Plan Package Bundle. */
router.post('/create_care_plan_package_bundle', function(req, res, next) {
  try {
    carePlanPackageController.createPackageBundle(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

module.exports = router;

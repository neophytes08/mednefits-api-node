const express = require('express');
const router = express.Router();
const APPPATH = require('app-root-path');
const migrationController = require(`${APPPATH}/server/components/data_migration/data_migration.controller`);

/* create data hr migration. */
router.post('/create_hr_migration', function(req, res, next) {
  try {
    migrationController.createHrMigration(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

/* create data benefits dependencies migration. */
router.post('/create_benefits_dependencies', function(req, res, next) {
  try {
    migrationController.createBenefitsDependencies(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

/* create member user data migration. */
router.post('/create_employee_member_data_migration', function(req, res, next) {
  try {
    migrationController.createEmployeeMemberDataMigration(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

/* create dependent user data migration. */
router.post('/create_dependent_member_data_migration', function(req, res, next) {
  try {
    migrationController.createDependentMigration(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

/* create clinic type data migration. */
router.post('/create_types_migration', function(req, res, next) {
  try {
    migrationController.createHealthTypesMigration(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

/* create clinic data migration. */
router.post('/create_clinic_migration', function(req, res, next) {
  try {
    migrationController.createClinicMigration(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});


module.exports = router;

const express = require('express');
const router = express.Router();
const APPPATH = require('app-root-path');
const employeeController = require(`${APPPATH}/server/components/employees/employees.controller`);
const homeController = require(`${APPPATH}/server/components/home/home.controller`);
const activityController = require(`${APPPATH}/server/components/activity/activity.controller`);
const transactionController = require(`${APPPATH}/server/components/transactions/transaction.controller`);

// get employee details and packages
router.get('/employee_care_package', function(req, res, next) {
  try {
    homeController.getEmployeeCarePackage(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

// get employee ecard details and packages
router.get('/employee_e_card_details', function(req, res, next) {
  try {
    homeController.getEmployeeCarePackage(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

// get employee current spending
router.get('/employee_current_spending', function(req, res, next) {
  try {
    homeController.getEmployeeCurrentSpending(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

// get employee activity transactions
router.get('/get_activity', function(req, res, next) {
  try {
    activityController.getActivity(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

// get  clinic category List
router.get('/clinic_category_list', function (req, res, next) {
  try {
    employeeController.getClinicCategoryList(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});
// search clinic
router.get('/search_clinic', function (req, res, next) {
  try {
    employeeController.searchClinic(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});
// get employee activity transactions
router.get('/member_profile', function(req, res, next) {
  try {
    employeeController.getMemberProfile(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});
// get employee activity transactions
router.get('/medical_wellness_list', function(req, res, next) {
  try {
    employeeController.getMedicalWellnessList(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

// employee update
router.post('/update_profile', function (req, res, next) {
  try {
    employeeController.updateUserProfile(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

// create allergy data
router.post('/new_allergy', function (req, res, next) {
  try {
    employeeController.newAllergy(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

// create medication data
router.post('/new_medication', function (req, res, next) {
  try {
    employeeController.newMedication(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

// create condition data
router.post('/new_condition', function (req, res, next) {
  try {
    employeeController.newCondition(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

// create medical history data
router.post('/new_medical_history', function (req, res, next) {
  try {
    employeeController.newMedicalHistory(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

// password reset
router.post('/reset_password', function (req, res, next) {
  try {
    employeeController.resetPassword(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});



module.exports = router;

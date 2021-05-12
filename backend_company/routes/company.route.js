const express = require('express');
const router = express.Router();

const APPPATH = require('app-root-path');
// const config = require(`${APPPATH}/config/config`);
const companyController = require(`${APPPATH}/server/components/company/company.controller`);
const introductionController = require(`${APPPATH}/server/components/company/introduction.controller`);
const benefitsDashboardController = require(`${APPPATH}/server/components/company/benefits_dashboard.controller`);
const employeeController = require(`${APPPATH}/server/components/company/employee.controller`);
const employeeAllocationController = require(`${APPPATH}/server/components/company/employee_allocation.controller`);
const activityController = require(`${APPPATH}/server/components/company/activity.controller`);
const accountController = require(`${APPPATH}/server/components/company/account_and_billing.controller`);
const claimController = require(`${APPPATH}/server/components/claim/claim.controller`);

// test email
router.get('/test_email', function(req, res, next) {
  try {
    companyController.testEmail(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

router.get('/get_plan_status', function(req, res, next) {
  try {
    benefitsDashboardController.getPlanStatus(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});


router.get('/get_intro_overview', function(req, res, next) {
  try {
    benefitsDashboardController.getIntroOverview(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

router.get('/get_hr_session', function(req, res, next) {
  try {
    introductionController.getHRSession(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

router.get('/check_plan', function(req, res, next) {
  try {
    introductionController.checkPlan(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

router.post('/excel_enrollment', function(req, res, next) {
  try {
    companyController.excelEnrollment(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

router.post('/create_company', function(req, res, next) {
  try {
    companyController.createCompany(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

// router.post('/create_hr_company', function(req, res, next) {
//   try {
//     companyController.createHrCompany(req, res, next)
//   } catch (error) {
//     console.warn(error)
//   }
// });

router.post('/finish_enroll_employee', function(req, res, next) {
  try {
    companyController.finishEnrollEmployeeTier(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

router.post('/add_temp_employee', function(req, res, next) {
  try {
    companyController.addTempEmployee(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

router.get('/get_temp_enrollees', function(req, res, next) {
  try {
    companyController.getTempEnrollees(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

router.put('/update_employee_enrollment', function(req, res, next) {
  try {
    companyController.updatePlanTierEmployeeEnrollment(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});


router.delete('/remove_enrollee', function(req, res, next) {
  try {
    companyController.removeEnrollee(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

// get company info
router.get('/company_info', function(req, res, next) {
  try {
    companyController.getCompanyInfo(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

router.get('/get_total_members', function(req, res, next) {
  try {
    employeeController.getTotalMembers(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

router.get('/get_company_plan_date', function(req, res, next) {
  try {
    companyController.getCompanyCurrentPlanDates(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

router.get('/check_balance', function(req, res, next) {
  try {
    benefitsDashboardController.checkBalance(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

router.get('/get_dependent_status', function(req, res, next) {
  try {
    benefitsDashboardController.getDependentStatus(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

router.get('/task_list', function(req, res, next) {
  try {
    benefitsDashboardController.taskList(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

router.get('/get_current_plan_total_due', function(req, res, next) {
  try {
    benefitsDashboardController.getCurrentPlanTotalDue(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

router.get('/get_current_spending_total_due', function(req, res, next) {
  try {
    benefitsDashboardController.getCurrentSpendingTotalDue(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

router.get('/enrollment_progress', function(req, res, next) {
  try {
    benefitsDashboardController.enrollmentProgress(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

router.get('/company_details', function(req, res, next) {
  try {
    benefitsDashboardController.details(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

// allocate credits
router.post('/employee_allocate_credits', function(req, res, next) {
  try {
    employeeAllocationController.allocateEmployeeCredits(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

// employee lists
router.get('/employee_lists', function(req, res, next) {
  try {
    employeeController.employeeLists(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

// get employee dependent lists
router.get('/get_employee_dependents', function(req, res, next) {
  try {
    employeeController.getEmployeeDependents(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

// update employee details
router.put('/update_employee_details', function(req, res, next) {
  try {
    employeeController.updateEmployeeDetails(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

// company validate password
router.post('/company_validate_password', function(req, res, next) {
  try {
    employeeController.confirmPassword(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

// update member cap per visit
router.put('/update_employee_cap_per_visit', function(req, res, next) {
  try {
    employeeController.updateCapPerVisitEmployee(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

// update dependent details
router.put('/update_dependent_details', function(req, res, next) {
  try {
    employeeController.updateDependentDetails(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

// get company total credits allocation by date
router.get('/total_credits_allocation', function(req, res, next) {
  try {
    activityController.getCompanyTotalAllocation(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

// get company information
router.get('/get_company_information', function(req, res, next) {
  try {
    accountController.getCompanyCompanyInformation(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

// update company business contact
router.put('/update_company_business_contact', function(req, res, next) {
  try {
    accountController.updateCompanyBusinessContact(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

// update company business contact
router.put('/update_company_billing_contact', function(req, res, next) {
  try {
    accountController.updateCompanyBillingContact(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

// test
router.post('/test_add_balance', function(req, res, next) {
  try {
    companyController.testAddMemberBalance(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

// resend employee account
router.post('/resend_employee_account', function(req, res, next) {
  try {
    employeeController.resendEmployeeAccount(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

// create dependent account
router.post('/create_dependent_account', function(req, res, next) {
  try {
    employeeController.createDependentAccount(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

// get activity
router.get('/get_activity', function(req, res, next) {
  try {
    activityController.getHrActivity(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

// get activity
router.get('/get_activity_transactions', function(req, res, next) {
  try {
    activityController.getActivityTransactions(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

router.get('/get_home_details', function(req, res, next) {
  try {
    companyController.getNameUser(req, res, next)
  } catch (error) {
    console.log('error', error);
  }
});
// get e-claim activity
router.get('/get_e_claim_activity', function(req, res, next) {
  try {
    claimController.eClaimActivity(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

router.post('/edit_company_profile', function(req, res, next) {
  try {
    companyController.editCompanyProfile(req, res, next)
  } catch (error) {
    console.warn(error)

  }
});

router.post('/create_company_groups', function(req, res, next) {
  try {
    companyController.createCompanyGroups(req, res, next)
  } catch (error) {
    console.warn(error)

  }
});

router.get('/get_company_groups', function(req, res, next) {
  try {
    companyController.getCompanyGroups(req, res, next)
  } catch (error) {
    console.warn(error)

  }
});

router.get('/check_plan', function(req, res, next) {
  try {
    introductionController.checkPlan(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

router.get('/get_total_members', function(req, res, next) {
  try {
    employeeController.getTotalMembers(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

// updaload out-of-network
router.post('/upload_out_of_network_receipt', function(req, res, next) {
  try {
    claimController.uploadEclaimReceipt(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

router.put('/update_company_password', function(req, res, next) {
  try {
    companyController.updatePassword(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});
// revert to pending
router.post('/revert_out_of_network_to_pending', function(req, res, next) {
  try {
    claimController.revertToPending(req, res, next)
  } catch (error) {
    console.warn(error)
  }
});

router.get('/get_plan_invoice', function(req, res, next) {
  try {
    companyController.getPlanInvoice(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

router.get('/get_customer_active_plans', function(req, res, next) {
  try {
    companyController.getActivePlans(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

router.get('/get_spending_invoice_in_network_transactions', function(req, res, next) {
  try {
    companyController.getSpendingInvoiceInNetwork(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

router.get('/get_full_transactions', function(req, res, next) {
  try {
    employeeController.inNetworkOutNetworkFullTransactionList(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

router.get('/get_company_invoices_details', function(req, res, next) {
  try {
    companyController.getCompanyInvoicesDetails(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});


module.exports = router;

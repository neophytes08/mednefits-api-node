const express = require('express');
const router = express.Router();
const APPPATH = require('app-root-path');
const activityController = require(`${APPPATH}/server/components/activity/activity.controller`);

// get employee activity transactions
router.get('/get_activity', function(req, res, next) {
  try {
    activityController.getActivity(req, res, next);
  } catch (error) {
    console.warn(error)
  }
});

module.exports = router;

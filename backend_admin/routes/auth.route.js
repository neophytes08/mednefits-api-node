const express = require('express');
const router = express.Router();

const APPATH = require('app-root-path');
const authMiddleware = require(`${APPATH}/server/components/auth/auth.middleware.route`);
const authController = require(`${APPATH}/server/components/auth/auth.controller`);

/* GET home page. */
router.post('/signin', authMiddleware, function(req, res, next) {
    try {
        authController.login(req, res, next)
    } catch (error) {

    }
});

router.get('/test', authMiddleware, function(req, res, next) {
    try {
        authController.testModel(req, res, next)
    } catch (error) {

    }
});

module.exports = router;

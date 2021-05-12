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

router.get('/list_hr_company', authMiddleware, function(req, res, next){
    try {
        authController.listHrCompany(req, res, next)
    } catch (error) {

    }
})

router.post('/create_hr_company', authMiddleware, function(req, res, next) {
    try {
        authController.createHrCompany(req, res, next)
    } catch (error) {

    }
});

router.post('/delete_hr_company', authMiddleware, function(req, res, next) {
    try {
        authController.deleteHrCompany(req, res, next)
    } catch (error) {

    }
});

router.post('/forgot_password', authMiddleware, function(req, res, next) {
    try {
        authController.forgotPassword(req, res, next)
    } catch (error) {

    }
});

router.post('/reset_password', authMiddleware, function(req, res, next) {
    try {
        authController.resetPassword(req, res, next)
    } catch (error) {

    }
});

module.exports = router;

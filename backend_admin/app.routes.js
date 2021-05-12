const express = require('express');
const router = express.Router();
const authRouter = require('./routes/auth.route');
const companyRouter = require('./routes/company.route');
const clinicTypesRouter = require('./routes/clinic_types.route');
const healthProviderRouter = require('./routes/heath_provider.route');
const carePlanRouter = require('./routes/care_plan.route');
const carePlanPackageRouter = require('./routes/care_plan_package.route');
const migrationRouter = require('./routes/migration.route');

router.use('/login', authRouter);
router.use('/auth', authRouter);
router.use('/company', companyRouter);
router.use('/clinic_types', clinicTypesRouter);
router.use('/clinics', healthProviderRouter);
router.use('/care_plan', carePlanRouter);
router.use('/care_plan_package', carePlanPackageRouter);
router.use('/migration', migrationRouter);

module.exports = router

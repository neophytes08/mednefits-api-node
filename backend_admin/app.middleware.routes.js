const authMiddleware = require('./server/components/auth/auth.middleware.route.js');
const companyMiddleware = require('./server/components/company/company.middleware.route.js');
const clinicTypesMiddleware = require('./server/components/clinic_types/clinic_types.middleware.route.js');
const healthProviderMiddleware = require('./server/components/heath_provider/heath_provider.middleware.route.js');
const carePlanMiddleware = require('./server/components/care_plan/care_plan.middleware.route.js');
const carePlanPackageMiddleware = require('./server/components/care_plan_packages/care_plan_package.middleware.route.js');

let data = new Array();
data.push(authMiddleware);
data.push(companyMiddleware);
data.push(clinicTypesMiddleware);
data.push(healthProviderMiddleware);
data.push(carePlanMiddleware);
data.push(carePlanPackageMiddleware);

module.exports = data;

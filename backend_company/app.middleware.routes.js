const authMiddleware = require('./server/components/auth/auth.middleware.route.js');
const companyMiddleware = require('./server/components/company/company.middleware.route.js');

let data = new Array();
data.push(authMiddleware);
data.push(companyMiddleware);

module.exports = data;

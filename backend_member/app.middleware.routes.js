const authMiddleware = require('./server/components/auth/auth.middleware.route.js');
const employeeMiddleware = require('./server/components/employees/employees.middleware.route.js');
// const transactionMiddleware = require('./server/components/transactions/transaction.middleware.route.js');
// const activityMiddleware = require('./server/components/activity/activity.middleware.route.js');

let data = new Array();
data.push(authMiddleware);
data.push(employeeMiddleware);
// data.push(transactionMiddleware);
// data.push(activityMiddleware);
// console.log('data', data)
module.exports = data;

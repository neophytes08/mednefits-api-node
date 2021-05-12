try {
  var mysqlConfig = require("knex")({
    client: process.env.DB_CONNECTION,
    connection: {
      host: process.env.DB_HOST_WRITE,
      user: process.env.DB_USER_MYSQL,
      password: process.env.DB_PASSWORD_MYSQL,
      database: process.env.DB_DATABASE_MYSQL,
      charset: 'utf8',
      pool: { testOnBorrow: true }
    }
  });
} catch(error) {
  console.log('error', error)
}

module.exports = mysqlConfig;
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const serverRoutes = require('./app.routes');
const serverMiddleRoutes = require('./app.middleware.routes');
const bodyParser = require('body-parser');

const app = express();
global.app_root = __dirname;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");
app.set("view engine", "ejs");
app.use(logger());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));

app.use(cors());
// console.warn(serverMiddleRoutes)
app.use('/',serverMiddleRoutes);
app.use('/',serverRoutes);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  // res.json = () => {
    console.warn('error')
  // }
  return res.status(404).json({
    status: false,
    message: "Page not found."
  })
  // next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  console.warn('yow')
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  // res.render('error');
});

module.exports = app;

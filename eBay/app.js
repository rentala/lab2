var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var mlogger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var authentication = require('./routes/authentication.js');
var shopping = require('./routes/shopping.js');
var sell = require('./routes/sell.js')
var app = express();
var session = require("express-session");
var mysql = require("./routes/mysql.js");
var dbm = require("./routes/dbManager.js");
var bcrypt = require('bcrypt');
var winston = require('winston');
var Promise = require("bluebird");
var passport = require('passport');
var mongoose = require('mongoose');
var LocalStrategy = require('passport-local').Strategy;
var flash    = require('connect-flash');
const errorLogger = new (winston.Logger)({
  transports: [
    // colorize the output to the console
    new (winston.transports.File)({
      filename: './logs/errors.log'
    })
  ]
});
var configDB = require('./config/database.js');
var mongoStore = require("connect-mongo")(session);
var http = require('http')
/*app.use(sessions({
  cookieName: 'session', // cookie name dictates the key name added to the request object
  secret: 'cmpe273', // should be a large unguessable string
  duration: 24 * 60 * 60 * 1000, // how long the session will stay valid in ms
  activeDuration: 1000 * 60 * 5 // if expiresIn < activeDuration, the session will be extended by activeDuration milliseconds
}));*/
app.set('port', process.env.PORT || 4000);

mongoose.connect(configDB.url); // connect to our database
app.use(session({secret: 'cmpe273'}));
app.use(session({
  secret: "CMPE273_passport",
  resave: false,
  saveUninitialized: false,
  duration: 30 * 60 * 1000,
  activeDuration: 5 * 6 * 1000,
  store: new mongoStore({
    mongooseConnection: mongoose.connection
  })
}));
console.log("mgconn " + mongoose.connection)
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash()); // use connect-flash for flash messages stored in session

// routes ======================================================================
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(mlogger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/auth', authentication);
app.all('*', assertAuthentication);
//app.all('*');
app.use('/shopping', shopping);
app.use('/', routes);
app.use('/sell', sell);
function assertAuthentication(req, res, next) {
  /*var a = req.isAuthenticated();
  if(req.session.user != null && req.session.user != undefined){
    next();
  } else{
    res.redirect('/auth/signin')
  }*/
  next();
}
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers
function handleErrors(req, res, next) {
  executeCode(function () {
    next();
  }, function (e) {
    var id = getID();
    errorLogger.info('Error Id: ' + id + ' Error: ' + JSON.stringify(e));
    req.session.errorid = id;
    res.redirect('/sorry')
  })
}
var executeCode = function (fn, errFn) {
  Promise.try(fn).catch(function(e){
    console.log(e);
    if(errFn  != undefined)
      errFn(e);
  });
}
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

var connMgr = new mysql.connectionManager(500);
var getID = function () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}
dbm.dbManager({db: "mysql"});
module.exports = app;
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

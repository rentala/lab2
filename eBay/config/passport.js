/**
 * Created by Rentala on 26-10-2016.
 */

// config/passport.js

// load all the things we need
var LocalStrategy   = require('passport-local').Strategy;
var mq_client = require('../rpc/client');
var bcrypt   = require('bcrypt');
var models = require("../routes/models.js");
// load up the user model
var User            = require('../models/Users');

// expose this function to our app using module.exports
module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    /*
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            console.log("Found User :" + user);
            done(err, user);
        });
    });
    */

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-signup', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField : 'email',
            passwordField : 'password',
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, email, password, done) {

            // asynchronous
            // User.findOne wont fire unless data is sent back
            var salt = bcrypt.genSaltSync(10);

            var user = new models.user(req.body);
            user.password = bcrypt.hashSync(req.body.password, salt);
            /*var msg_payload =  { username : req.body.email, firstname: req.body.firstname,
                lastname: req.body.lastname, password : hash, phone: req.body.phone } ; */
            var msg_payload = user;
            console.log(msg_payload);
            mq_client.make_request('signup_queue',msg_payload, function(err,results){

                console.log(results);
                if (err)
                    return done(err);
                console.log(results.code);
                // if no user is found, return the message
                // all is well, return successful user
                return done(null, msg_payload);
            });

        }));
    passport.use('local-login', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField : 'email',
            passwordField : 'password',
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, email, password, done) { // callback with email and password from our form

            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists
            var msg_payload = { "email": email, "password": password };

            console.log("In POST Request = UserName:"+ email+" "+password);

            mq_client.make_request('login_queue',msg_payload, function(err,results){

                console.log(results);
                if (err)
                return done(err);
                console.log(results.code);
                // if no user is found, return the message
                if (results.code == 400)
                    return done(null, false, req.flash('loginMessage', 'No user found.')); // req.flash is the way to set flashdata using connect-flash

                // if the user is found but the password is wrong
                console.log(msg_payload.password + " " + results.value.password);
                console.log("result: " + JSON.stringify(results));
                if (!bcrypt.compareSync(msg_payload.password, results.value.password)){
                    console.log("Password is good");
                    return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata
                }


                // all is well, return successful user
                return done(null, results.value);
            });
            /*
            User.findOne({ 'local.email' :  email }, function(err, user) {
                // if there are any errors, return the error before anything else
                if (err)
                    return done(err);

                // if no user is found, return the message
                if (!user)
                    return done(null, false, req.flash('loginMessage', 'No user found.')); // req.flash is the way to set flashdata using connect-flash

                // if the user is found but the password is wrong
                if (!user.validPassword(password))
                    return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata

                // all is well, return successful user
                return done(null, user);
            });
            */
        }));
};
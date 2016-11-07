/**
 * Created by Rentala on 28-09-2016.
 */
var express = require('express');
var router = express.Router();
var ejs = require("ejs");
var tool = require("./tools.js");
var mysql = require("./mysql.js");
var models = require("./models.js");
var bcrypt = require('bcrypt');
var dbm = require("./dbManager.js");
var mongo = require("./mongo.js");
var passport = require('passport');
var dbContext = "mysql";

/* GET users listing. */
router.get('/register', function(req, res, next) {
    res.render('./authentication/siginregister.ejs',{ hasError :  checkError(req),
        isSignin : false,
        loginfailed: false,
        message : req.flash('signupMessage')
    });
});
router.get('/signin', function(req, res, next) {
    res.render('./authentication/siginregister.ejs',{ loginfailed: checkLoginError(req),
        hasError :  checkError(req),
        isSignin : true,
        message : req.flash('loginMessage')
    });
});
router.get('/signout', function(req, res, next) {
    req.session.destroy();
    res.redirect('/');
});
function checkError(req) {
    return req.query.err && req.query.err == '1';
}
function checkLoginError(req) {
    return req.query.err && req.query.err == '2';
}


router.post('/signinUser', function (req, res, next)  {
    passport.authenticate('local-login', function (err, user, info) {
        if(err){
            return next(err);
        }
        if(!user){
            return res.redirect('/auth/sigin')
        } else{
            req.logIn(user, {session:false}, function(err) {
                if(err) {
                    return next(err);
                }

                console.log("Got the user");
                req.session.user = user;
                return res.redirect('/');
            })
        }
    })(req, res, next);

});
/*dbFunc["mysql"].getUser(req.body, function (rows) {
 if(rows !=undefined && rows.length > 0){
 var user = rows[0];
 if(validateUser(user, req.body.password)){
 req.session.user = user;
 tool.getShoppingCart(user.user_id, function (rows) {
 console.log(rows);
 req.session.cart = new models.shoppingcart({ products : rows});
 res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
 res.redirect('/');
 }, function () {
 loginFailed(res)
 })

 }
 else{
 loginFailed(res);
 }
 } else{
 loginFailed(res);
 }
 }, errFn);*/


router.get('/welcome', function(req, res, next) {
    res.render('./authentication/welcome', req.session.user);
});
/*router.post('/create', function(req, res, next) {

    console.log(req.body);
    dbFunc[dbContext].insertUser(req.body, function (data, id) {
        req.session.user = data;
        console.log("user id " + id)
        req.session.user.user_id = id;
        res.redirect('/auth/welcome');
    },function () {
        res.redirect('/auth/register?err=1');
    });


});*/
router.post ('/create', function (req, res, next) {
    passport.authenticate('local-signup', function (err, user, info) {
        if(err){
            return next(err);
        }

        if(user != null || user != undefined){
            req.logIn(user, {session:false}, function(err) {
                if(err) {
                    return next(err);
                }

                console.log("Got the user");
                req.session.user = user;
                return res.redirect('/auth/welcome');
            })

        }



    })(req, res, next);
});


var validateUser = function (user, pwd) {
    return bcrypt.compareSync(pwd, user.password);
}

const saltRounds = 10;
function encryptPassword(password, func) {
    bcrypt.genSalt(saltRounds, function(err, salt) {
        bcrypt.hash(password, salt, function(err, hash) {
            console.log(hash);
            func(hash);
        });
    });
}


module.exports = router;

var express = require('express');
var router = express.Router();
var ejs = require("ejs");
var tool = require("./tools.js");
var mysql = require("./mysql.js");
var models = require("./models.js");
var winston = require('winston');
var mq_client = require('../rpc/client');
const eventlogger = new (winston.Logger)({
    transports: [
        // colorize the output to the console
        new (winston.transports.File)({
            filename: './logs/events.log'
        })
    ]
});
eventlogger.info('Hello world');
eventlogger.warn('Warning message');
eventlogger.debug('Debugging info');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'ebay' });
});

router.get('/sorry', function(req, res, next) {
    res.render('sorry', { errorid: req.mySession.errorid });
});

router.get('/user/:id', function(req, res, next) {
    getUserById(req.params.id, function (user) {
      getProductsById(req.params.id, function (prodRows) {
          console.log(prodRows);
          res.render('seller', { user: user, prods: prodRows});
      }, function (e) {

      })

  }, function (e) {

  });
});

router.get('/currentUser', function (req, res, next) {
    res.send({ result: true , username: req.session.user.username, id: req.session.user._id });
});
router.get('/history', function(req, res, next) {
            getOrderHistory(req.session.user._id, function (orders) {
                getWonBids(req.session.user._id, function (bids) {
                    console.log(bids);
                    var prods = [];
                    if(orders.length > 0){
                        orders.forEach(function(order){
                            order.cart.products.forEach(function (produc) {
                                prods.push(produc);
                            });
                        })
                    }

                    res.render('history', { prods: prods, bids: bids});
                }, function () {

                });
        }, function (e) {

        });
});
router.post('/log', function(req, res, next) {
    eventlogger.info('User Id: '+req.session.user._id+', '+ req.body.event+ ', '+ req.body.text);
    res.send(JSON.stringify({ result: true }));
});

function getUserById(id, succ, errFn) {
    var msg_payload =  { id : id}
    mq_client.make_request('getUserById_queue',msg_payload, function(err,results){
        console.log(results);
        if (err)
            errFn();
        if(results.code != 200)
            errFn();
        else
        {
            succ(results.user);
        }
    })
}
function getOrderHistory(id, succ, err) {
    tool.executeCode(function () {
        var msg_payload = { userid: id };
        console.log("In GET Request = getOrderHistory:")
        console.log(msg_payload);

        mq_client.make_request('getOrders_queue',msg_payload, function(err,results){

            console.log(results);
            if (err)
                err();
            if(results.code != 200)
                err();
            else
            {
                succ(results.orders);
            }
        });
    }, err);
}
function getProductsById(id, succ, errFn) {
    console.log("get prods");
    var msg_payload = { id: id };
    console.log("In GET Request = getProductsById:" + msg_payload);

    mq_client.make_request('getProductsById_queue',msg_payload, function(err,results){

        console.log(results);
        if (err)
            errFn();
        if(results.code != 200)
            errFn();
        else
        {
            succ(results.products);
        }
    });
}
function getWonBids(id, succ, err){
    tool.executeCode(function () {
        var msg_payload = { userid: id };
        console.log("In GET Request = getWonBid_queue:" + msg_payload);

        mq_client.make_request('getWonBid_queue',msg_payload, function(err,results){

            console.log(results);
            if (err)
                err();
            if(results.code != 200)
                err();
            else
            {
                succ(results.products);
            }
        });
    }, err);
}

module.exports = router;

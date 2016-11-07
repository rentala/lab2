/**
 * Created by Rentala on 03-10-2016.
 */
var express = require('express');
var router = express.Router();
var ejs = require("ejs");
var tool = require("./tools.js");
var mysql = require("./mysql.js");
var models = require("./models.js");
var mq_client = require('../rpc/client');
/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('./sell/sell.ejs', { hasError : false,
        isSignin : false,
        loginfailed: false
    });
});
router.get('/success', function(req, res, next) {
    res.send(JSON.stringify({ result: true }));
});

router.post('/addProduct', function(req, res, next) {
    console.log("addProduct");
    //req.body.sellerid = req.mySession.user.id;
    insertProduct(req.body, req.session.user._id, function (data, id) {
        res.send(JSON.stringify({ result: true, url: "/shopping/product/"+id }));
    },function () {
        res.send(JSON.stringify({ result: false }));
    });
});

function insertProduct(product,id, succFn, errFn) {
    tool.executeCode(function () {
        var dbproduct = new models.product(product);
        var msg_payload = { product : dbproduct, id: id };
        console.log("In POST Request = InsertProduct:" + msg_payload);

        mq_client.make_request('sell_queue',msg_payload, function(err,results){

            console.log(results);
            if (err)
                errFn();
            if(results.code != 200)
                errFn();
            else
            {
                succFn(msg_payload, results.id);
            }
        });
    }, errFn);
}

module.exports = router;
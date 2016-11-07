/**
 * Created by Rentala on 03-11-2016.
 */
var mongo = require("../db/mongo");
var mongodb = require('mongodb');
var mongoURL = "mongodb://localhost:27017/ebay";
function handle_request(msg, callback){

    var res = {};
    console.log("In handle request:"+ msg);
    mongo.connect(mongoURL, function(){
        console.log('Connected to mongo at: ' + mongoURL);
        var coll = mongo.collection('products');
        console.log(msg)
        msg.product.id = new mongodb.ObjectID().toString();
        msg.product.sellerid = msg.id;
        msg.product.bids = [];
        console.log()
        coll.insertOne(msg.product,
            function(err, obj){
                console.log("Product is ")
                console.log(obj);
                console.log(err);
                if (obj) {

                    // This way subsequent requests will know the user is logged in.
                    res.code = "200";
                    res.id = msg.product.id;
                } else {
                    res.code = "400";
                    res.value = "Login failed";
                }
                callback(null, res);
            });
    });

}

exports.handle_request = handle_request;
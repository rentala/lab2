/**
 * Created by Rentala on 04-11-2016.
 */
/**
 * Created by Rentala on 03-11-2016.
 */
var mongo = require("../db/mongo");
var mongodb = require('mongodb');
var mongoURL = "mongodb://localhost:27017/ebay";
var getProducts = {
        handle_request : function(msg, callback){

            var res = {};
            console.log("In handle request:"+ msg);
            mongo.connect(mongoURL, function(){
                console.log('Connected to mongo at: ' + mongoURL);
                var coll = mongo.collection('products');
                console.log(msg)
                console.log()
                coll.findOne({id: msg.id},
                    function(err, product){
                        console.log("product is ")
                        console.log(product);
                        if (product) {

                            // This way subsequent requests will know the user is logged in.
                            res.code = "200";
                            res.product = product;
                        } else {
                            res.code = "400";
                            res.value = "product notfound";
                        }
                        callback(null, res);
                    });
            });

        }
    }
var getAllProducts = {
    handle_request : function(msg, callback){

        var res = {};
        console.log("In handle request:"+ msg);
        mongo.connect(mongoURL, function(){
            console.log('Connected to mongo at: ' + mongoURL);
            var coll = mongo.collection('products');
            console.log(msg)
            console.log()
            var filter = {};
            if(msg.category != "*"){
                filter = {category: msg.category}
            }
            coll.find(filter).toArray(function(err, products){
                console.log("product is ")
                console.log(products);
                if (products) {

                    // This way subsequent requests will know the user is logged in.
                    res.code = "200";
                    res.products = products;
                } else {
                    res.code = "400";
                    res.value = "product notfound";
                }
                callback(null, res);
            });
        });

    }
}
var addToCart = {
    handle_request : function(msg, callback){

        var res = {};
        console.log("In handle request:"+ msg);
        mongo.connect(mongoURL, function(){
            console.log('Connected to mongo at: ' + mongoURL);
            var coll = mongo.collection('users');
            console.log(msg)
            console.log()
            coll.update({_id: mongodb.ObjectID(msg.userid)}, {$push : { cart: msg.product} },
                function(err, product){
                    console.log("product is ")
                    console.log(product);
                    if (product) {

                        // This way subsequent requests will know the user is logged in.
                        res.code = "200";
                        res.product = product;
                    } else {
                        res.code = "400";
                        res.value = "product notfound";
                    }
                    callback(null, res);
                });
        });

    }
}
var removeFromCart = {
    handle_request : function(msg, callback){

        var res = {};
        console.log("In handle request:"+ msg);
        mongo.connect(mongoURL, function(){
            console.log('Connected to mongo at: ' + mongoURL);
            var coll = mongo.collection('users');
            console.log(msg)
            console.log()
            coll.update({_id: mongodb.ObjectID(msg.userid)}, {$pull : { cart: { id: msg.id}} },
                function(err, product){
                    console.log("product is ")
                    console.log(product);
                    if (product) {

                        // This way subsequent requests will know the user is logged in.
                        res.code = "200";
                        res.product = product;
                    } else {
                        res.code = "400";
                        res.value = "product notfound";
                    }
                    callback(null, res);
                });
        });

    }
}
var counter = 0;
var clearProduct = {
    handle_request : function(msg, callback){
        var res;

        console.log("In handle request:"+ msg);
        mongo.connect(mongoURL, function(){
            console.log('Connected to mongo at: ' + mongoURL);
            var prodCol = mongo.collection('products');
            console.log(msg);
            var OneFailed = false;
            prodCol.findOne({id: msg.cart.products[counter].id }, function(err, prod){
                    console.log("product is ")
                    console.log(prod);
                    if (prod) {
                        var newQuantity = prod.quantity - msg.cart.products[counter].quantity;
                        prodCol.update({id: prod.id}, {$set :{quantity: newQuantity}}, function (err, obj) {
                            if (obj.result.nModified == 1) {
                                var resp = {};
                                // This way subsequent requests will know the user is logged in.
                                resp.code = "200";
                                resp.obj = obj;
                                counter++;
                                if(msg.cart.products.length == counter){
                                    //success
                                    callback(resp);
                                } else{
                                    clearProduct.handle_request(msg, callback);
                                }
                            } else {
                                res.code = "400";
                                res.value = "order not created";
                                OneFailed = true;
                            }
                            if(OneFailed){
                                callback(res);
                            }

                        })
                    }
                });


        });

    }
}
var createOrder = {
    handle_request : function(msg, callback){

        var res = {};
        console.log("In handle request:"+ msg);
        msg.orderid = new mongodb.ObjectID().toString();
        mongo.connect(mongoURL, function(){
            console.log('Connected to mongo at: ' + mongoURL);
            var coll = mongo.collection('users');
            console.log(msg)
            coll.update({_id: mongodb.ObjectID(msg.userid)}, {$push : { orders: msg}, $set : { cart : [] } },
                function(err, obj){
                    console.log("obj is ")
                    console.log(obj);
                    if (obj.result.nModified == 1) {

                        // This way subsequent requests will know the user is logged in.
                        res.code = "200";
                        res.product = obj;
                        clearProduct.handle_request(msg, function (result) {
                            result.orderid= msg.orderid;
                            callback(null, result);
                        });
                    } else {
                        res.code = "400";
                        res.value = "order not created";
                        callback(null, res);
                    }

                });
        });

    }
}
var placeBid = {
    handle_request : function(msg, callback){

        var res = {};
        console.log("In handle request:"+ msg);
        console.log(msg);
        mongo.connect(mongoURL, function(){
            console.log('Connected to mongo at: ' + mongoURL);
            var coll = mongo.collection('products');
            console.log(msg)
            var bidId = new mongodb.ObjectID().toString();
            coll.update({id: msg.id}, {$push : { bids: { id: bidId ,userid : msg.userid, bidamount: msg.bidamount }},
                    $set : { price : msg.bidamount },
                    $set: { highestBid : { id: bidId ,userid : msg.userid, bidamount: msg.bidamount } } },
                function(err, obj){
                    console.log("obj is ")
                    console.log(obj);
                    if (obj.result.nModified == 1) {

                        // This way subsequent requests will know the user is logged in.
                        res.code = "200";
                        msg.bidId = bidId;
                        res.product = msg;
                    } else {
                        res.code = "400";
                        res.value = "fail";
                    }
                    callback(null, res);

                });
        });

    }
}
var getBidByID = {
    handle_request : function(msg, callback){

        var res = {};
        console.log("In handle request:"+ msg);
        mongo.connect(mongoURL, function(){
            console.log('Connected to mongo at: ' + mongoURL);
            var coll = mongo.collection('products');
            console.log(msg)
            console.log()
            coll.find({"highestBid.userid": msg.userid}).toArray(
                function(err, products){
                    console.log("product is ")
                    console.log(products);
                    if (products) {

                        // This way subsequent requests will know the user is logged in.
                        res.code = "200";
                        res.products = products;
                    } else {
                        res.code = "400";
                        res.value = "product notfound";
                    }
                    callback(null, res);
                });
        });

    }
}

var orderHistory = {
    handle_request : function (msg, callback){

        var res = {};
        console.log("In handle request:"+ msg.userid);
        mongo.connect(mongoURL, function(){
            console.log('Connected to mongo at: ' + mongoURL);
            var coll = mongo.collection('users');
            console.log("Coll is users");
            coll.findOne({_id: mongodb.ObjectID(msg.userid)},
                function(err, user){
                    console.log("User is ")
                    console.log(user);
                    if (user) {

                        // This way subsequent requests will know the user is logged in.
                        res.code = "200";
                        res.orders = user.orders;
                    } else {
                        res.code = "400";
                        res.value = "no user failed";
                    }
                    callback(null, res);
                });
        });

    }
}
var getProductsById = {
    handle_request : function(msg, callback){

        var res = {};
        console.log("In handle request:"+ msg);
        mongo.connect(mongoURL, function(){
            console.log('Connected to mongo at: ' + mongoURL);
            var coll = mongo.collection('products');
            console.log(msg)
            console.log()
            coll.find({sellerid: msg.id}).toArray(function(err, products){
                    console.log("product is ")
                    console.log(products);
                    if (products) {

                        // This way subsequent requests will know the user is logged in.
                        res.code = "200";
                        res.products = products;
                    } else {
                        res.code = "400";
                        res.value = "products notfound";
                    }
                    callback(null, res);
                });
        });

    }
}
exports.getProducts = getProducts;
exports.addToCart = addToCart;
exports.removeFromCart = removeFromCart;
exports.createOrder = createOrder;
exports.clearProduct = clearProduct;
exports.getAllProducts = getAllProducts;
exports.placeBid = placeBid;
exports.getBidByID = getBidByID;
exports.orderHistory = orderHistory;
exports.getProductsById = getProductsById;
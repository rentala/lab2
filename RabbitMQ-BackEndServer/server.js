//super simple rpc server example
var amqp = require('amqp')
, util = require('util');

var login = require('./services/login');
var signup = require('./services/signup');
var sell = require('./services/sell');
var product = require('./services/products');
var counter = 0;
var cnn = amqp.createConnection({host:'127.0.0.1'});
cnn.on('ready', function(){
	console.log("listening on queues");

	cnn.queue('login_queue', function(q){
		genFunc(q, login);
	});
	cnn.queue('signup_queue', function(q){
		genFunc(q, signup);
	});
	cnn.queue('sell_queue', function(q){
		genFunc(q, sell);
	});
	cnn.queue('getProducts_queue', function(q){
		genFunc(q, product.getProducts);
	});
	cnn.queue('addToCart_queue', function(q){
		genFunc(q, product.addToCart);
	});
	cnn.queue('removeFromCart_queue', function(q){
		genFunc(q, product.removeFromCart);
	});
	cnn.queue('order_queue', function(q){
		genFunc(q, product.createOrder);
	});
	cnn.queue('clearProducts_queue', function(q){
		genFunc(q, product.clearProduct);
	});
	cnn.queue('getAllProducts_queue', function(q){
		q.subscribe(function(message, headers, deliveryInfo, m){
			util.log(util.format( deliveryInfo.routingKey, message));
			util.log("Message: "+JSON.stringify(message));
			util.log("DeliveryInfo: "+JSON.stringify(deliveryInfo));
			product.getAllProducts.handle_request(message, function(err,res){
				counter++;
				console.log(counter);
				//return index sent
				cnn.publish(m.replyTo, res, {
					contentType:'application/json',
					contentEncoding:'utf-8',
					correlationId:m.correlationId
				});
			});
		});
	});
	cnn.queue('placeBid_queue', function(q){
		genFunc(q, product.placeBid);
	});
	cnn.queue('getWonBid_queue', function(q){
		genFunc(q, product.getBidByID);
	});
	cnn.queue('getOrders_queue', function(q){
		genFunc(q, product.orderHistory);
	});
	cnn.queue('getUserById_queue', function(q){
		genFunc(q, login.getUserById);
	});
	cnn.queue('getProductsById_queue', function(q){
		genFunc(q, product.getProductsById);
	});

});
var genFunc = function(q, func){
	q.subscribe(function(message, headers, deliveryInfo, m){
		util.log(util.format( deliveryInfo.routingKey, message));
		util.log("Message: "+JSON.stringify(message));
		util.log("DeliveryInfo: "+JSON.stringify(deliveryInfo));
		func.handle_request(message, function(err,res){

			//return index sent
			cnn.publish(m.replyTo, res, {
				contentType:'application/json',
				contentEncoding:'utf-8',
				correlationId:m.correlationId
			});
		});
	});
}
//URL for the sessions collections in mongoDB
var mongoSessionConnectURL = "mongodb://localhost:27017/ebay";
var mongo = require("./db/mongo");
//Database configuration file
//connect to the mongo collection session and then createServer
mongo.connect(mongoSessionConnectURL, function(){
	console.log('Connected to mongo at: ' + mongoSessionConnectURL);
});


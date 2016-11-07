var mongo = require("../db/mongo");
var mongoURL = "mongodb://localhost:27017/ebay";
var mongodb = require('mongodb');
function handle_request(msg, callback){
	
	var res = {};
	console.log("In handle request:"+ msg.username);
	mongo.connect(mongoURL, function(){
		console.log('Connected to mongo at: ' + mongoURL);
		var coll = mongo.collection('users');
		console.log("Coll is users");
		coll.findOne({email: msg.email},
			function(err, user){
				console.log("User is ")
				console.log(user);
			if (user) {

				// This way subsequent requests will know the user is logged in.
				res.code = "200";
				res.value = user;
			} else {
				res.code = "400";
				res.value = "Login failed";
			}
			callback(null, res);
		});
	});

}
var getUserById = {
	handle_request : function (msg, callback){

		var res = {};
		console.log("In handle request:"+ msg.id);
		mongo.connect(mongoURL, function(){
			console.log('Connected to mongo at: ' + mongoURL);
			var coll = mongo.collection('users');
			console.log("Coll is users");
			coll.findOne({_id: mongodb.ObjectID(msg.id)},
				function(err, user){
					console.log("User is ")
					console.log(user);
					if (user) {

						// This way subsequent requests will know the user is logged in.
						res.code = "200";
						res.user = user;
					} else {
						res.code = "400";
						res.value = "Login failed";
					}
					callback(null, res);
				});
		});

	}
}

exports.handle_request = handle_request;

exports.getUserById = getUserById;
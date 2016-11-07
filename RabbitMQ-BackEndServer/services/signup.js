/**
 * Created by Rentala on 02-11-2016.
 */
var mongo = require("../db/mongo");
var mongoURL = "mongodb://localhost:27017/ebay";
function handle_request(msg, callback){

    var res = {};
    console.log("In handle request:"+ msg.username);
    mongo.connect(mongoURL, function(){
        console.log('Connected to mongo at: ' + mongoURL);
        var coll = mongo.collection('users');
        console.log("Coll is ");
        console.log(coll);
        msg.products = [];
        coll.insertOne(msg, function(err, result){
                console.log("result is ")
                console.log(result);
                console.log("res id " + result.insertedId);
                if (result) {

                    // This way subsequent requests will know the user is logged in.
                    res.code = "200";
                    res.value = result;
                } else {
                    res.code = "400";
                    res.value = "Creation failed";
                }
                callback(null, res);
            });
    });

}

exports.handle_request = handle_request;
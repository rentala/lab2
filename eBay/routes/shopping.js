/**
 * Created by Rentala on 29-09-2016.
 */
var express = require('express');
var router = express.Router();
var ejs = require("ejs");
var tool = require("./tools.js");
var mysql = require("./mysql.js");
var models = require("./models.js");
var winston = require('winston');
const bidlogger = new (winston.Logger)({
    transports: [
        // colorize the output to the console
        new (winston.transports.File)({
            filename: './logs/bids.log'
        })
    ]
});
var Promise = require("bluebird");
var mq_client = require('../rpc/client');
/* GET users listing. */
router.get('/shipping', function(req, res, next) {
    if(req.session.cart !=undefined && req.session.cart.products !=undefined && req.session.cart.products.length > 0){
        res.render('./shopping/shipping.ejs',{ hasError : false,
            isSignin : false,
            loginfailed: false
        });
    } else{
        res.redirect('/#/cart?err=1');
    }

});

router.post('/api/addshipping', function(req, res, next) {
    var data = req.body;
    data.user_id = req.session.user.user_id;
    req.session.order = new models.order(data);
    res.redirect('/shopping/review');
});
router.post('/api/order', function(req, res, next) {
    var data = req.body;
    var order = req.session.order;
    order.createdon = new Date().mySQLDate();
    order.cart = req.session.cart;
    order.userid = req.session.user._id;
    createOrder(order, function (orderid) {
        var orderlines = [];
        req.session.orderid = orderid;
        req.session.lastOrderBuy = true;
        req.session.cart = undefined;
        res.redirect('/#/confirmation');
        //res.redirect('/#/confirmation');
    }, function (e) {

    });

});

router.get('/review', function (req, res, next) {
    if(req.session.order!=undefined && req.session.cart !=undefined){
        var totalShipping = 0;
        var orderTotal = 0;
        req.session.cart.products.forEach(function (prod) {
            orderTotal += prod.price * prod.quantity;
            totalShipping += prod.delprice;
        });
        req.session.cart.totalShipping = totalShipping;
        req.session.cart.orderTotal = orderTotal+totalShipping;
        req.session.cart.totalShipping == 0 ? "Free": "$"+req.session.cart.totalShipping
        res.render('./shopping/review.ejs', { order: req.session.order, cart : req.session.cart });
    } else{
        res.redirect('/');
    }

});
router.get('/category/:category', function(req, res, next) {
    jresponse = res;
    var category = req.params.category;
    var msg_payload = { category: category };
    console.log("In POST Request = getProductsOfCategory:");
    console.log(msg_payload);
    mq_client.make_request('getAllProducts_queue',msg_payload, function(err,results){

        console.log(results);
        if (err)
            jsonErrorResp();
        if(results.code != 200)
            jsonErrorResp();
        else
        {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ result: results.products != undefined && results.products.length > 0 ,
                rows: results.products }));
        }
    });
});

router.get('/all', function(req, res, next) {
    jresponse = res;
    getAllProducts(0,10, jsonSuccessResp, jsonErrorResp)
});
router.get('/all/:l/:u', function(req, res, next) {
    jresponse = res;
    getAllProducts(req.params.l,req.params.u, jsonSuccessResp, jsonErrorResp)
});
router.get('/api/shoppingcart', function(req, res, next) {
    //set this cart when user logs in.
    var result = false;
    var cart, username, id;
    if(req.session != undefined && req.session.cart){
        console.log(req.session.cart);
        cart = new models.shoppingcart(req.session.cart);
        console.log(cart);
        cart.calculateTotal();
        result = true;

    }

    res.send(JSON.stringify({ result: result ,
        cart: cart, username: username, id: id }));
});


router.post('/api/addproduct', function(req, res, next) {
    getProductById(req.body.i, function (product) {
        var cart = new models.shoppingcart();
        if(req.session != undefined && req.session.cart != undefined){
            cart = new models.shoppingcart(req.session.cart);
        }
        console.log(req.session.user);
        addProductToCart({ userid: req.session.user._id, product : product, quantity: req.body.qty}, function () {
            product.quantity = parseInt(req.body.qty);
            cart.products.push(product);
            cart.calculateTotal();
            req.session.cart = cart;
            if(req.body.tocart == "1"){
                res.redirect('/#/cart?m=' + product.id);
            } else{
                res.send(JSON.stringify({ result: true,cart: cart }));
            }
        }, function (e) {
            res.send(JSON.stringify({ result: false, e: e }))
        });

    }, function (e) {
        res.send(JSON.stringify({ result: false, e: e }))
    });
});
router.post('/api/removeProduct', function(req, res, next) {
    getProductById(req.body.i, function (product) {
        var cart = new models.shoppingcart();
        if(req.session != undefined && req.session.cart != undefined){
            cart = new models.shoppingcart(req.session.cart);
        }
        removeProductFromCart(req.session.user._id, req.body.i, function (ob,id) {
            tool.getShoppingCart(req.session.user._id, function (rows) {
                req.session.cart = new models.shoppingcart({ products : rows});
                res.send(JSON.stringify({ result: true, cart : req.session.cart}))
            }, function () {
                loginFailed(res)
            })
        }, function () {
            res.send(JSON.stringify({ result: false }));
        });
    }, function (e) {
        res.send(JSON.stringify({ result: false, e: e }))
    });
});
router.post('/api/placebid', function(req, res, next) {
    placeBid({ id: req.body.i, bidamount:req.body.bidamount , userid : req.session.user._id}, function (result) {
        req.session.bidid = result.product.bidId;
        req.session.bidProdId = req.body.i;
        req.session.lastOrderBuy = false;
        res.redirect('/#/confirmation');
    }, function (e) {
        res.send(JSON.stringify({ result: false, e: e }))
    });
});

router.get('/api/confirmation', function(req, res, next) {
    if(req.session.lastOrderBuy == false){
        getBidById({ bidid: req.session.bidid, bidProdId : req.session.bidProdId }, function (rows) {
            rows.expTime = tool.getExpTime(rows.validity);
            rows.isBidUp = tool.isBidUp(rows.validity);
            rows.price = parseInt(rows.price);
            res.send(JSON.stringify({ result: true, order:false, bid  : rows }));
        }, function () {
            res.send(JSON.stringify({ result: false}))
        })
    } else if(req.session.lastOrderBuy == true){
        getProductsByOrderId(req.session.orderid, function (rows) {
            res.send(JSON.stringify({ result: true, order:true, orders  : rows, orderid:req.session.orderid }));
        }, function (e) {
            res.send(JSON.stringify({ result: false}));
        })

    } else {
        res.send(JSON.stringify({ result: false}));
    }


});

router.get('/product/:id', function(req, res, next) {
    getProductById(req.params.id, function (row) {
        console.log(JSON.stringify(row));
        row.expTime = tool.getExpTime(row.validity);
        row.isBidUp = tool.isBidUp(row.validity);
        res.render('./products.ejs',{ product : row});
    }, function (e) {
        res.redirect('/');
    });
});
router.get('/all/:count', function(req, res, next) {
    var count = parseInt(req.params.count);
    jresponse = res;
    getAllProducts(count,jsonSuccessResp, jsonErrorResp)
});
router.get('/category/:category/:subcategory', function(req, res, next) {
    jresponse = res;
    var category = req.params.category;
    var subcategory = req.params.subcategory;
    getProductsOfSubCategory(category, subcategory ,jsonErrorResp, jsonSuccessResp)
});
function getProductsOfCategory(cat, succFn, errFn) {
    var msg_payload = { category: cat };
    console.log("In POST Request = getProductsOfCategory:");
    console.log(msg_payload);
    mq_client.make_request('getAllProducts_queue',msg_payload, function(err,results){

        console.log(results);
        if (err)
            errFn();
        if(results.code != 200)
            errFn();
        else
        {
            succFn(results.products);
        }
    });

}
function getProductsOfSubCategory(cat, subcat, succ, err) {
    subcat = models.subCategories[subcat];
    cat = models.categories[cat];
    mysql.fetchData("select * from products where category = ? && subcategory = ? && quantity>0", [cat,subcat], succ, err);
}
var self = this;
function getAllProducts(upper, succFn, errFn) {
    tool.executeCode(function () {
        var msg_payload = { category: "*" };
        console.log("In POST Request = getAllProducts_queue:");
        console.log(msg_payload);
        mq_client.make_request('getAllProducts_queue',msg_payload, function(err,results){

            console.log(results);
            if (err)
                err();
            if(results.code != 200)
                err();
            else
            {
                succFn(results.products);
            }
        });
    }, errFn);

}
function getProductById(id, succ, err) {
    tool.executeCode(function () {
        var msg_payload = { id: id };
        console.log("In GET Request = getProducts:" + msg_payload);

        mq_client.make_request('getProducts_queue',msg_payload, function(err,results){

            console.log(results);
            if (err)
                err();
            if(results.code != 200)
                err();
            else
            {
                succ(results.product);
            }
        });
    }, err);
}
function getBidById(obj, succ, err) {
    tool.executeCode(function () {
        getProductById(obj.bidProdId,function (res) {
            res.bidid = obj.bidProdId;
            succ(res);
        }, err);
    }, err);

}
function addProductToCart(cartLine, succFn, errFn) {
    tool.executeCode(function () {
        cartLine.product.quantity  = cartLine.quantity;
        var msg_payload = cartLine;
        console.log("In POST Request = addToCart:" + msg_payload);

        mq_client.make_request('addToCart_queue',msg_payload, function(err,results){

            console.log(results);
            if (err)
                err();
            if(results.code != 200)
                err();
            else
            {
                succFn();
            }
        });
    }, errFn);

}
function removeProductFromCart(userid, pid, succFn, errFn) {
    tool.executeCode(function (){
        var msg_payload = {userid : userid, id: pid};
        console.log("In POST Request = removeProduct:");
        console.log(msg_payload);
        mq_client.make_request('removeFromCart_queue',msg_payload, function(err,results) {

            console.log(results);
            if (err)
                err();
            if (results.code != 200)
                err();
            else {
                succFn();
            }
        });
    }, errFn);
}
function createOrder(ordr, succFn, errFn) {
    tool.executeCode(function () {
        var msg_payload = ordr;
        console.log("In POST Request = addToCart:");
        console.log(ordr);
        mq_client.make_request('order_queue',msg_payload, function(err,results){

            console.log(results);
            if (err)
                err();
            if(results.code != 200)
                err();
            else
            {
                succFn(results.orderid);
            }
        });
    }, errFn);

}
function createOrderLines(orderlines,succFn, errFn) {
    mysql.insertData("INSERT INTO orderlines (productid,quantity,orderid) VALUES  ? ",[orderlines], succFn, errFn);
}
function clearProduct(products, succFn,errFn ) {
    products.forEach(function (prod) {
        mysql.insertData("UPDATE products SET quantity=quantity-"+prod.quantity+" WHERE productid="+prod.productid,undefined,succFn, errFn);
    });
}
function clearCart(userid, succFn,errFn ) {
    mysql.deleteData("delete from cartlines where userid = ? ", userid,succFn, errFn);
}
function placeBid(bid, succFn, errFn) {
    tool.executeCode(function () {
        var msg_payload = bid;
        bidlogger.info('Bid registered ' + JSON.stringify(bid));
        console.log("In POST Request = placeBid:" + msg_payload);

        mq_client.make_request('placeBid_queue',msg_payload, function(err,results){

            console.log(results);
            if (err)
                errFn();
            if(results.code != 200)
                errFn();
            else
            {
                succFn(results);
            }
        });
    }, errFn);

}
function getProductsByOrderId(orderid,succFn,errFn) {
    mysql.fetchData("select *, ol.quantity as orderQty from orders o join orderlines ol on o.orderid = ol.orderid join products p on ol.productid = p.productid where ol.orderid = ?",
        orderid, succFn, errFn);
}
function updateProductPrice(price, pid, succFn, errFn) {
    tool.executeCode(function () {
        mysql.insertData("UPDATE `test`.`products` SET `price`= ? WHERE `productid`= ?;",[ price, pid], succFn, errFn);
    }, errFn);

}
var jresponse;
var jsonSuccessResp = function (rows) {
    jresponse.setHeader('Content-Type', 'application/json');
    jresponse.send(JSON.stringify({ result: rows != undefined && rows.length > 0 ,rows: rows }));
}
var jsonErrorResp = function (e) {
    jresponse.setHeader('Content-Type', 'application/json');
    jresponse.send(JSON.stringify({ result: false, error: e }));

}

module.exports = router;
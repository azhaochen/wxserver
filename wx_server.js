
var path = require('path');
var fs = require('fs');
var express = require('express');
var app = express();

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');


app.set('port', '80');
app.use(cookieParser());	//这个尽量放前面

app.set('views', path.join(__dirname, './public/html'));
/*app.use(express.favicon());
app.use(express.logger('dev'));	express 4 后，这些插件都不是express内置，需要按需安装
app.use(express.bodyParser());
app.use(express.methodOverride());*/

app.use(bodyParser.urlencoded({ extended: false }))	/* parse application/x-www-form-urlencoded*/
app.use(bodyParser.json());							/* parse application/json*/

app.use(express.static(path.join(__dirname, 'public')));


app.all('/weixin/([a-zA-Z0-9_\/]+.js)\??',function(req,res,next){
	var filepath = path.join(__dirname, req.path);
	console.log(req.path, req.originalUrl, req.cookies);
	fs.exists(filepath,function(flag){
		if(!flag){
			res.redirect('/html/404.html');
		}else{
			var module = require(filepath);
			module(req,res);
		}
	});
});


var server = app.listen(app.get('port'), function () {
	var host = server.address().address
	var port = server.address().port
	console.log("server start, http://%s:%s", host, port)
})
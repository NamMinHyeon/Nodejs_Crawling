var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var session = require('express-session');
var fs = require('fs');

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);


var server = app.listen(3000, function(){
    console.log("Express server has started on port 3000")
});


app.use(express.static('public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

app.use(session({
    secret: '@#@$MYSIGH#@$#$',  //Cookie 임의 변조 방지 → 이 값을 통하여 세션 암호화 및 저장
    resave: false,              //Session을 언제나 저장할 지 (변경되지 않아도) 정하는 값. express-session Doc 에서는 이 값을 False로 하는 것을 권장
    saveUninitialized: true     //Session이 저장되기 전에 uninitialized 상태로 미리 만들어서 저장
    }
));

var router = require('./router/main')(app, fs);

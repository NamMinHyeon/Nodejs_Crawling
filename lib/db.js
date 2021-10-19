//DB 접속 정보 관리 페이지 - 나중에 정리
var Connection = require('tedious').Connection;

var config = {
    server: 'IP',
    option: { encrypt:false, database: 'Schema'},
    authentication:{
        type:"default",
        options:{
            userName:"sa",
            password:"Qwer!234"
        }
    }
};

var sqlCon = new Connection(config);

sqlConn.on('connect', function(err){
    console.log("Connected");
});

module.exports = sqlConn;
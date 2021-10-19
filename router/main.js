module.exports = function(app, fs)
{
    const schedule = require('node-schedule');
    const nodemailer = require( "nodemailer" );
    const smtpTransport = require('nodemailer-smtp-transport');
    const async = require('async');

    var mainJob;
    var mailJob;

    app.get('MailingClose', function(req,res){
        mailJob.calcel();
        console.log('#### MailingJob Close!! ####');

        var sess = req.session;

        res.render('index', {
            title: "MailingClose",
            length: 1,
            name: sess.name,
            username: sess.username
        })
    })

    app.get('/MailingOpen', function(req,res){ //DB 2!3d //  
        var Connection = require('tedious').Connection; 
        var Request = require('tedious').Request; 
        var TYPES = require('tediouse').TYPES; 
        
        var config = { 
            server: '10.214.101.77', 
            options: { encrypt:false, database: 'ESH' }, 
            authentication:{
                type: "default",
                options:{ 
                            userName: "sa", 
                            password: "resh_Dymos_sa!"
                        }
                },
                MAIL_SENDER: 'sysnotification@hyundai-transys.com', 
                MAIL_HOST: 'smtp.hyundai-transys.com', 
                MAIL_SECURE_CONNECTION:false, //SSL 
                MAIL_PORT: 25
            }; 

        var transport = nodemailer.createTransport(smtpTransport({ 
            host: config.MAIL_HOST, 
            secureConnection: config.MAIL_SECURE_CONNECTION, 
            port: config.MAIL_PORT
        })); 

        function sendMail (mailOptions, callback) { 
                
            transport.sendMail(mailOptions, function(err, responseStatus) {
                if (err) return callback(err); 
                return callback(null); 
            }); 
        }

        mailJob = schedule.scheduleJob('mailJob', '*/60 * * * * *', function(){ 
                let mNow = new Date();
                console.log(mNow);
                console.log('#### Mailing Started!!! ####');

                var sqlConn = new Connection(config); 

                //Attempt to connect and execute queries if connection goes through 
                sqlConn.on('connect', function(err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('DB Connected');
                        
                        async.waterfall(
                            [
                                fnStart, 
                                fnSelect, 
                                fnUpdate 
                            ], fnComplete)
                            
                        }
                    });
                            
                function fnStart(callback) { 
                    console.log('### Starting... ###'); 
                    callback(null); 
                }

                function fnSelect(callback) { 
                    console.log('###### Selecting... ######'); 
                    
                    var result = "IN ("; 
                    request = new Request("SELECT SEQ, MAIL_TITLE, ARTICLE_TITLE, BODY, RECEIVERS FROM HIDSEHS.dbo.KOSHA_EMAIL_REQUEST with(nolock) WHERE SEND_FLAG = 'N';", function(err, rowCount, Rows) {
                        if (err){
                            callback(err);
                        } else { 
                            console.log(rowCount + ' rows(s) selected');

                            if(rowCount == 0){
                                result = " = ''";
                            }else{
                                //다수의 행
                                result = result.substr(0, result.length-1);
                                result += ")";
                            }

                            callback(null, result);
                        }
                    });

                    //결과값 존재
                    request.on('row', function(columns) {
                        result += columns[0].value + ",";
                        
                        var mailOptions = {
                            from: config.MAIL_SENDER, 
                            to: columns[4].value, 
                            subject: columns[1].value, 
                            html: columns[3].value //BODY
                        };
                        
                        sendMail(mailOptions, function(err) {
                            console.log('###### Mail Send Success ! ######' + ' : ' + columns[4].value);
                        });

                    });
                        
                    request.on('done', function(rowCount, more) {
                        console.log(rowCount + ' rows returned'); 
                    });

                    sqlConn.execSql(request); 
                }
                
                function fnUpdate(results, callback) {
                    console.log('######### Updating... #########'); 
                    
                    request = new Request("UPDATE HIDSEHS.dbo.KOSHA_EMAIL_REQUEST SET SEND_FLAG = 'V', SEND_DATE = CURRENT_TIMESTAMP WHERE SEQ " 
                    + results + ";", function(err, rowCount, rows) {
                        if (err) {
                            callback(err);
                        } else {
                            console.log(rowCount + ' row(s) updated'); 
                            callback(null, 'done'); 
                        }
                    });
                    
                    sqlConn.execSql(request); 
                }
                
                
                function fnComplete(err, result) {
                    if (err) {
                        console.error(err);
                    } else {
                        colsole.log("Done!");
                    }
                }

            });

            var sess = req.session;

            res.render('index', {
                title: "MaillingOpen",
                length: 1,
                name: sess.name,
                username: sess.username
            })
        });


    app.get('/JobClose', function(req,res){ 

        mainJob.cancel();
        console.log('########################### Job Closed!!! ###########################'); 

        var sess = req.session; 

        res.render('index', { 
            title: "JobClose", 
            length: 1, 
            name: sess.name, 
            username: sess.username 
        })
    });

            
    app.get('/JobOpen', function(req,res){ 
        mainJob = schedule.scheduleJob('mainJob', '*/5 * * * *', function(){
            let mNow = new Date();

            console.log(mNow);
            console.log('#### Job Started!!! ####');

            crawlInit();
        });

        var sess = req.session; 

        res.render('index', { 
            title: "JobOpen", 
            length: 1, 
            name: sess.name, 
            username: sess.username 
        })

        function crawlInit(){
            var Connection = require('tedious').Connection;
            var Request = require('tedious').Request;
            var TYPES = require('tedious').TYPES;
            
            var config = { 
                server: '10.214.101.77', 
                options: { encrypt:false, database: 'ESH' }, 
                authentication:{
                    type: "default",
                    options:{ 
                        userName: "sa", 
                        password: "resh_Dymos_sa!"
                    }
                }
            };
            
            //let 재선언 불가, 재할당 가능
            //const 재선언 불가, 재할당 가능 
            const axios = require('axios');
            const cheerio = require('cheerio');
            const v = require('voca'); 
            
            var mainUrl = "https://www.kosha.or.kr/kosha/report/kosha_news.do"; 

            // add this line before nodemailer.createTransport() = SSL validate 처리하지 않음
            process.env.NODE_ILS_REJECT_UNAUTHORIZED = "0";

            const getHtml = async () => { 
                try { 
                    return await axios.get(mainUrl);
                } catch (error) {
                    console.log("Error"); 
                    //console.error(error);
                }
            };

            //getHtml 함수는 axios.get 함수를 이용하여 비동기로 html 파일 호출
            //Promise 객체에 cheerio를 이용하여 데이터를 가공
            result = getHtml().then(html => { 

                let ulList = []; 
                const $ = cheerio.load(html.data);

                const $bodyList = $("div.sub-bg-wrap").children("div.sub-container")
                                                        .children("div.sub-content-wrap")
                                                        .children("div.content-wrap")
                                                        .children("div.ko.board.list")
                                                        .children("div.Board_wrap")
                                                        .children("div.Board_list")
                                                        .children("table.Board-list-type01")
                                                        .children("tbody").find("tr"); 

                //console.log($bodyList.html());
                
                $bodyList.each(function(i, elem) { 
                    
                    //console.log($(this).children("td.board-list-title").text()); 
                    
                    let title = $(this).children("td.board-list-title").attr('title');
                    
                    title = v.replaceAll(title, '\t', '') 
                    title = v.replaceAll(title, '\r\n', '')
                    title = v.trim(title) 


                    ulList[i] = {
                        title: title,
                        url: mainUrl + $(this).children("td.board-list-title").children("div").children("a").attr('href') //td -> div -> a
                    };


                    //DB Insert
                    //console.log(i + "/" + ulList[i].title + "/" + ulList[i].url);
                    
                    executeStatement(ulList[i].title, ulList[i].ur1);
                    
                });

                //data 배열에 적재
                data = ulList.filter(n => n.title); 

            })
            function executeStatement(title, url) {
                
                var sqlConn = new Connection(config);
                
                sqlConn.on('connect', function(err) { 

                    request = new Request("INSERT ESH.dbo.IF_KOSHA (SEQ, ARTICLE_NO, TITLE, URL, RECEIVE_DATE) VALUES (NEXT VALUE FOR SEQ_IF_KOSHA, @ARTICLE_NO, @TITLE, @URL, CURRENT_TIMESTAMP);", function(err) {
                        if (err) {
                            console.log(err);}
                        });
                            
                        //'articleNo=', '&article.offset' 사이값 반환
                        //예시) url : https://ww.kosha.or.kr/kosha/report/kosha_news.do?mode=view&articleNo=419094&article.offset=0&articleLimit=10
                        
                        request.addParameter('ARTICLE_NO', TYPES.NVarChar, url.match(/articleNo=(.*)&article.offset/)[1]);
                        request.addParameter('TITLE', TYPES.NVarChar , title);
                        request.addParameter('URL', TYPES.NVarChar, url); 
                        
                        request.on('row', function(columns) {
                            columns.forEach(function(column) {
                                if (column.value === null) {
                                    console.log('NULL');
                                } else {
                                    console.log("KOSHA data inserted = " + column.value);
                                }
                            });
                        });

                    sq1Conn.execSql(request); 

                    request.on('requestCompleter', function(err) {
                        if (err) {
                            console.log(err);
                        }

                        sqlConn.close(); //TIME-WAIT 상태
                        //delete sqlConn; //ESTABLISHED 상태로 남아있어 Socket 반환 불가
                    });

                });

            }
            console.log("###### crawlInit Close ######");
        }
        //crawlInit() Close
    });


    app.get('/', function(req,res){
        var sess = req.session;

        res.render('index', { 
            title: "안전보건공단 사고 속보 Crawling"
            //length: 0, 
            //name: sess.name, 
            //username: sess.username
        }); 
    });

    app.get('/login/:username/:password', function(req, res){
        var sess;
        sess = req.session;

        console.log("/login/ " +sess.username + " /"+ sess.password);
        
        fs.readFile(__dirname + "/../data/user.json", "utf8", function(err, data){
            var users = JSON.parse(data);
            var username = req.params.username;
            var password = req.params.password;
            var result = {};
            
            if(!users[username]){
                // USERNAME NOT FOUND 
                result["success"] = 0; 
                result["error"] = "not found"; 
                res.json(result); 
                return; 
            }
            
            if(users[username]["password"] == password){
                result["success"] = 1;
                sess.username = username;
                sess.name = users[username]["name"];
                res.json(result);
                
            } else { 
                result["success"] = 0;
                result["error"] = "incorrect";
                res.json(result);
            }
        })
    });

    app.get('/logout', function(req, res){
        sess = req.session;
        if(sess.username){
            req.session.destroy(function(err){
                if(err){
                    console.log(err);
                }else{
                    res.redirect('/');
                }
            })
        }else{
            res.redirect('/');
        }
    });
        
        //0. 전체 리스트 호출
    app.get('/list', function (req, res) {
        fs.readFile(__dirname + "/../data/" + "user.json", 'utf8', function (err, data) {
            //console.log( data );
            res.end( data );
        });
    });
    
    //1. 사용자 불러오기
    app.get('/getUser/:username', function(req, res){
        fs.readFile(__dirname + "/../data/user.json", 'utf8', function (err, data) {
            var users = JSON.parse(data);
            res.json(users[req.params.username]);
        });
    });
        
        //2. 사용자 등록하기
    app.post('/addUser/:username', function(req, res){ 
        
        var result = { }; 
        var username = req.params.username; 

        // CHECK REQ VALIDITY
        if(!req.body["password"] || !req.body["name"]){
            result["success"] = 0;
            result["error"] = "invalid request";
            res.json(result);
            return;
        }
        
        // LOAD DATA & CHECK DUPLICATION
        fs.readFile(__dirname + "/../data/user.json", 'utf8', function(err, data){
            var users = JSON.parse(data);
            if(users[username]){ 
                // DUPLICATION FOUND 
                result["success"] = 0;
                result["error"] = "duplicate";
                res.json(result);
                return;
            }

            // ADD TO DATA
            users[username] = req.body; 
            
            // SAVE DATA
            fs.writeFile(__dirname + "/../data/user.json", JSON.stringify(users, null, '\t'), "utf8", function(err, data){
                result = {"success": 1}; 
                res.json(result); 
            })
        })
    });
        
        //3. 사용자 삭제하기
    app.delete('/deleteUser/:username', function(req, res){
        var result = { };
        //LOAD DATA
        fs.readFile(__dirname + "/../data/user.json", "utf8", function(err, data){
            var users = JSON.parse(data); 

            // IF NOT FOUND
            if(!users[req.params.username]){
                result["success"] = 0;
                result["error"] = "not found";
                res.json(result);
                return; 
            }

            delete users[req.params.userName];
            fs.writeFile(__dirname + "/../data/user.json", JSON.stringify(users, null, '\t'), "utf8", function(err, data){
                result["success"] = 1;
                res.json(result);
                return;
            })
        })

    })
}

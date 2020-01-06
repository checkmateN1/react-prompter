// const io = require("socket.io");
const server = require('http').createServer();
const io = require('socket.io')(server);
// const server = io.listen(3001);


const moment = require('moment');
const fs = require('fs');
const _ = require('lodash');

// event fired every time a new client connects:
io.on('connection', client => {

    console.info(`Client connected`);
    client.emit('authorizationSuccess');

    // config
    client.on('getConfig', () => {
        fs.readFile('json_config.txt', 'utf8',
            (error, data) => {
                if(error) {
                    console.info('error reading config file: json_config.txt');
                } else {
                    client.emit('config', data);
                }
            });
    });
    client.on('getConfigSuccess', () => {
        console.info(`Client successfully received config`);
    });

    // css
    client.on('getCSS', () => {
        fs.readFile('prompt.css', 'utf8',
            (error, data) => {
                if(error) {
                    console.info('error reading style file: prompt.css');
                } else {
                    client.emit('css', data);
                }
            });
    });
    client.on('getCSSSuccess', () => {
        console.info(`Client [${token}] successfully received prompter .css file`);
    });

    // frames and prompts
    client.on('frame', data => {
        if (!_.isEmpty(data)) {
            console.log(`got frame at ${moment().format('dddd, MMMM Do YYYY, h:mm:ss a')}`);
            client.emit('frameSuccess', data.id);
            const frameData = JSON.parse(data);

            fs.appendFileSync('frames_log.txt',
                `got frame at ${moment().format('dddd, MMMM Do YYYY, h:mm:ss a')} \r\n
                        ${data} \r\n \r\n \r\n`,
                function(error){
                    if(error) throw error; // если возникла ошибка
                });

            const prompterData = {
                request: {
                    requestType: 'prompter',
                },
                data: frameData,
                client,
            };
        } else {
            client.emit('frameError', data);
        }
    });
    client.on('getPromptSuccess', () => {
        console.info('client got prompt success');
    });

    // // simulations
    // client.on('simulations', data => {
    //     if (!_.isEmpty(data)) {
    //         client.emit('simulationsSuccess');
    //
    //         console.log(data);
    //
    //         (async function() {
    //             const result = await sessionsHandler.sessionsListener(token, client.id, data);
    //             client.emit('simulationsResponse', result);
    //         })();
    //
    //     } else {
    //         client.emit('simulationsError', data);
    //     }
    // });

    client.on('disconnect', () => {
        console.info(`Client gone [${client.id}]`);
    });
});

server.listen(3001, 'localhost', function(){
    console.log("Сервер ожидает подключения...");
});
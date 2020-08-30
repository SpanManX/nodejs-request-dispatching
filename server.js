const Koa = require('koa');
const app = new Koa();
const json = require('koa-json');
const onerror = require('koa-onerror');
const bodyparser = require('koa-bodyparser');
const logger = require('koa-logger');
const cors = require('koa2-cors');
const axios = require('axios');
const readline = require('readline');
const fs = require('fs');
const os = require("os");

let address = '';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let path = `${os.homedir()}\\proxy-config.json`;  // 文件路径

fs.readFile(path, function (err, data) {
    // 有proxy-config.json文件就读取，没有就写入
    if (err) {
        // 写入
        // 等待用户输入
        rl.question('请输入请求地址：', (answer) => {
            console.log(`请求地址：${answer}`);
            // 写入json文件
            writeFile(answer);
        });
    } else {
        // 读取
        let obj = data.toString();
        address = JSON.parse(obj).request_address;
        console.log(`请求地址：${address}`);
    }
});

// 监听用户输入
rl.on('line', function (line) {
    let value = line.trim().split(' ');
    if (value[0] === 'requestip') {
        writeFile(value[1]);
        console.log(`变更请求地址为：${value[1]}`);
    } else {
        console.log('没有找到命令！');
    }
});

//CORS
app.use(cors({
    origin: '*'
}));

// error handler
onerror(app);

// middlewares
app.use(bodyparser({
    enableTypes: ['json', 'form', 'text']
}));

app.use(json());
app.use(logger());

// logger
app.use(async (ctx, next) => {
    const start = new Date();
    await next();
    const ms = new Date() - start;
    console.log(`${address} - ${ctx.method} ${ctx.url} - ${ms}ms`)
});

// 前端请求转发
app.use(async function (ctx) {
    const http = axios.create({
        baseURL: `http://${address}`,
    });
    try {
        await http({
            url: ctx.url,
            method: ctx.method,
            headers: {'Authorization': ctx.headers.authorization},
            data: ctx.request.body,
        }).then(async data => {
            ctx.body = data.data;
            ctx.status = data.status
        })
    } catch (e) {
        // 请求后端错误返回
        ctx.body = e.response.data;
        ctx.status = e.response.status
    }
});

// 返回错误
app.on('errorHandle.js', (err, ctx) => {
    console.error(err)
});
module.exports = app;

/**
 *  写入JSON文件
 *  @param {String} data - ip地址
 **/
function writeFile(data) {
    fs.writeFile(path, `{"request_address":"${data}"}`, function (err) {
        if (err) {
            return console.error(err)
        } else {
            address = data
        }
    });
}

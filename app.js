//IMPORT ALL DEPENDENCIES
const express = require("express");
const app = express();
const mongoose = require("mongoose");
var server = require('http').Server(app);
var io = require('socket.io')(server);
const dotenv = require("dotenv");
const path = require('path')
const bodyParser = require("body-parser");
const cors = require("cors")

//DOTENV CONFIGURATION
dotenv.config();

// view engine setup
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

app.use(express.static(path.join(__dirname + '/public')));

//DEFINE BODY-PARSER AS JSON
app.use(cors())
app.use(bodyParser.urlencoded({ urlextended: false }));
app.use(bodyParser.json());

//IMPORT ROUTES
const routes = require("./routes/main.r");
app.use("/", routes);

//CONNECTION WITH DATABASE
try {
    let db_path = process.env.db_url;
    if (!db_path) throw new Error();
    connectDB(db_path);
} catch (error) {
    console.log("Path undefined!." + error.message);
}

//CONNECTION WITH DATABASE
function connectDB(db_path) {
    mongoose.connect(db_path, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
    });
    var db = mongoose.connection;

    db.on("error", console.error.bind(console, "error occur in connectdb"));
    db.once("open", function callback() {
        console.log("connected with database successfully.");
    });
}

//CONNECTION WITH SERVER
try {
    let port = process.env.port;
    if (!port) throw new Error();
    connectServer(port);
} catch (error) {
    console.log("port undefined!." + error.message);
}

function connectServer(port) {
    server.listen(port, () => {
        console.log("server started at : " + port);
    });
}


// socket
const qModel = require('./models/question.m');
const uModel = require('./models/user.m');
const qLeaderModel = require("./models/qleader.m");

// PRE-DEFINED VARIABLES
var numClients = 0;
const activeUsers = new Set();
let answered_user = 0;
let option = {
    q0: 0,
    q1: 0,
    q2: 0,
    q3: 0
}
var point_count_array = [];
var live_point = 0;

io.on('connection', async function (socket) {
    numClients++;

    io.sockets.emit('client', { numClients: numClients });

    socket.on("new user", function (data) {
        socket.userId = data;
        activeUsers.add(data);
        io.emit("active number", activeUsers.size);
    });

    let index = 0;
    let q = await qModel.find().sort({ _id: -1 });

    socket.on("start game", async function (data) {
        answered_user = 0;
        point_count = 0;
        point_count_array = [];
        option = {
            q0: 0,
            q1: 0,
            q2: 0,
            q3: 0
        }
        live_point = 2 * activeUsers.size;
        await qModel.findByIdAndUpdate(q[index]._id, { point: live_point });
        io.emit('game status', { game_status: true });
        io.emit('question', { q: q[index], index: index, length: q.length });
    });
  
    socket.on('next', async function (data) {
        point_count = 0;
        point_count_array = [];
        answered_user = 0;
        option = {
            q0: 0,
            q1: 0,
            q2: 0,
            q3: 0
        }
        live_point = 2 * activeUsers.size;
        await qModel.findByIdAndUpdate(q[data.index]._id, { point: live_point });
        io.emit('question', { q: q[data.index], index: data.index, length: q.length });
    });

    socket.on('option click', async function (data) {
        answered_user++;
        if (typeof data.option == 'object') {
            data.option.forEach((ele) => {
                option[ele] += 1;
            })
        } else {
            option[data.option] += 1;
        }
        io.emit('option count', { answered_user: answered_user, option_click: option });
    });

    socket.on('add point', async function (data) {
        point_count_array.push(data.userId);
        let user = await uModel.findById(data.userId);
        user.point += (live_point - point_count_array.indexOf(data.userId));
        await user.save();
    });

    socket.on('index', function (data) {
        io.emit('index admin', { index: data.index });
    })

    socket.on('leaderboard', async function (data) {
        let user = await uModel.find({}).sort({ point: -1 });
        socket.emit('get score', { users: user });
    });

    socket.on('rank', async function (data) {
        let user = await uModel.findById(data.userId);
        io.emit('get rank', { rank: user.rank });
        await uModel.findByIdAndUpdate(data.userId, { rank: data.rank });
    });

    socket.on('disconnect', function () {
        numClients--;
        activeUsers.delete(socket.userId);
        io.emit('user disconnected', socket.userId);
    })
});
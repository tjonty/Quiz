// IMPORT DEPENDENCIES
const mongoose = require("mongoose");
const moment = require("moment");

let Schema = mongoose.Schema;

let userSchema = new Schema({
    name: {
        type: String,
        default: ""
    },
    nickname: {
        type: String,
        unique: true,
        required: true
    },
    point :{ 
        type: Number,
        default: 0
    }
}, { versionKey: false })

module.exports = mongoose.model("User", userSchema);

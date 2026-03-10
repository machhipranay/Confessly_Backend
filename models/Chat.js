import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    content : {
        type : String,
        required : true,
    },

    from : {
        type : String,
        default : "",
    },

    isConfession : {
        type : Boolean,
        default : false,
    },

    group : {
        type : mongoose.Schema.Types.ObjectId,
        required : true,
    },

    timestamp : {
        type : Date,
        default : Date.now,
    },

});

export const Chat = mongoose.model("Chat", chatSchema);
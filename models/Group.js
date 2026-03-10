import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
    name : {
        type : String,
        required : true,
    },

    members : {
        type : [String],
        default : [],
    },

    admin : {
        type : String,
        default : "",
    },

    chats : {
        type : [mongoose.Schema.Types.ObjectId],
        default : [],
    },

    inviteCode : {
        type : String,
        default : "",
    },

    inviteExpiry : {
        type : Date,
        default : Date.now,
    }

});

export const Group = mongoose.model("Group", groupSchema);
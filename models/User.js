import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username : {
        type : String,
        required : true,
        unique : true
    },

    password : {
        type : String,
        required : true
    },

    nickName : {
        type : String,
        required : true
    },
    
    isPrivateAccount : {
        type : Boolean,
        default : false,
    },

    profilePhoto : {
        type : String,
        default : "",
    },

    groups : {
        type : [mongoose.Schema.Types.ObjectId],
        default : [],
    },

    personalChat : {
        type : [String],
        default : [],
    },

    followers : {
        type : [String],
        default : [],
    },
    
    followings : {
        type : [String],
        default : [],
    },
    
    friends : {
        type : [String],
        default : [],
    },
});

export const User = mongoose.model("User", userSchema);
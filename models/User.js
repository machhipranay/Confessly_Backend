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
        default : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png" // default image placeholder
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
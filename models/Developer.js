import mongoose from 'mongoose';

const devSchema = new mongoose.Schema({
    username : {
        type : String,
        required : true,
        unique : true
    },

    password : {
        type : String,
        required : true
    },

});

export const Developer = mongoose.model("Developer", devSchema);
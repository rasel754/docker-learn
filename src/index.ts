import express from 'express';
import mongoose from 'mongoose';


const app = express();

app.use(express.json());


//schema and model 
const itemSchema = new mongoose.Schema({
    name:{type:String,required:true}
})
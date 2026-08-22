import express from 'express';
import mongoose, { Connection } from 'mongoose';


const app = express();

app.use(express.json());


//schema and model 
const itemSchema = new mongoose.Schema({
    name: { type: String, required: true }
})


//utility : create DB connection 

async function connectToDatabase(url: string): Promise<Connection> {
    const connection = await mongoose.createConnection(url).asPromise();
    return connection;
}

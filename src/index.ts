import express from 'express';
import mongoose, { Connection } from 'mongoose';
import axios from 'axios';


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


// demo one : container to internet 
app.get("/internet/:id", async (req, res) => {
    try {
        const { data } = await axios.get(
            `https://jsonplaceholder.typicode.com/posts/${req.params.id}`
        )
        res.json({
            demo: "Internet to Container",
            data
        })
    } catch (error) {
        res.status(500).json({ message: "error in demo one" })
    }
})


app.listen(3000, () => {
    console.log(`Server is running on port 3000`)
})

const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV;

app.use(express.json());

app.get('/', (req, res) => {
    res.send(`Hello World! from Express.js docker container in ${nodeEnv} environment`);
});

// demo one : container to internet 
app.get("/internet/:id", async (req, res) => {
    try {
        const { data } = await axios.get(
            `https://jsonplaceholder.typicode.com/posts/${req.params.id}`
        );
        res.json({
            demo: "Internet to Container",
            data
        });
    } catch (error) {
        res.status(500).json({ message: "error in demo one" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});



//container to host/atlas communication 

app.get("/host-db", async (_req, res) => {
    try {

    } catch (error) {

    }
})
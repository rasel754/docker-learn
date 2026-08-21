const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;
const nodeEnv = process.env.NODE_ENV ;

app.get('/', (req, res) => {
    res.send(`Hello World! from Express.js docker container in ${nodeEnv} environment`);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
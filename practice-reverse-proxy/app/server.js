const express = require('express');
const os = require('os');
const app = express();

const PORT = 3000;

const INSTANCE= process.env.INSTANCE || os.hostname();

app.get('/', (req, res) => {
  res.send(`Hello from instance: ${INSTANCE}`);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} - ${INSTANCE}`);
});
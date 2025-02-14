const express = require('express');
const cors = require('cors');
const database = require('./database.js');
const dataRoutes = require('./routes/dataRoutes');

const app = express();
app.use(cors());
app.use(express.json());

database.connect();

app.use('/api/users', dataRoutes);

app.listen(3000, () => console.log("Server has been enabled!"));

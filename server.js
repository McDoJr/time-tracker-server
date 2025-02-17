const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(express.json());
app.use(cors());

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dtr'
});

// Emit changes when database is updated
async function notifyClients(event, table, data) {
    io.emit("db_change", { event, table, data });
}

// Get data
app.post("/api/select", async (req, res) => {
    try {
        const { table, columns = "*", where, orderBy, limit, offset } = req.body;
        let sql = `SELECT ${columns} FROM ${table}`;
        let values = [];

        if (where) {
            const conditions = Object.keys(where).map((key) => {
                const value = where[key];

                if (typeof value === "object") {
                    // Handle other operators like >, >=, !=
                    const [operator] = Object.entries(value)[0];
                    return `${key} ${operator} ?`;
                }

                return `${key} = ?`;
            });

            sql += ` WHERE ${conditions.join(" AND ")}`;

            values = Object.values(where).map((value) => {
                if(typeof value === "object") {
                    const [_, val] = Object.entries(value)[0];
                    return val;
                }

                return value;
            });
        }

        if (orderBy) sql += ` ORDER BY ${orderBy.column} ${orderBy.direction}`;
        if (limit) sql += ` LIMIT ${limit}`;
        if (offset) sql += ` OFFSET ${offset}`;

        const [rows] = await pool.query(sql, values);
        res.json({data: rows, error: null});
    } catch (error) {
        res.status(500).json({ data: null, error: error.message });
    }
});

// Insert data
app.post("/api/insert", async (req, res) => {
    try {
        const { table, data } = req.body;
        const columns = Object.keys(data).join(", ");
        const placeholders = Object.keys(data).map(() => "?").join(", ");
        const values = Object.values(data);
        const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
        const [result] = await pool.query(sql, values);
        const insertedId = result.insertId; // Get the inserted ID

        const newRow = { id: insertedId, ...data }; // Include the ID in the response

        notifyClients("insert", table, newRow); // Emit with correct data

        res.json({ message: "Data inserted successfully", insertedId, newRow });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update data
app.post("/api/update", async (req, res) => {
    try {
        const { table, data, where } = req.body;

        // Fetch the old data before updating
        const whereClause = Object.keys(where).map((key) => `${key} = ?`).join(" AND ");
        const whereValues = Object.values(where);
        const [oldRows] = await pool.query(`SELECT * FROM ${table} WHERE ${whereClause}`, whereValues);

        if (oldRows.length === 0) {
            return res.status(404).json({ error: "No matching records found to update" });
        }

        // Perform the update
        const setClause = Object.keys(data).map((key) => `${key} = ?`).join(", ");
        const values = [...Object.values(data), ...whereValues];
        const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
        await pool.query(sql, values);

        // Fetch the updated data
        const [newRows] = await pool.query(`SELECT * FROM ${table} WHERE ${whereClause}`, whereValues);

        // Emit update event with old and new values
        notifyClients("update", table, { old: oldRows, new: newRows });

        res.json({ message: "Data updated successfully", data: newRows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete data
app.post("/api/delete", async (req, res) => {
    try {
        const { table, where } = req.body;

        // Fetch the old data before deleting
        const whereClause = Object.keys(where).map((key) => `${key} = ?`).join(" AND ");
        const values = Object.values(where);
        const [oldRows] = await pool.query(`SELECT * FROM ${table} WHERE ${whereClause}`, values);

        if (oldRows.length === 0) {
            return res.status(404).json({ error: "No matching records found to delete" });
        }

        // Perform the deletion
        const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
        await pool.query(sql, values);

        // Emit delete event with old values
        notifyClients("delete", table, { old: oldRows, new: null });

        res.json({ message: "Data deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// WebSocket connection
io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

server.listen(3000, () => console.log("Server running on port 3000"));

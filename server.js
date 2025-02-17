const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dtr'
});

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
        await pool.query(sql, values);
        res.json({ message: "Data inserted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update data
app.post("/api/update", async (req, res) => {
    try {
        const { table, data, where } = req.body;
        const setClause = Object.keys(data).map((key) => `${key} = ?`).join(", ");
        const whereClause = Object.keys(where).map((key) => `${key} = ?`).join(" AND ");
        const values = [...Object.values(data), ...Object.values(where)];
        const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
        await pool.query(sql, values);
        res.json({ message: "Data updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete data
app.post("/api/delete", async (req, res) => {
    try {
        const { table, where } = req.body;
        const whereClause = Object.keys(where).map((key) => `${key} = ?`).join(" AND ");
        const values = Object.values(where);
        const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
        await pool.query(sql, values);
        res.json({ message: "Data deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log("Server running on port 3000"));

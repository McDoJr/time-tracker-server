const { connection } = require('../database');
const DataManager = require('../database-query');
const {getCurrentDate} = require("../utils/utils");

const fetchUserData = async (req, res) => {
    const { device_id: device_mac } = req.body;
    let table = new DataManager(connection, "tbl_employees");
    const columns = ['emp_number', 'cfname', 'cmname', 'clname', 'device_mac'];

    table.findOne(columns, {device_mac}, result => {
        res.json({user: result});
    });
}

const fetchLogs = async (req, res) => {
    const { emp_number, min, max } = req.body;
    const sql = `SELECT * FROM tbl_attendance WHERE emp_number = ?
                             ORDER BY ddatetime DESC LIMIT ${max - min} OFFSET ${min}`;

    connection.query(sql, [emp_number], (error, result) => {
        if(error) throw error;
        return res.json(result);
    });
}

const setTimeIn = async (req, res) => {
    const { emp_number, cin_out } = req.body;
    let table = new DataManager(connection, "tbl_attendance");

    const { date, time } = getCurrentDate();

    table.insert({cin_out, ddatetime: `${date} ${time}`, emp_number}, result => {
        return res.json({status: !!result});
    })

    // table.findDateTimeRange(['ddatetime'], {emp_number}, `${date}/08:00:00/10:00:00`, result => {
    //
    //     if(result) {
    //         const dates = result.map(row => ({
    //             date_time: new Date(row.ddatetime).toLocaleTimeString("en-GB", { hour12: false }) // Convert to ISO format
    //         }));
    //
    //         console.log(dates);
    //     }
    //
    // });
}

module.exports = {
    fetchUserData,
    setTimeIn,
    fetchLogs
}
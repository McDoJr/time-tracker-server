class DataTable {

    constructor(db, table) {
        this.db = db;
        this.table = table;
    }

    setTable = (table) => {
        this.table = table;
    }

    findAll = (callback) => {
        let sql = `SELECT * FROM ${this.table}`;
        this.db.query(sql, (error, result) => {
            if(error) throw error;
            return callback(result);
        });
    }

    insert = (datas, callback) => {
        const sql = `INSERT INTO ${this.table} (${Object.keys(datas).join(',')}) VALUES (?)`;
        this.db.query(sql, [Object.values(datas)], (error, result) => {
            if(error) throw error;
            return callback(result);
        });
    }

    // a helper function for getting date time range that only works on tbl_attendance table
    findDateTimeRange = (columns, datas, range, callback) => {
        const [date, min, max] = range.split("/");
        this.findSome(columns, {...datas, "DATE(ddatetime)": date, "TIME(ddatetime):>=": min, "TIME(ddatetime):<=": max}, callback);
    }

    findSome = (columns, datas, callback) => {
        let conditions = `${Object.keys(datas)
            .map((data, index) => {
                const temp = data.split(':');
                const name = temp[0];
                const operator = temp.length > 1 ? temp[1] : "=";
                return index === 0 ? `${name} ${operator} ?` : ` AND ${name} ${operator} ?`;
            })
            .join("")}`;
        const selectors = columns && columns.length === 0 ? "*" : columns.join(', ');
        let sql = `SELECT ${selectors} FROM ${this.table} WHERE ${conditions}`;
        this.db.query(sql, Object.values(datas), (error, result) => {
            if(error) throw error;
            return callback(result.length > 0 ? result : null);
        });
    }

    findOne = (columns, datas, callback) => {
        this.findSome(columns, datas, (result) => {
            return callback(result ? result[0] : null);
        });
    }

    delete = (datas, callback) => {
        let conditions = `${Object.keys(datas)
            .map((data, index) => {
                return index === 0 ? `${data} = ?` : ` AND ${data} = ?`;
            })
            .join("")}`;
        let sql = `DELETE FROM ${this.table} WHERE ${conditions}`;
        this.db.query(sql, Object.values(datas), (error, result) => {
            if(error) throw error;
            return callback(result);
        })
    }

    // datas must be a list of object with the primary key at the start
    updateVotes = (datas, callback) => {
        const values = [];
        const condition = Object.keys(datas[0])
            .filter((_value, index) => index > 0)
            .map(value => `${value} = VALUES(${value})`)
            .join(',');
        for(const data of datas) {
            values.push(`(${Object.values(data).join(',')})`);
        }

        let sql = `INSERT INTO ${this.table} (${Object.keys(datas[0]).join(',')}) 
                    VALUES ${values.join(",")} 
                    ON DUPLICATE KEY UPDATE ${condition}`;

        this.db.query(sql, (error, result) => {
            if(error) throw error;
            return callback(result);
        })
    }

    update = (datas, conditions, callback) => {
        let values = [...Object.values(datas), ...Object.values(conditions)]
        let condition = `${Object.keys(conditions)
            .map((data, index) => {
                return index === 0 ? `${data} = ?` : ` AND ${data} = ?`;
            })
            .join("")}`;
        let updates = `${Object.keys(datas)
            .map((data, index) => {
                return `${data} = ?`;
            })
            .join(",")}`;
        let sql = `UPDATE ${this.table} SET ${updates} WHERE ${condition}`;
        this.db.query(sql, values, (error, result) => {
            if(error) throw error;
            return callback(result);
        })
    }
}

module.exports = DataTable;
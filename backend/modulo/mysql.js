const mySql = require("mysql2/promise");

const SQL_CONFIGURATION_DATA = {
  host: process.env.MYSQL_HOST ,
  user: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD, 
  database: process.env.MYSQL_DB, 
  port: process.env.MYSQL_PORT || 3306,
  charset: 'UTF8_GENERAL_CI'
};

exports.realizarQuery = async function (queryString, params = []) {
  let connection;
  try {
    connection = await mySql.createConnection(SQL_CONFIGURATION_DATA);
    const [rows] = await connection.execute(queryString, params);
    return rows;
  } catch (err) {
    console.error("Error en la consulta SQL:", err);
    throw err;
  } finally {
    if (connection && connection.end) {
      await connection.end();
    }
  }
};
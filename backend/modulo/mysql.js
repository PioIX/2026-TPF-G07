// backend/modulo/mysql.js
// Módulo de conexión a MySQL. Lo importa el servidor con:
//   const { realizarQuery } = require("./modulo/mysql");
// Los datos de conexión salen del archivo .pio.env (MYSQL_HOST, MYSQL_USERNAME,
// MYSQL_PASSWORD, MYSQL_DB y, opcional, MYSQL_PORT).

const mySql = require("mysql2/promise");

const SQL_CONFIGURATION_DATA = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
  port: process.env.MYSQL_PORT || 3306,
  charset: "UTF8_GENERAL_CI",
};

// Ejecuta una consulta y devuelve las filas (o el resultado del INSERT/UPDATE/DELETE).
// Los valores del usuario van siempre en `params` y se marcan con "?" en la consulta:
// así MySQL los trata como datos y no como código (evita inyección SQL).
exports.realizarQuery = async function (queryString, params = []) {
  let connection;
  try {
    // Abre una conexión nueva para esta consulta
    connection = await mySql.createConnection(SQL_CONFIGURATION_DATA);
    const [rows] = await connection.execute(queryString, params);
    return rows;
  } catch (err) {
    console.error("Error en la consulta SQL:", err);
    throw err; // el servidor decide cómo responder (try/catch en cada ruta)
  } finally {
    // Siempre cierra la conexión, haya salido bien o mal
    if (connection && connection.end) {
      await connection.end();
    }
  }
};
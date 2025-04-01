// db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: '185.104.106.235',
    port: '3306', // Порт по умолчанию для MySQL в MAMP
    user: 'root', // Имя пользователя по умолчанию для MySQL в MAMP
    password: 'Artyom08', // Пароль по умолчанию для MySQL в MAMP
    database: 'yungel_participants' // Убедитесь, что это правильное имя базы данных
});

pool.getConnection()
    .then(connection => {
        console.log('Successfully connected to the database.');
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to the database:', err);
    });

module.exports = pool;

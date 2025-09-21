const sqlite3 = require('sqlite3').verbose();

// Open a database handle. The file is created if it does not exist.
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});

// Create the users table if it doesn't exist.
// We use TEXT for the password hash. The username must be unique.
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
)`, (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log("'users' table is ready.");
});

// Create a table for password reset tokens
db.run(`CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
)`, (err) => {
    if (err) return console.error(err.message);
    console.log("'password_resets' table is ready.");
});

module.exports = db;
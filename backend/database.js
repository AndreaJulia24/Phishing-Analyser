const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'phishing_analyser.db');

//rakapcsolas a SQLite adatbázisra
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }   
});

//tablak egymas utani letrehozasa

db.serialize(() => {
    //felhasznalok tabla letrehozasa
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    //url_analyses tabla letrehozasa
    db.run(`CREATE TABLE IF NOT EXISTS url_analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        target_url TEXT NOT NULL,
        domain TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        country TEXT,
        city TEXT,
        isp TEXT,
        latitude REAL,
        longitude REAL,
        security_score INTEGER NOT NULL,
        risk_score INTEGER NOT NULL,
        verdict TEXT NOT NULL,
        reasons TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    //campaigns tabla letrehozasa
    db.run(`CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        target_brand TEXT NOT NULL,
        description TEXT,
        severity_level TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    //quiz score tabla letrehozasa
    db.run(`CREATE TABLE IF NOT EXISTS quiz_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

module.exports = db; 
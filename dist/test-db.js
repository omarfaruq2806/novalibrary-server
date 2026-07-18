"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./config/db");
async function testConnection() {
    console.log('Attempting to connect to MongoDB...');
    try {
        const db = await (0, db_1.connectDB)();
        console.log(`Connection successful! Connected to database: "${db.databaseName}"`);
        process.exit(0);
    }
    catch (error) {
        console.error('Failed to connect to the database.');
        process.exit(1);
    }
}
testConnection();

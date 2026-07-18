"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
exports.getDb = getDb;
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const uri = process.env.MONGODB_URI;
if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable in .env');
}
let client;
let db;
async function connectDB() {
    if (db)
        return db;
    try {
        client = new mongodb_1.MongoClient(uri);
        await client.connect();
        console.log('Successfully connected to MongoDB.');
        db = client.db(process.env.DB_NAME || 'novalibrary');
        return db;
    }
    catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
}
function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call connectDB first.');
    }
    return db;
}

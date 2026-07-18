"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)({
    origin: true, // Reflects the request origin, or configure specific list
    credentials: true,
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health Check Route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Nova Library backend service is healthy.' });
});
const bookRoutes_1 = __importDefault(require("./routes/bookRoutes"));
// Placeholder for route registrations (will be added in future prompts)
// app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes_1.default);
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
        error: err.message || 'Internal Server Error',
    });
});
// Connection to Database & Server Startup
async function bootstrap() {
    try {
        // Check if URI is provided before attempting connection
        if (process.env.MONGODB_URI) {
            await (0, db_1.connectDB)();
        }
        else {
            console.warn('WARNING: MONGODB_URI not found. MongoDB client remains uninitialized.');
        }
        app.listen(PORT, () => {
            console.log(`[server]: Express server is running at http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start backend bootstrap:', error);
        // Keep server alive or exit
        process.exit(1);
    }
}
bootstrap();

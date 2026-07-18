"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
// Use memory storage for buffer-based uploads
const storage = multer_1.default.memoryStorage();
exports.upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'pdf') {
            if (file.mimetype === 'application/pdf') {
                cb(null, true);
            }
            else {
                cb(new Error('Only PDF documents are allowed.'));
            }
        }
        else if (file.fieldname === 'cover') {
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            }
            else {
                cb(new Error('Only image files are allowed for the cover.'));
            }
        }
        else {
            cb(new Error('Unexpected file field.'));
        }
    },
});

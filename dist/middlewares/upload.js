"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMultiple = exports.uploadAvatar = void 0;
const multer_1 = __importDefault(require("multer"));
// Configure multer to use memory storage (we'll upload to CDN, not local disk)
const storage = multer_1.default.memoryStorage();
// File filter for images only
const imageFilter = (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
        cb(new Error('Only image files are allowed!'));
        return;
    }
    cb(null, true);
};
// Configure multer
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    fileFilter: imageFilter
});
// Middleware for single file upload (avatar)
exports.uploadAvatar = upload.single('avatar');
// Middleware for multiple file uploads
exports.uploadMultiple = upload.array('files', 10); // max 10 files
exports.default = upload;

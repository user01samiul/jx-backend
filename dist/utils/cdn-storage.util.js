"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCDNUrl = exports.getFileNameFromCDNUrl = exports.getCDNUrl = exports.uploadAndCleanup = exports.deleteLocalFile = exports.uploadBufferToCDN = exports.uploadToCDN = void 0;
// src/utils/cdn-storage.util.ts
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * CDN Storage Configuration
 * Uses JackpotX CDN storage at https://cdn.jackpotx.net
 */
const CDN_CONFIG = {
    uploadUrl: 'https://cdn.jackpotx.net/storage.php',
    cdnBaseUrl: 'https://cdn.jackpotx.net/cdnstorage',
    authToken: process.env.CDN_AUTH_TOKEN || '2ZqQk9',
};
/**
 * Upload a file to CDN storage
 * @param filePath - Local file path to upload
 * @param fileName - Optional custom filename (will use original if not provided)
 * @returns CDN URL of uploaded file
 */
const uploadToCDN = async (filePath, fileName) => {
    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        // Read file as buffer (more reliable than stream for small files)
        const fileBuffer = fs.readFileSync(filePath);
        const fileStats = fs.statSync(filePath);
        // Use provided filename or extract from path
        const uploadFileName = fileName || path.basename(filePath);
        // Create form data
        const formData = new form_data_1.default();
        formData.append('action', 'upload');
        formData.append('file', fileBuffer, {
            filename: uploadFileName,
            contentType: getMimeType(uploadFileName),
        });
        console.log(`Uploading to CDN: ${uploadFileName} (${fileStats.size} bytes)`);
        // Upload to CDN
        const response = await axios_1.default.post(CDN_CONFIG.uploadUrl, formData, {
            headers: Object.assign(Object.assign({}, formData.getHeaders()), { 'Authorization': `Bearer ${CDN_CONFIG.authToken}` }),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 30000, // 30 second timeout
        });
        console.log('CDN response:', response.data);
        // Check response
        if (response.data && response.data.ok === true) {
            // CDN API returns { ok: true, url: "..." }
            const cdnUrl = response.data.url || `${CDN_CONFIG.cdnBaseUrl}/${uploadFileName}`;
            return cdnUrl;
        }
        else if (response.data && response.data.success) {
            // Alternative success format
            const cdnUrl = `${CDN_CONFIG.cdnBaseUrl}/${uploadFileName}`;
            return cdnUrl;
        }
        else if (response.data && response.data.url) {
            // Some CDN APIs return the URL directly
            return response.data.url;
        }
        else if (response.data && response.data.ok === false) {
            // CDN API returned error
            throw new Error(response.data.error || 'CDN upload failed');
        }
        else {
            // Fallback: assume success and construct URL
            const cdnUrl = `${CDN_CONFIG.cdnBaseUrl}/${uploadFileName}`;
            console.log('Assuming upload success, constructed URL:', cdnUrl);
            return cdnUrl;
        }
    }
    catch (error) {
        console.error('CDN upload error:', error.message);
        if (error.response) {
            console.error('CDN response status:', error.response.status);
            console.error('CDN response data:', error.response.data);
        }
        throw new Error(`Failed to upload to CDN: ${error.message}`);
    }
};
exports.uploadToCDN = uploadToCDN;
/**
 * Get MIME type from filename
 * @param fileName - Filename
 * @returns MIME type
 */
const getMimeType = (fileName) => {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain',
    };
    return mimeTypes[ext] || 'application/octet-stream';
};
/**
 * Upload a file buffer to CDN storage
 * @param buffer - File buffer
 * @param fileName - Filename for the upload
 * @param mimeType - MIME type of the file
 * @returns CDN URL of uploaded file
 */
const uploadBufferToCDN = async (buffer, fileName, mimeType) => {
    try {
        // Create form data
        const formData = new form_data_1.default();
        formData.append('action', 'upload');
        formData.append('file', buffer, {
            filename: fileName,
            contentType: mimeType,
        });
        // Upload to CDN
        const response = await axios_1.default.post(CDN_CONFIG.uploadUrl, formData, {
            headers: Object.assign(Object.assign({}, formData.getHeaders()), { 'Authorization': `Bearer ${CDN_CONFIG.authToken}` }),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });
        // Check response
        if (response.data && response.data.success) {
            const cdnUrl = `${CDN_CONFIG.cdnBaseUrl}/${fileName}`;
            return cdnUrl;
        }
        else if (response.data && response.data.url) {
            return response.data.url;
        }
        else {
            const cdnUrl = `${CDN_CONFIG.cdnBaseUrl}/${fileName}`;
            return cdnUrl;
        }
    }
    catch (error) {
        console.error('CDN buffer upload error:', error.message);
        if (error.response) {
            console.error('CDN response:', error.response.data);
        }
        throw new Error(`Failed to upload buffer to CDN: ${error.message}`);
    }
};
exports.uploadBufferToCDN = uploadBufferToCDN;
/**
 * Delete local file after successful CDN upload
 * @param filePath - Local file path to delete
 */
const deleteLocalFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted local file: ${filePath}`);
        }
    }
    catch (error) {
        console.error(`Failed to delete local file ${filePath}:`, error.message);
        // Don't throw error - local file deletion is not critical
    }
};
exports.deleteLocalFile = deleteLocalFile;
/**
 * Upload file to CDN and delete local copy
 * @param localFilePath - Local file path
 * @param fileName - Optional custom filename
 * @returns CDN URL of uploaded file
 */
const uploadAndCleanup = async (localFilePath, fileName) => {
    try {
        // Upload to CDN
        const cdnUrl = await (0, exports.uploadToCDN)(localFilePath, fileName);
        // Delete local file after successful upload
        (0, exports.deleteLocalFile)(localFilePath);
        return cdnUrl;
    }
    catch (error) {
        // If upload fails, keep local file
        console.error('Upload failed, keeping local file:', error);
        throw error;
    }
};
exports.uploadAndCleanup = uploadAndCleanup;
/**
 * Get CDN URL from filename
 * @param fileName - Filename
 * @returns Full CDN URL
 */
const getCDNUrl = (fileName) => {
    return `${CDN_CONFIG.cdnBaseUrl}/${fileName}`;
};
exports.getCDNUrl = getCDNUrl;
/**
 * Extract filename from CDN URL
 * @param cdnUrl - Full CDN URL
 * @returns Filename only
 */
const getFileNameFromCDNUrl = (cdnUrl) => {
    return path.basename(cdnUrl);
};
exports.getFileNameFromCDNUrl = getFileNameFromCDNUrl;
/**
 * Check if URL is a CDN URL
 * @param url - URL to check
 * @returns true if URL is a CDN URL
 */
const isCDNUrl = (url) => {
    return url.startsWith(CDN_CONFIG.cdnBaseUrl);
};
exports.isCDNUrl = isCDNUrl;
exports.default = {
    uploadToCDN: exports.uploadToCDN,
    uploadBufferToCDN: exports.uploadBufferToCDN,
    deleteLocalFile: exports.deleteLocalFile,
    uploadAndCleanup: exports.uploadAndCleanup,
    getCDNUrl: exports.getCDNUrl,
    getFileNameFromCDNUrl: exports.getFileNameFromCDNUrl,
    isCDNUrl: exports.isCDNUrl,
};

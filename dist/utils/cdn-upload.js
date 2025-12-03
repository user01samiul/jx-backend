"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCDN = uploadToCDN;
exports.deleteFromCDN = deleteFromCDN;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const CDN_URL = 'https://cdn.jackpotx.net/storage.php';
const CDN_TOKEN = '2ZqQk9';
/**
 * Upload a file to the CDN
 * @param file - Express multer file object
 * @returns Promise with upload result containing the CDN URL
 */
async function uploadToCDN(file) {
    try {
        const formData = new form_data_1.default();
        formData.append('action', 'upload');
        formData.append('file', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype
        });
        const response = await axios_1.default.post(CDN_URL, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${CDN_TOKEN}`
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        // Assuming the CDN returns success status
        if (response.data && response.data.success !== false) {
            // Construct the URL based on the filename
            const filename = response.data.filename || file.originalname;
            const cdnUrl = `https://cdn.jackpotx.net/cdnstorage/${filename}`;
            return {
                success: true,
                url: cdnUrl
            };
        }
        return {
            success: false,
            error: response.data.error || 'Upload failed'
        };
    }
    catch (error) {
        console.error('CDN upload error:', error);
        return {
            success: false,
            error: error.message || 'Failed to upload to CDN'
        };
    }
}
/**
 * Delete a file from the CDN
 * @param filename - The filename to delete
 * @returns Promise with deletion result
 */
async function deleteFromCDN(filename) {
    try {
        const formData = new form_data_1.default();
        formData.append('action', 'delete');
        formData.append('filename', filename);
        const response = await axios_1.default.post(CDN_URL, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${CDN_TOKEN}`
            }
        });
        if (response.data && response.data.success !== false) {
            return {
                success: true
            };
        }
        return {
            success: false,
            error: response.data.error || 'Deletion failed'
        };
    }
    catch (error) {
        console.error('CDN deletion error:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete from CDN'
        };
    }
}

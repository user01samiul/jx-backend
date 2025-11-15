// src/utils/cdn-storage.util.ts
import axios from 'axios';
import * as FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';

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
export const uploadToCDN = async (
  filePath: string,
  fileName?: string
): Promise<string> => {
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
    const formData = new FormData();
    formData.append('action', 'upload');
    formData.append('file', fileBuffer, {
      filename: uploadFileName,
      contentType: getMimeType(uploadFileName),
    });

    console.log(`Uploading to CDN: ${uploadFileName} (${fileStats.size} bytes)`);

    // Upload to CDN
    const response = await axios.post(CDN_CONFIG.uploadUrl, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${CDN_CONFIG.authToken}`,
      },
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
    } else if (response.data && response.data.success) {
      // Alternative success format
      const cdnUrl = `${CDN_CONFIG.cdnBaseUrl}/${uploadFileName}`;
      return cdnUrl;
    } else if (response.data && response.data.url) {
      // Some CDN APIs return the URL directly
      return response.data.url;
    } else if (response.data && response.data.ok === false) {
      // CDN API returned error
      throw new Error(response.data.error || 'CDN upload failed');
    } else {
      // Fallback: assume success and construct URL
      const cdnUrl = `${CDN_CONFIG.cdnBaseUrl}/${uploadFileName}`;
      console.log('Assuming upload success, constructed URL:', cdnUrl);
      return cdnUrl;
    }
  } catch (error: any) {
    console.error('CDN upload error:', error.message);
    if (error.response) {
      console.error('CDN response status:', error.response.status);
      console.error('CDN response data:', error.response.data);
    }
    throw new Error(`Failed to upload to CDN: ${error.message}`);
  }
};

/**
 * Get MIME type from filename
 * @param fileName - Filename
 * @returns MIME type
 */
const getMimeType = (fileName: string): string => {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
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
export const uploadBufferToCDN = async (
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> => {
  try {
    // Create form data
    const formData = new FormData();
    formData.append('action', 'upload');
    formData.append('file', buffer, {
      filename: fileName,
      contentType: mimeType,
    });

    // Upload to CDN
    const response = await axios.post(CDN_CONFIG.uploadUrl, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${CDN_CONFIG.authToken}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    // Check response
    if (response.data && response.data.success) {
      const cdnUrl = `${CDN_CONFIG.cdnBaseUrl}/${fileName}`;
      return cdnUrl;
    } else if (response.data && response.data.url) {
      return response.data.url;
    } else {
      const cdnUrl = `${CDN_CONFIG.cdnBaseUrl}/${fileName}`;
      return cdnUrl;
    }
  } catch (error: any) {
    console.error('CDN buffer upload error:', error.message);
    if (error.response) {
      console.error('CDN response:', error.response.data);
    }
    throw new Error(`Failed to upload buffer to CDN: ${error.message}`);
  }
};

/**
 * Delete local file after successful CDN upload
 * @param filePath - Local file path to delete
 */
export const deleteLocalFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted local file: ${filePath}`);
    }
  } catch (error: any) {
    console.error(`Failed to delete local file ${filePath}:`, error.message);
    // Don't throw error - local file deletion is not critical
  }
};

/**
 * Upload file to CDN and delete local copy
 * @param localFilePath - Local file path
 * @param fileName - Optional custom filename
 * @returns CDN URL of uploaded file
 */
export const uploadAndCleanup = async (
  localFilePath: string,
  fileName?: string
): Promise<string> => {
  try {
    // Upload to CDN
    const cdnUrl = await uploadToCDN(localFilePath, fileName);

    // Delete local file after successful upload
    deleteLocalFile(localFilePath);

    return cdnUrl;
  } catch (error) {
    // If upload fails, keep local file
    console.error('Upload failed, keeping local file:', error);
    throw error;
  }
};

/**
 * Get CDN URL from filename
 * @param fileName - Filename
 * @returns Full CDN URL
 */
export const getCDNUrl = (fileName: string): string => {
  return `${CDN_CONFIG.cdnBaseUrl}/${fileName}`;
};

/**
 * Extract filename from CDN URL
 * @param cdnUrl - Full CDN URL
 * @returns Filename only
 */
export const getFileNameFromCDNUrl = (cdnUrl: string): string => {
  return path.basename(cdnUrl);
};

/**
 * Check if URL is a CDN URL
 * @param url - URL to check
 * @returns true if URL is a CDN URL
 */
export const isCDNUrl = (url: string): boolean => {
  return url.startsWith(CDN_CONFIG.cdnBaseUrl);
};

export default {
  uploadToCDN,
  uploadBufferToCDN,
  deleteLocalFile,
  uploadAndCleanup,
  getCDNUrl,
  getFileNameFromCDNUrl,
  isCDNUrl,
};

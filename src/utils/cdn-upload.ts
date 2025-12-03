import axios from 'axios';
import FormData from 'form-data';

const CDN_URL = 'https://cdn.jackpotx.net/storage.php';
const CDN_TOKEN = '2ZqQk9';

export interface CDNUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload a file to the CDN
 * @param file - Express multer file object
 * @returns Promise with upload result containing the CDN URL
 */
export async function uploadToCDN(file: Express.Multer.File): Promise<CDNUploadResult> {
  try {
    const formData = new FormData();
    formData.append('action', 'upload');
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype
    });

    const response = await axios.post(CDN_URL, formData, {
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
  } catch (error: any) {
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
export async function deleteFromCDN(filename: string): Promise<CDNUploadResult> {
  try {
    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('filename', filename);

    const response = await axios.post(CDN_URL, formData, {
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
  } catch (error: any) {
    console.error('CDN deletion error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete from CDN'
    };
  }
}

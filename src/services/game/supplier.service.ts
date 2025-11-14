import axios from 'axios';

const SUPPLIER_API_KEY = process.env.SUPPLIER_API_KEY;
const SUPPLIER_SECRET_KEY = process.env.SUPPLIER_SECRET_KEY;
const SUPPLIER_GAME_LIST_URL = process.env.SUPPLIER_GAME_LIST_URL;

if (!SUPPLIER_API_KEY || !SUPPLIER_SECRET_KEY || !SUPPLIER_GAME_LIST_URL) {
  throw new Error('Missing supplier API credentials or URL in environment variables');
}

/**
 * Fetch the game list from the supplier's API
 */
export const getSupplierGameList = async () => {
  try {
    // If the supplier requires custom headers, update here
    const headers = {
      'Content-Type': 'application/json',
      'apiKey': SUPPLIER_API_KEY,
      'secretKey': SUPPLIER_SECRET_KEY
    };
    const response = await axios.get(SUPPLIER_GAME_LIST_URL, { headers });
    return response.data;
  } catch (error: any) {
    throw new Error('Failed to fetch supplier game list: ' + (error.response?.data?.message || error.message));
  }
}; 
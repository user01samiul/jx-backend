import { Request, Response } from "express";
import pool from "../../db/postgres";

export const getMaintenance = async (req: Request, res: Response) => {
  try {
    // Get all settings from the settings table
    const result = await pool.query("SELECT key, value FROM settings ORDER BY key");
    
    // Convert the array of {key, value} objects to a single object
    const settings: Record<string, any> = {};
    result.rows.forEach(row => {
      // Try to parse JSON values, fallback to string
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        // If not JSON, use as string
        settings[row.key] = row.value;
      }
    });
    
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const setMaintenance = async (req: Request, res: Response) => {
  try {
    const settingsData = req.body;
    
    // Validate that we received an object
    if (!settingsData || typeof settingsData !== 'object') {
      return res.status(400).json({ 
        success: false, 
        message: "Request body must be an object with settings to update" 
      });
    }
    
    // Update each setting provided in the request
    const updates = [];
    for (const [key, value] of Object.entries(settingsData)) {
      // Convert value to string (JSON.stringify for objects/arrays, toString for primitives)
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      await pool.query(
        "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
        [key, stringValue]
      );
      updates.push(key);
    }
    
    // Get updated settings
    const result = await pool.query("SELECT key, value FROM settings ORDER BY key");
    const settings: Record<string, any> = {};
    result.rows.forEach(row => {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    });
    
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleMaintenance = async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'maintenance'");
    const current = result.rows.length > 0 ? result.rows[0].value === 'true' : false;
    const newValue = !current;
    
    await pool.query(
      "INSERT INTO settings (key, value) VALUES ('maintenance', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [newValue ? 'true' : 'false']
    );
    
    res.json({ maintenance: newValue });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}; 
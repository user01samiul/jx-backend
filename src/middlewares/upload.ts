import multer from 'multer';
import { Request } from 'express';

// Configure multer to use memory storage (we'll upload to CDN, not local disk)
const storage = multer.memoryStorage();

// File filter for images only
const imageFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images only
  if (!file.mimetype.startsWith('image/')) {
    cb(new Error('Only image files are allowed!'));
    return;
  }
  cb(null, true);
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: imageFilter
});

// Middleware for single file upload (avatar)
export const uploadAvatar = upload.single('avatar');

// Middleware for multiple file uploads
export const uploadMultiple = upload.array('files', 10); // max 10 files

export default upload;

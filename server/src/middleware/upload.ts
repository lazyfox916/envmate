import multer, { StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Multer configuration for .env file uploads
 */

// Get the absolute path to uploads directory
// This works in both development (ts-node-dev) and production (compiled)
const uploadsDir = path.resolve(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory: ${uploadsDir}`);
}

// Configure storage
const storage: StorageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store files in uploads directory
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: uuid_originalname
    const uuid = uuidv4();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const filename = `${uuid}_${name}${ext}`;
    console.log(`File will be saved as: ${filename} to ${uploadsDir}`);
    cb(null, filename);
  },
});

// File filter: only allow .env files and text files
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['text/plain', 'application/octet-stream'];
  const allowedExtensions = ['.env', '.txt'];

  const ext = path.extname(file.originalname).toLowerCase();
  const originalName = path.basename(file.originalname);

  // Check if it's a .env file (with any extension or no extension)
  const isEnvFile =
    originalName.startsWith('.env') || file.mimetype === 'text/plain' || allowedExtensions.includes(ext);

  if (isEnvFile) {
    cb(null, true);
  } else {
    cb(new Error('Only .env files are allowed'));
  }
};

// Create multer instance
export const uploadEnv = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB max file size
  },
});

export default uploadEnv;

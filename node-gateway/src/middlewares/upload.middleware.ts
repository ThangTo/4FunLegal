import fs from 'node:fs';
import path from 'node:path';

import multer from 'multer';

const uploadRoot = path.resolve(process.cwd(), 'uploads');

const storage = multer.diskStorage({
  destination: (req, _file, callback) => {
    const submissionId = req.params.submissionId ?? 'misc';
    const destinationPath = path.join(uploadRoot, 'submissions', submissionId);
    fs.mkdirSync(destinationPath, { recursive: true });
    callback(null, destinationPath);
  },
  filename: (_req, file, callback) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

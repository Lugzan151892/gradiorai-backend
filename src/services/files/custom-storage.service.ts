import { diskStorage } from 'multer';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export function createTempMulterStorage() {
  return diskStorage({
    destination: path.join(__dirname, '..', '..', 'uploads', 'tmp'),
    filename: (_, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

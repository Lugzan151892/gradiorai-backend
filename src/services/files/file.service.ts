import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as fs from 'fs';
import * as path from 'path';
import { IFile } from '../../utils/interfaces/files';
import * as fsPromises from 'fs/promises';

@Injectable()
export class FileService {
  ensureDirExists(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  getUploadPath(userId: string, entityType: string, entityId: string, isPublic: boolean): string {
    const base = isPublic ? 'uploads/public' : `uploads/private/user-${userId}`;
    const fullPath = path.join(process.cwd(), base, entityType, `${entityId}`);
    this.ensureDirExists(fullPath);
    return fullPath;
  }

  static saveFile(file: Express.Multer.File, savePath: string): string {
    const filePath = path.join(savePath, file.originalname);
    fs.writeFileSync(filePath, file.buffer);
    return filePath;
  }

  /**
   * Перемещает файлы из временной директории в нужную и возвращает мета-данные
   */
  async moveFilesToStorage(
    files: Express.Multer.File[],
    userId: number,
    entityType: string,
    entityId: number | string,
    isPublic = false
  ): Promise<IFile[]> {
    const targetDir = this.getUploadPath(String(userId), entityType, String(entityId), isPublic);
    await fs.promises.mkdir(targetDir, { recursive: true });

    const result = await Promise.all(
      files.map(async (file) => {
        const targetPath = path.join(targetDir, file.filename);
        await fs.promises.rename(file.path, targetPath);

        const relativePath = path.relative(process.cwd(), targetPath);

        return {
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          path: relativePath,
          public: isPublic,
          user_id: userId,
          entity_type: entityType,
          entity_id: entityId,
        };
      })
    );

    return result;
  }

  async extractText(file: Express.Multer.File): Promise<string> {
    const fileContent = await fsPromises.readFile(file.path);

    try {
      // const { buffer, mimetype, originalname } = file;

      // if (!buffer || buffer.length === 0) {
      //   throw new BadRequestException('Пустой файл. Возможно, файл не загрузился корректно');
      // }

      if (file.mimetype === 'application/pdf') {
        const data = await pdfParse(new Uint8Array(fileContent));
        return data.text;
      }

      if (
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.originalname.endsWith('.docx')
      ) {
        const result = await mammoth.extractRawText({ buffer: fileContent });
        return result.value;
      }

      throw new BadRequestException('Неподдерживаемый тип файла');
    } catch (e) {
      throw new HttpException({ message: 'Ошибка файла ' + e, info: { type: 'files' } }, HttpStatus.BAD_REQUEST);
    }
  }
}

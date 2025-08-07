import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from 'src/prisma/prisma.service';
import { IFile } from 'src/utils/interfaces/files';

@Injectable()
export class SystemFilesService {
  constructor(private readonly prisma: PrismaService) {}

  async saveOrReplace(key: string, fileMeta: IFile) {
    const existing = await this.prisma.systemFile.findUnique({ where: { key } });

    if (existing) {
      const fullPath = path.join(process.cwd(), existing.path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

      return this.prisma.systemFile.update({
        where: { key },
        data: {
          filename: fileMeta.filename,
          path: fileMeta.path,
          originalName: fileMeta.originalName,
          mimetype: fileMeta.mimetype,
          size: fileMeta.size,
          uploadedAt: new Date(),
        },
      });
    }

    return this.prisma.systemFile.create({
      data: {
        key,
        filename: fileMeta.filename,
        originalName: fileMeta.originalName,
        path: fileMeta.path,
        mimetype: fileMeta.mimetype,
        size: fileMeta.size,
      },
    });
  }

  async deleteByKey(key: string) {
    const file = await this.findByKey(key);
    if (!file) return;

    const fullPath = path.join(process.cwd(), file.path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    return this.prisma.systemFile.delete({ where: { key } });
  }

  async findByKey(key: string) {
    return this.prisma.systemFile.findUnique({ where: { key } });
  }

  async findAll() {
    return this.prisma.systemFile.findMany();
  }
}

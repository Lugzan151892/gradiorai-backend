import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from 'src/prisma/prisma.service';
import { IFile } from 'src/utils/interfaces/files';
import { EUSER_FILES_TYPE } from '@prisma/client';

@Injectable()
export class UserFilesService {
  constructor(private readonly prisma: PrismaService) {}

  async saveOrReplace(type: EUSER_FILES_TYPE, fileMeta: IFile, userId: number) {
    const existing = await this.prisma.userFiles.findFirst({ where: { type } });

    if (existing) {
      const fullPath = path.join(process.cwd(), existing.path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

      return this.prisma.userFiles.update({
        where: { id: existing.id },
        data: {
          filename: fileMeta.filename,
          path: fileMeta.path,
          mimetype: fileMeta.mimetype,
          size: fileMeta.size,
          type,
        },
      });
    }

    return this.prisma.userFiles.create({
      data: {
        public: false,
        type,
        filename: fileMeta.filename,
        path: fileMeta.path,
        mimetype: fileMeta.mimetype,
        size: fileMeta.size,
        user: {
          connect: {
            id: userId,
          },
        },
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

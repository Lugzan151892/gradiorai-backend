import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '@/prisma/prisma.service';
import { IFile } from '@/utils/interfaces/files';
import { EUSER_FILES_TYPE } from '@prisma/client';

@Injectable()
export class UserFilesService {
  constructor(private readonly prisma: PrismaService) {}

  async saveOrReplace(type: EUSER_FILES_TYPE, fileMeta: IFile, userId: number) {
    const existing = await this.prisma.userFiles.findFirst({ where: { type, user_id: userId } });

    if (existing) {
      const fullPath = path.join(process.cwd(), existing.path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

      return this.prisma.userFiles.update({
        where: { id: existing.id },
        data: {
          filename: fileMeta.filename,
          originalName: fileMeta.originalName,
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
        originalName: fileMeta.originalName,
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

  async deleteByKey(type: EUSER_FILES_TYPE, userId: number) {
    const file = await this.findByKey(type, userId);
    if (!file) return;

    const fullPath = path.join(process.cwd(), file.path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    return this.prisma.userFiles.delete({
      where: {
        id: file.id,
      },
    });
  }

  async findByKey(type: EUSER_FILES_TYPE, userId: number) {
    return this.prisma.userFiles.findFirst({
      where: {
        type: type,
        user_id: userId,
      },
    });
  }

  async findAll() {
    return this.prisma.systemFile.findMany();
  }
}

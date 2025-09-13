import { RequireAdmin } from '@/auth/decorators/auth.decorator';
import { Controller, Post, UseInterceptors, UploadedFile, Body, Get, Param, Put, Delete, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AchievementsService } from '@/services/achievements/achievements.service';
import { FileService } from '@/services/files/file.service';
import { CreateAchievementDto } from '@/services/achievements/dto/create-achievement.dto';
import { UpdateAchievementDto } from '@/services/achievements/dto/update-achievement.dto';
import { AchievementEventDto } from '@/services/achievements/dto/event.dto';
import { createTempMulterStorage } from '@/services/files/custom-storage.service';

@Controller('achievements')
export class AchievementsController {
  constructor(
    private svc: AchievementsService,
    private filesSvc: FileService
  ) {}

  @Post()
  @RequireAdmin()
  @UseInterceptors(FileInterceptor('image', { storage: createTempMulterStorage() }))
  async create(@Body() dto: CreateAchievementDto, @UploadedFile() image?: Express.Multer.File) {
    const savedFiles = image ? await this.filesSvc.moveFilesToStorage([image], 0, 'system', dto.key, true) : null;
    const fileMeta = savedFiles[0];

    return this.svc.create(dto, fileMeta);
  }

  @Put(':id')
  @RequireAdmin()
  @UseInterceptors(FileInterceptor('image', { storage: createTempMulterStorage() }))
  async update(@Param('id') id: string, @Body() dto: UpdateAchievementDto, @UploadedFile() image?: Express.Multer.File) {
    const savedFiles = image ? await this.filesSvc.moveFilesToStorage([image], 0, 'system', dto.key, true) : null;
    const fileMeta = savedFiles?.[0];

    return this.svc.update(Number(id), dto, fileMeta);
  }

  @Delete(':id')
  @RequireAdmin()
  async delete(@Param('id') id: string) {
    return this.svc.delete(Number(id));
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.svc.getOne(Number(id));
  }

  // получить все достижения, можно передать ?userId=123 чтобы вернуть прогресс
  @Get()
  async getAll(@Query('userId') userId?: string) {
    return this.svc.getAllWithProgress(userId ? Number(userId) : undefined);
  }

  // Это endpoint, который другие сервисы вызывают при событии (может быть внутренним, защищённым)
  @Post('events')
  async handleEvent(@Body() body: AchievementEventDto) {
    return this.svc.handleEvent(body.userId, body.trigger as any, body.payload);
  }
}

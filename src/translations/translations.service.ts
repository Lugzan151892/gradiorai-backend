import { Injectable, BadRequestException, HttpStatus, HttpException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UpdateTranslationDto } from '@/translations/dto/update-translation.dto';

@Injectable()
export class TranslationsService {
  constructor(private prisma: PrismaService) {}

  // экспорт: все переводы или по локали
  async exportTranslations(locale?: string) {
    const where = locale ? { locale } : {};
    const rows = await this.prisma.translation.findMany({ where });
    const out: Record<string, Record<string, Record<string, string>>> = {};
    for (const r of rows) {
      out[r.locale] ??= {};
      out[r.locale][r.namespace] ??= {};
      out[r.locale][r.namespace][r.key] = r.value;
    }
    return out;
  }

  // получить namespace
  async getNamespace(locale: string, namespace: string) {
    const rows = await this.prisma.translation.findMany({
      where: { locale, namespace },
    });
    const out: Record<string, string> = {};
    for (const r of rows) out[r.key] = r.value;
    return out;
  }

  // получить конкретный ключ
  async getKey(locale: string, namespace: string, key: string) {
    const row = await this.prisma.translation.findUnique({
      where: { locale_namespace_key: { locale, namespace, key } },
    });
    return row?.value ?? null;
  }

  // апдейт одной записи (upsert)
  async upsertTranslation(dto: UpdateTranslationDto) {
    const { locale, namespace, key, value } = dto;
    return this.prisma.translation.upsert({
      where: { locale_namespace_key: { locale, namespace, key } },
      create: { locale, namespace, key, value },
      update: { value },
    });
  }

  // импорт JSON. overwrite = true => удаляем ключи отсутствующие в JSON для соответствующих locale+namespace
  async importTranslations(json: any, overwrite = false) {
    if (typeof json !== 'object' || Array.isArray(json)) {
      throw new BadRequestException('Invalid translations JSON');
    }

    const upsertPromises = [];
    // собираем ключи для возможного удаления
    const keysMap: Record<string, Record<string, string[]>> = {}; // locale -> namespace -> [keys]

    for (const locale of Object.keys(json)) {
      const namespaces = json[locale];
      if (typeof namespaces !== 'object') continue;
      keysMap[locale] ??= {};
      for (const ns of Object.keys(namespaces)) {
        const keys = Object.keys(namespaces[ns] || {});
        keysMap[locale][ns] = keys;
        for (const key of keys) {
          const value = namespaces[ns][key];
          // батчим upserts: Prisma upsert по composite unique (see schema)
          upsertPromises.push(
            this.prisma.translation.upsert({
              where: { locale_namespace_key: { locale, namespace: ns, key } },
              create: { locale, namespace: ns, key, value },
              update: { value },
            })
          );
          // периодически выполняем транзакции чтобы не хранить массив тысяч промисов
          if (upsertPromises.length >= 200) {
            await this.prisma.$transaction(upsertPromises.splice(0, upsertPromises.length));
          }
        }
      }
    }
    if (upsertPromises.length) await this.prisma.$transaction(upsertPromises);

    if (overwrite) {
      // удаляем все ключи которые есть в БД но отсутствуют в JSON
      for (const locale of Object.keys(keysMap)) {
        for (const ns of Object.keys(keysMap[locale])) {
          const keys = keysMap[locale][ns];
          await this.prisma.translation.deleteMany({
            where: {
              locale,
              namespace: ns,
              key: { notIn: keys.length ? keys : ['__nothing__'] },
            },
          });
        }
      }
    }

    return { success: true };
  }

  async deleteKey(locale: string, namespace: string, key: string) {
    const row = await this.prisma.translation.findUnique({
      where: { locale_namespace_key: { locale, namespace, key } },
    });

    if (!row) {
      throw new HttpException('Ключ не найден', HttpStatus.NOT_FOUND);
    }

    return this.prisma.translation.delete({
      where: { locale_namespace_key: { locale, namespace, key } },
    });
  }
}

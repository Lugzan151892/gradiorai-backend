import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SystemTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTransactions() {
    const result = await this.prisma.serviceDevelopmentSpendTransaction.findMany({
      include: {
        transaction_maker: true,
      },
      orderBy: {
        paid_time: 'desc',
      },
    });

    return result;
  }

  async createTransaction(data: { transaction_maker_id: number; paid_time: string; amount: number; reason: string }) {
    const result = await this.prisma.serviceDevelopmentSpendTransaction.create({
      data: data,
    });

    return result;
  }
}

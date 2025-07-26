import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SystemTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTransactions() {
    const result = await this.prisma.serviceDevelopmentSpendTransaction.findMany({
      include: {
        transaction_maker: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
            last_ip: true,
            last_login: true,
            admin: true,
          },
        },
      },
      orderBy: {
        paid_time: 'desc',
      },
    });

    return result;
  }

  async getTransactionById(id: number) {
    const result = await this.prisma.serviceDevelopmentSpendTransaction.findUnique({
      where: {
        id,
      },
      include: {
        transaction_maker: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
            last_ip: true,
            last_login: true,
            admin: true,
          },
        },
      },
    });

    return result;
  }

  async createTransaction(data: { transaction_maker_id: number; paid_time: string; amount: number; reason: string }) {
    const { paid_time, amount, reason, transaction_maker_id } = data;
    const result = await this.prisma.serviceDevelopmentSpendTransaction.create({
      data: {
        amount,
        paid_time,
        reason,
        transaction_maker: {
          connect: {
            id: transaction_maker_id,
          },
        },
      },
      select: {
        id: true,
      },
    });

    return result;
  }

  async deleteTransaction(id: number) {
    const result = await this.prisma.serviceDevelopmentSpendTransaction.delete({
      where: {
        id,
      },
    });

    return result;
  }
}

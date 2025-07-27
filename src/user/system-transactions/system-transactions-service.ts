import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SystemTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTransactions(userId?: number) {
    const result = await this.prisma.serviceDevelopmentSpendTransaction.findMany({
      ...(userId
        ? {
            where: {
              transaction_maker_id: userId,
            },
          }
        : {}),
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

  async updateTransaction(data: {
    id: number;
    transaction_maker_id?: number;
    paid_time?: string;
    amount?: number;
    reason?: string;
  }) {
    const { id, paid_time, amount, reason, transaction_maker_id } = data;

    const existedTransaction = await this.prisma.serviceDevelopmentSpendTransaction.findUnique({
      where: {
        id,
      },
    });

    if (!existedTransaction) {
      throw new HttpException(`Транзакция с id ${data.id} не найдена`, HttpStatus.BAD_REQUEST);
    }

    const updateData: any = {};

    if (amount && amount !== existedTransaction.amount) updateData.amount = amount;
    if (paid_time) updateData.paid_time = paid_time;
    if (reason && reason !== existedTransaction.reason) updateData.reason = reason;
    if (transaction_maker_id && transaction_maker_id !== existedTransaction.transaction_maker_id) {
      updateData.transaction_maker = {
        connect: { id: transaction_maker_id },
      };
    }

    const result = await this.prisma.serviceDevelopmentSpendTransaction.update({
      where: {
        id,
      },
      data: updateData,
      select: {
        id: true,
      },
    });

    return result;
  }
}

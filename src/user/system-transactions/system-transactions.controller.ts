import { Body, Controller, Delete, Get, HttpException, HttpStatus, Post, Put, Query, Req } from '@nestjs/common';
import { AuthService } from '@/auth/auth.service';
import { Request } from 'express';
import { SystemTransactionsService } from '@/user/system-transactions/system-transactions-service';
import { convertDateToISO } from '@/utils/date';
import { RequireAdmin } from '@/auth/decorators/auth.decorator';
import { AuthUser, User } from '@/auth/decorators/user.decorator';

@Controller('user/system-transactions')
export class SystemTransactionsController {
  constructor(
    private readonly authService: AuthService,
    private readonly systemTransactionService: SystemTransactionsService
  ) {}

  @Get('all')
  @RequireAdmin()
  async getAllTransactions(@User() user: AuthUser, @Query() query: { only_mine: 'true' | 'false' }) {
    const result = await this.systemTransactionService.getTransactions(query.only_mine === 'true' ? user.user.id : undefined);

    return result;
  }

  @Get('transaction')
  @RequireAdmin()
  async getTransactionById(@Query() query: { id: string }) {
    if (!query.id) {
      throw new HttpException({ message: 'Некорректно указан id.' }, HttpStatus.BAD_REQUEST);
    }

    const result = await this.systemTransactionService.getTransactionById(+query.id);

    if (!result) {
      throw new HttpException({ message: `Транзакция с id ${query.id} не найдена.` }, HttpStatus.BAD_REQUEST);
    }

    return result;
  }

  @Post('transaction')
  @RequireAdmin()
  async addTransaction(
    @Body()
    body: {
      transaction_maker_id: number;
      paid_time: string;
      amount: number;
      reason: string;
    },
  ) {
    if (!body.amount || !body.paid_time || !body.transaction_maker_id || !body.reason) {
      throw new HttpException('Не заполнены обязательные данные', HttpStatus.BAD_REQUEST);
    }

    const paidTime = convertDateToISO(body.paid_time);

    if (!paidTime) {
      throw new HttpException(
        { message: 'Некорректно указана дата платежа', info: { type: 'paid_time' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const result = await this.systemTransactionService.createTransaction({
      ...body,
      paid_time: paidTime,
    });

    return result;
  }

  @Put('transaction')
  @RequireAdmin()
  async updateTransaction(
    @Body()
    body: {
      id: number;
      transaction_maker_id?: number;
      paid_time?: string;
      amount?: number;
      reason?: string;
    },
  ) {
    const paidTime = body.paid_time ? convertDateToISO(body.paid_time) : null;

    const result = await this.systemTransactionService.updateTransaction({
      ...body,
      paid_time: paidTime,
    });

    return result;
  }

  @Delete('transaction')
  @RequireAdmin()
  async deleteTransactionById(
    @Body()
    body: {
      id: number;
    }
  ) {
    if (!body.id) {
      throw new HttpException({ message: 'Некорректно указан id.' }, HttpStatus.BAD_REQUEST);
    }

    const result = await this.systemTransactionService.deleteTransaction(body.id);

    if (!result) {
      throw new HttpException({ message: `Транзакция с id ${body.id} не найдена.` }, HttpStatus.BAD_REQUEST);
    }

    return result;
  }
}

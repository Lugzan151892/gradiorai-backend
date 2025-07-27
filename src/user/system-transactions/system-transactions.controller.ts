import { Body, Controller, Delete, Get, HttpException, HttpStatus, Post, Put, Query, Req, Res } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { Request } from 'express';
import { SystemTransactionsService } from './system-transactions-service';
import { convertDateToISO } from 'src/utils/date';

@Controller('user/system-transactions')
export class SystemTransactionsController {
  constructor(
    private readonly authService: AuthService,
    private readonly systemTransactionService: SystemTransactionsService
  ) {}

  @Get('all')
  async getAllTransactions(@Req() request: Request) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new HttpException(
        { message: 'Пользователь не авторизован или недостаточно прав.', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const result = await this.systemTransactionService.getTransactions();

    return result;
  }

  @Get('transaction')
  async getTransactionById(@Req() request: Request, @Query() query: { id: string }) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user) {
      throw new HttpException(
        { message: 'Только для авторизованных пользователей.', info: { type: 'auth' } },
        HttpStatus.BAD_REQUEST
      );
    }

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
  async addTransaction(
    @Body()
    body: {
      transaction_maker_id: number;
      paid_time: string;
      amount: number;
      reason: string;
    },
    @Req() request: Request
  ) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new HttpException(
        { message: 'Пользователь не авторизован или недостаточно прав.', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

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
  async updateTransaction(
    @Body()
    body: {
      id: number;
      transaction_maker_id?: number;
      paid_time?: string;
      amount?: number;
      reason?: string;
    },
    @Req() request: Request
  ) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new HttpException(
        { message: 'Пользователь не авторизован или недостаточно прав.', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

    if (!body.amount && !body.paid_time && !body.transaction_maker_id && !body.reason) {
      throw new HttpException('test', HttpStatus.BAD_REQUEST);
    }

    const paidTime = body.paid_time ? convertDateToISO(body.paid_time) : null;

    const result = await this.systemTransactionService.updateTransaction({
      ...body,
      paid_time: paidTime,
    });

    return result;
  }

  @Delete('transaction')
  async deleteTransactionById(
    @Req() request: Request,
    @Body()
    body: {
      id: number;
    }
  ) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user) {
      throw new HttpException(
        { message: 'Только для авторизованных пользователей.', info: { type: 'auth' } },
        HttpStatus.BAD_REQUEST
      );
    }

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

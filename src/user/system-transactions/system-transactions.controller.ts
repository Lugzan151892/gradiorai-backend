import { Body, Controller, Get, HttpException, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { Request } from 'express';
import { SystemTransactionsService } from './system-transactions-service';

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

  @Post('add')
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
      throw new HttpException('test', HttpStatus.BAD_REQUEST);
    }

    const result = await this.systemTransactionService.createTransaction(body);

    return result;
  }
}

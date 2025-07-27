import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { SystemTransactionsService } from './system-transactions-service';
import { SystemTransactionsController } from './system-transactions.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [SystemTransactionsService],
  controllers: [SystemTransactionsController],
  exports: [SystemTransactionsService],
})
export class SystemTransactionModule {}

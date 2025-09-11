import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';
import { SystemTransactionsService } from '@/user/system-transactions/system-transactions-service';
import { SystemTransactionsController } from '@/user/system-transactions/system-transactions.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [SystemTransactionsService],
  controllers: [SystemTransactionsController],
  exports: [SystemTransactionsService],
})
export class SystemTransactionModule {}

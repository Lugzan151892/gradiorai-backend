import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SystemTransactionModule } from './system-transactions/system-transactions.module';

@Module({
  imports: [PrismaModule, AuthModule, SystemTransactionModule],
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}

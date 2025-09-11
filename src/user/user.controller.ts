import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { UserService } from '@/user/user.service';
import { InterviewService } from '@/interview/interview.service';
import { OptionalAuth, RequireAdmin, RequireAuth } from '@/auth/decorators/auth.decorator';
import { AuthUser, User } from '@/auth/decorators/user.decorator';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly interviewService: InterviewService
  ) {}

  @Get('user')
  @RequireAuth()
  async getUserData(@User() user: AuthUser) {
    return {
      data: user.user,
      accessToken: user.accessToken,
    };
  }

  @Post('user-review')
  @OptionalAuth()
  async createReview(
    @Body()
    body: {
      comment: string;
      rating?: number;
    },
    @User() user: AuthUser
  ) {
    const result = await this.userService.createNewReview(body, user?.user?.id, user.userIp);

    return result;
  }

  @Get('users')
  @RequireAdmin()
  async getUsers(@Query() query: { only_admins?: 'true' | 'false' }) {
    return await this.userService.getUsers(query.only_admins === 'true');
  }

  @Get('reviews')
  @RequireAdmin()
  async getReviews() {
    return await this.userService.getAllReviews();
  }

  @Put('username')
  @RequireAuth()
  async setUserName(
    @Body()
    body: {
      username: string;
    },
    @User() user: AuthUser
  ) {
    return await this.userService.setUserName(user.user.id, body.username);
  }

  @Get('interviews')
  @RequireAuth()
  async getInterviews(@User() user: AuthUser, @Query() query: { period?: string }) {
    const interviews = await this.interviewService.getAllUserInterviews(user.user.id, query.period);

    return interviews;
  }

  @Delete('user/:id')
  @RequireAdmin()
  async deleteUser(@Param('id') id: string) {
    return await this.userService.deleteUser(Number(id));
  }
}

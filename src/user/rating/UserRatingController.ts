import { UserRatingService } from './UserRatingService';
import { Controller, Body, Post, Get, Delete, Put, Param } from '@nestjs/common';
import { RequireAdmin, RequireAuth } from '@/auth/decorators/auth.decorator';
import { AuthUser, User } from '@/auth/decorators/user.decorator';

@Controller('user/rating')
export class UserRatingController {
  constructor(private readonly userRatingService: UserRatingService) {}

  @Post('update-test-result')
  @RequireAuth()
  async updateUserTestResult(@User() user: AuthUser, @Body() body: { level: number; questions: number; correct: number }) {
    const result = await this.userRatingService.addTestResult(user.user.id, body.level, body.questions, body.correct);

    return {
      data: result,
    };
  }

  @Get('get-users-rating')
  async getUsersRating() {
    const users = await this.userRatingService.getUsersRating();

    return {
      data: users,
    };
  }

  @Get('fake-users')
  async getFakeUsers() {
    return await this.userRatingService.getFakeUsers();
  }

  @Get('fake-users/:id')
  @RequireAdmin()
  async getFakeUser(@Param('id') id: string) {
    return await this.userRatingService.getFakeUser(id);
  }

  @Post('fake-users')
  @RequireAdmin()
  async createFakeUser(@Body() body: { name: string; total_rating: number }) {
    return await this.userRatingService.createFakeUser(body.name, body.total_rating);
  }

  @Put('fake-users')
  @RequireAdmin()
  async editFakeUser(@Body() body: { id: string; name: string; total_rating: number }) {
    return await this.userRatingService.editFakeUser(body.id, body.name, body.total_rating);
  }

  @Delete('fake-users')
  @RequireAdmin()
  async deleteFakeUser(@Body() body: { id: string }) {
    return await this.userRatingService.deleteFakeUser(body.id);
  }

  @Get('average-rating')
  async getAverageRating() {
    return await this.userRatingService.getAverageRating();
  }
}

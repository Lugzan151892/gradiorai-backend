import { HttpException, HttpStatus, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  generateAccessToken(userId: number) {
    const token = this.jwtService.sign(
      { user_id: userId },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '5m',
      }
    );
    return token;
  }

  async getAccessTokenData(token: string): Promise<{ userId: number }> {
    const decoded = await this.jwtService.verifyAsync(token, {
      secret: this.configService.get('JWT_SECRET'),
    });
    return { userId: decoded.user_id };
  }

  async getRefreshTokenData(token: string): Promise<{ userId: number }> {
    const decoded = await this.jwtService.verifyAsync(token, {
      secret: this.configService.get('JWT_SECRET'),
    });
    return { userId: decoded.user_id };
  }

  async generateRefreshToken(userId: number) {
    const token = this.jwtService.sign(
      { user_id: userId },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '30d',
      }
    );

    await this.prisma.refreshToken.create({
      data: {
        token: token,
        /** 30 days */
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });

    return token;
  }

  async updateAccessToken(refreshToken: string) {
    const decoded = this.jwtService.verify(refreshToken);

    const savedToken = await this.prisma.refreshToken.findUnique({
      where: {
        token: refreshToken,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: {
        id: decoded.user_id,
      },
    });

    if (!savedToken || !user || savedToken.user_id !== user.id) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessToken = this.generateAccessToken(decoded.user_id);

    return accessToken;
  }

  async registration(email: string, password: string) {
    const userExist = await this.prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (userExist) {
      throw new HttpException(`User with email ${email} already exists`, HttpStatus.BAD_REQUEST);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUser = await this.prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        admin: true,
      },
    });

    const refreshToken = await this.generateRefreshToken(createdUser.id);
    const accessToken = this.generateAccessToken(createdUser.id);

    return {
      user: createdUser,
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      throw new HttpException(`User with email ${email} not found!`, HttpStatus.BAD_GATEWAY);
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);

    if (!passwordsMatch) {
      throw new HttpException('Password incorrect', HttpStatus.BAD_REQUEST);
    }

    await this.prisma.refreshToken.delete({
      where: {
        user_id: user.id,
      },
    });

    const refreshToken = await this.generateRefreshToken(user.id);
    const accessToken = this.generateAccessToken(user.id);

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }

  async getUserFromTokens(accessToken?: string, refreshToken?: string) {
    if (!accessToken && !refreshToken) {
      throw new UnauthorizedException('Unauthorized');
    }

    try {
      if (accessToken) {
        const tokenData = await this.getAccessTokenData(accessToken);
        const user = await this.prisma.user.findUnique({
          where: {
            id: tokenData.userId,
          },
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
            admin: true,
          },
        });
        if (!user) {
          throw new UnauthorizedException('User not found');
        }

        return {
          user: user,
          accessToken: accessToken,
        };
      } else {
        throw new UnauthorizedException('No access token');
      }
    } catch (error) {
      if (refreshToken) {
        const refreshData = await this.getRefreshTokenData(refreshToken);
        const user = await this.prisma.user.findUnique({
          where: {
            id: refreshData.userId,
          },
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
            admin: true,
          },
        });

        const savedRefresh = await this.prisma.refreshToken.findUnique({
          where: {
            user_id: user.id,
          },
        });

        if (savedRefresh.token !== refreshToken) {
          throw new UnauthorizedException('Unauthorized');
        }

        const accessToken = this.generateAccessToken(user.id);

        return {
          user: user,
          accessToken: accessToken,
          refreshToken: savedRefresh.token,
        };
      } else {
        throw new UnauthorizedException('No refresh token available');
      }
    }
  }
}

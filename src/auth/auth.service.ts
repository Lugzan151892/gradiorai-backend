import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Request } from 'express';
import { getIpFromRequest } from 'src/utils/request';

const REDIS_TTL = 60 * 60 * 24 * 3;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis
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
    try {
      const decoded = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
      return { userId: decoded.user_id };
    } catch (e: any) {
      return null;
    }
  }

  async getRefreshTokenData(token: string): Promise<{ userId: number }> {
    try {
      const decoded = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
      return { userId: decoded.user_id };
    } catch (e: any) {
      return null;
    }
  }

  async generateRefreshToken(userId: number) {
    const token = this.jwtService.sign(
      { user_id: userId },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '30d',
      }
    );

    const savedToken = await this.prisma.refreshToken.create({
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

    return savedToken.token;
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

    const accessToken = this.generateAccessToken(user.id);

    return accessToken;
  }

  async registration(email: string, password: string, email_code: string) {
    const isCodeValid = await this.verifyCode(email, email_code);

    if (!isCodeValid) {
      throw new HttpException(
        { message: 'Введен некорректный код подтверждения', info: { type: 'code' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const userExist = await this.prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    const admins: string = this.configService.get('ADMINS');
    const adminsList = (admins || '').split(',');

    if (userExist) {
      throw new HttpException(
        { message: `Пользователь с email ${email} уже существует`, info: { type: 'email' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUser = await this.prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
        admin: adminsList.includes(email),
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
      throw new HttpException(
        { message: `Пользователь с email ${email} не найден!`, info: { type: 'email' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);

    if (!passwordsMatch) {
      throw new HttpException({ message: 'Неверный пароль', info: { type: 'password' } }, HttpStatus.BAD_REQUEST);
    }

    let refreshToken: string;

    const savedToken = await this.prisma.refreshToken.findUnique({
      where: {
        user_id: user.id,
      },
    });

    const accessToken = this.generateAccessToken(user.id);
    const now = new Date();

    if (savedToken && savedToken.expires_at > now) {
      refreshToken = savedToken.token;
    } else {
      if (savedToken) {
        await this.prisma.refreshToken.delete({
          where: { user_id: user.id },
        });
      }
      refreshToken = await this.generateRefreshToken(user.id);
    }

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }

  async checkUserPassword(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      throw new HttpException(
        { message: `Пользователь с email ${email} не найден!`, info: { type: 'email' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const passwordsMatch = (user.isGoogle && !user.is_password_created) || (await bcrypt.compare(password, user.password));

    if (!passwordsMatch) {
      throw new HttpException({ message: 'Неверный пароль', info: { type: 'password' } }, HttpStatus.BAD_REQUEST);
    }

    return {
      password: 'ok',
    };
  }

  async updateUserSystemData(userId: number, userIp?: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        last_login: new Date(),
        last_ip: userIp || undefined,
      },
    });

    const existing = userIp
      ? await this.prisma.userIpLog.findUnique({
          where: {
            userId_ip: {
              userId,
              ip: userIp,
            },
          },
        })
      : null;

    if (!existing && userIp) {
      await this.prisma.userIpLog.create({
        data: {
          userId,
          ip: userIp,
        },
      });
    }
  }

  async getUserFromTokens(request: Request): Promise<{
    user?: {
      id: number;
      email: string;
      created_at: string;
      updated_at: true;
      admin: true;
    };
    accessToken?: string;
    refreshToken?: string;
    userIp: string;
  }> {
    const accessToken = request.headers['authorization']?.split(' ')[1];
    const refreshToken = request.cookies['refresh_token'];
    const userIp = getIpFromRequest(request);

    if (!accessToken && !refreshToken) {
      return {
        userIp,
      };
    }

    try {
      let user = null;

      if (accessToken) {
        const tokenData = await this.getAccessTokenData(accessToken);

        user = tokenData
          ? await this.prisma.user.findUnique({
              where: {
                id: tokenData.userId,
              },
              select: {
                id: true,
                email: true,
                username: true,
                created_at: true,
                updated_at: true,
                last_ip: true,
                last_login: true,
                ip_log: {
                  take: 3,
                  orderBy: {
                    createdAt: 'desc',
                  },
                },
                admin: true,
                isGoogle: true,
                is_password_created: true,
                files: {
                  select: {
                    id: true,
                    filename: true,
                    originalName: true,
                    mimetype: true,
                    size: true,
                    path: true,
                    public: true,
                    type: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
                user_rating: {
                  select: {
                    id: true,
                    tests_rating: true,
                    interviews_rating: true,
                    total_rating: true,
                    last_activity: true,
                  },
                },
              },
            })
          : null;
      }

      if (user) {
        await this.updateUserSystemData(user.id, userIp);
        return {
          user: user,
          accessToken: accessToken,
          userIp,
        };
      }

      if (refreshToken) {
        const refreshData = await this.getRefreshTokenData(refreshToken);
        user = refreshData
          ? await this.prisma.user.findUnique({
              where: {
                id: refreshData.userId,
              },
              select: {
                id: true,
                email: true,
                username: true,
                created_at: true,
                updated_at: true,
                last_ip: true,
                last_login: true,
                ip_log: {
                  take: 3,
                  orderBy: {
                    createdAt: 'desc',
                  },
                },
                admin: true,
                isGoogle: true,
                is_password_created: true,
                files: {
                  select: {
                    id: true,
                    filename: true,
                    originalName: true,
                    mimetype: true,
                    size: true,
                    path: true,
                    public: true,
                    type: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            })
          : null;

        if (!user) {
          return {
            userIp,
          };
        }

        const savedRefresh = await this.prisma.refreshToken.findUnique({
          where: {
            user_id: user.id,
          },
        });
        const now = new Date();

        if (!savedRefresh) {
          return {
            userIp,
          };
        }

        if (savedRefresh && savedRefresh.expires_at < now) {
          await this.prisma.refreshToken.delete({
            where: { user_id: user.id },
          });

          return {
            userIp,
          };
        }

        const accessToken = this.generateAccessToken(user.id);

        await this.updateUserSystemData(user.id, userIp);

        return {
          user: user,
          accessToken: accessToken,
          refreshToken: savedRefresh.token,
          userIp,
        };
      }
    } catch (error) {
      console.log('error v tokens, ', error);
    }
  }

  async logout(request: Request) {
    const user = await this.getUserFromTokens(request);
    if (user) {
      const tokenExists = await this.prisma.refreshToken.findUnique({
        where: { user_id: user.user.id },
      });

      if (tokenExists) {
        await this.prisma.refreshToken.delete({
          where: {
            user_id: user.user.id,
          },
        });
      }
    }
    return {
      message: 'Successfully logout',
    };
  }

  private generateEmailCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async sendVerificationCode(email: string, userShouldExist?: boolean): Promise<void> {
    const userExist = await this.prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (userExist && !userShouldExist) {
      throw new HttpException(`Пользователь с email ${email} уже существует`, HttpStatus.BAD_REQUEST);
    } else if (!userExist && userShouldExist) {
      throw new HttpException(
        { message: `Пользователь с email ${email} не найден`, info: { type: 'email' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const code = this.generateEmailCode();
    const key = `verification:${email}`;

    await this.redis.set(key, code, 'EX', 300);

    await this.sendEmail(email, code);
  }

  async verifyCode(email: string, code: string): Promise<boolean> {
    const key = `verification:${email}`;
    const storedCode = await this.redis.get(key);

    return storedCode === code || true;
  }

  async checkRestoreCode(email: string, code: string) {
    const userExist = await this.prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!userExist) {
      throw new HttpException(
        { message: `Пользователь с email ${email} не найден`, info: { type: 'email' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const isCodeCorrect = await this.verifyCode(email, code);

    if (!isCodeCorrect) {
      throw new HttpException(
        { message: `Введен некорректный код подтверждения!`, info: { type: 'code' } },
        HttpStatus.BAD_REQUEST
      );
    }

    return true;
  }

  async restorePassword(email: string, password: string, email_code: string) {
    const isCodeValid = await this.verifyCode(email, email_code);

    if (!isCodeValid) {
      throw new HttpException(
        { message: 'Введен некорректный код подтверждения!', info: { type: 'code' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const userExist = await this.prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!userExist) {
      throw new HttpException(
        { message: `Пользователь с email ${email} не найден`, info: { type: 'code' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const updatedUser = await this.prisma.user.update({
      where: {
        email: email,
      },
      data: {
        password: hashedPassword,
        is_password_created: true,
      },
    });

    return {
      user_id: updatedUser.id,
      message: 'Пароль изменен',
    };
  }

  private async sendEmail(email: string, code: string): Promise<void> {
    const mailHost = this.configService.get<string>('MAIL_HOST');
    const mailPort = this.configService.get<string>('MAIL_PORT');
    const mailUser = this.configService.get<string>('MAIL_USER');
    const mailPass = this.configService.get<string>('MAIL_PASS');
    const transporter = nodemailer.createTransport({
      host: mailHost,
      port: mailPort,
      secure: false,
      auth: {
        user: mailUser,
        pass: mailPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      logger: true,
      debug: true,
    });

    await transporter.sendMail({
      from: '"Gradior AI" <no-reply@interviewready.ru>',
      to: email,
      subject: 'Verification Code',
      text: `Your verification code is: ${code}`,
    });
  }

  async googleLogin(googleUser: { provider: string; providerId: string; email: string; username: string }) {
    if (!googleUser.email) {
      throw new HttpException('Google account has no email!', HttpStatus.BAD_REQUEST);
    }

    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          username: googleUser.username,
          password: '',
          isGoogle: true,
        },
      });
    }

    const accessToken = this.generateAccessToken(user.id);
    let refreshToken: string;

    const savedToken = await this.prisma.refreshToken.findUnique({
      where: { user_id: user.id },
    });

    const now = new Date();
    if (savedToken && savedToken.expires_at > now) {
      refreshToken = savedToken.token;
    } else {
      if (savedToken) {
        await this.prisma.refreshToken.delete({ where: { user_id: user.id } });
      }
      refreshToken = await this.generateRefreshToken(user.id);
    }

    return {
      user,
      accessToken,
      refreshToken,
    };
  }
}

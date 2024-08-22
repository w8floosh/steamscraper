import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  Post,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import {
  AuthorizationServer,
  JwtService,
  OAuthToken,
} from '@jmondi/oauth2-server';
import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import {
  SessionCookie,
  SessionVerificationResponse,
  UserCredentialsDto,
} from '../lib/types';
import { User } from '../entities';
import { hash } from 'bcrypt';
import { SALT_ROUNDS } from '../lib/constants';
import {
  ExpiredTokenException,
  InvalidSessionTokenException,
  UserNotFoundException,
} from '../lib/errors';
import { ClientService } from '../services/client.service';
import { RedisInterceptor } from './interceptors/redis.interceptor';
import { Cookies } from 'src/lib/cookie.decorator';
import { TokenService } from 'src/services/token.service';

@Controller()
@UseInterceptors(RedisInterceptor)
export class LoginController {
  constructor(
    @Inject('AUTH_SERVER')
    private readonly authorizationServer: AuthorizationServer,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly clientService: ClientService,
    private readonly tokenService: TokenService,
  ) {}

  @Post('/login')
  async login(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() credentials: UserCredentialsDto,
  ): Promise<void> {
    if (
      !(await this.clientService.getByIdentifier(
        request.query.client_id as string,
      ))
    )
      await this.clientService.register(request);

    const authRequest =
      await this.authorizationServer.validateAuthorizationRequest(request);

    const { email, password } = credentials;
    const userAccount = await this.userService.getUserByCredentials(
      email,
      password,
      'authorization_code',
      authRequest.client,
    );

    if (!userAccount) throw new UserNotFoundException(email);

    const updatedUser = User.create({
      ...userAccount,
      lastLoginAt: new Date().getTime() * 1000,
      lastLoginIP: request.ip.split(':').pop(),
    });

    await this.userService.updateUser(updatedUser);

    const { passwordHash, createdIP, createdAt, ...user } = updatedUser;
    const token = await this.jwtService.sign({
      user,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + 60 * 1000) / 1000), // 5 seconds
    });

    response.cookie('jid', token, {
      secure: true,
      httpOnly: true,
      sameSite: 'none',
      expires: new Date(Date.now() + 10 * 1000), // 30 days
    });

    // query URL must have the following params at this point: response_type, client_id, redirect_uri, scope, state, code_challenge, code_challenge_method
    const query = request.url.split('?')[1];
    response.redirect(`oauth/authorize?${query}`);
  }

  @Get('/verify')
  async verifyToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Cookies('session') sessionCookie: string,
  ): Promise<SessionVerificationResponse> {
    let session: SessionCookie;
    try {
      session = (await this.jwtService.verify(sessionCookie)) as SessionCookie;
    } catch {
      throw new InvalidSessionTokenException(request.ip); // forbidden 403
    }

    const now = Math.floor(Date.now() / 1000);
    if (now > session.iat + session.tokenData.expires_in) {
      const refreshToken = (await this.jwtService.verify(
        session.tokenData.refresh_token,
      )) as any as OAuthToken;
      if (this.tokenService.isRefreshTokenRevoked(refreshToken)) {
        response.clearCookie('session');
        throw new ExpiredTokenException('access'); // unauthorized 401, need to issue a new token pair
      } else
        return {
          // refresh token to send to /oauth/token with refresh_token grant
          user: await this.userService.getUserByCredentials(session.user),
          token: session.tokenData,
          refresh: true,
        };
    }

    return {
      user: await this.userService.getUserByCredentials(session.user),
      token: session.tokenData.access_token,
      refresh: false,
    };
  }

  @Patch('/logout')
  async logout(@Res({ passthrough: true }) response: Response): Promise<void> {
    response.clearCookie('session');
  }

  @Post('/signup')
  async signup(
    @Req() request: Request,
    @Body() credentials: UserCredentialsDto,
  ): Promise<void> {
    const { email, password, steamWebAPIToken, steamId } = credentials;
    await this.userService.registerUser(
      User.create({
        id: email.concat(await hash(email, SALT_ROUNDS)),
        email,
        username: email,
        steamWebAPIToken,
        steamId,
        passwordHash: await hash(password, SALT_ROUNDS),
        createdAt: new Date().getTime() * 1000,
        createdIP: request.ip.split(':').pop(),
        lastLoginAt: 0,
        lastLoginIP: '',
      }),
    );
  }
}

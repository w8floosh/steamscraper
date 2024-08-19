import { NestFactory } from '@nestjs/core';
import { OAuthModule } from './modules/oauth.module';
import { readFileSync } from 'fs';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const httpsOptions = {
    cert: readFileSync(process.env.CERT_PATH),
    key: readFileSync(process.env.CERTKEY_PATH),
  };
  const app = await NestFactory.create(OAuthModule, { httpsOptions });
  if (process.env.NODE_ENV === 'production')
    app.enableCors({
      origin: process.env.CORS_ORIGIN,
      credentials: true,
    });
  else {
    app.use((req, res, next) => {
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        res.setHeader(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization',
        );
        res.status(200).end(); // Respond with 200 OK for OPTIONS requests
      } else {
        next();
      }
    });
  }
  app.use(cookieParser());
  await app.listen(process.env.PORT || 4000);
}
bootstrap();

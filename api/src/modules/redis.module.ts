import { Logger, Module } from '@nestjs/common';
import { APIModule } from './api.module';
import { RedisService } from 'src/services/redis.service';
import { OperationRegistry } from 'src/services/operation.register';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    APIModule,
    ClientsModule.register([
      {
        name: 'REDIS_CLIENT',
        transport: Transport.REDIS,
        options: {
          host: 'redis.default.svc.cluster.local',
          port: 6379,
        },
      },
    ]),
  ],
  providers: [Logger, RedisService, OperationRegistry],
})
export class RedisModule {}

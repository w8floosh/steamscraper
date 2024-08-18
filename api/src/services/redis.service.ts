import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { ClientRedis } from '@nestjs/microservices';
import {
  CONSUMER_GROUP,
  CONSUMER_NAME,
  MESSAGE_LIST_INDEX,
  REQUEST_STREAM,
  RESPONSE_STREAM,
  STREAM_INDEX,
} from '../constants';
import { decode, getEnumTypeByValue } from '../utils';
import { OperationRegistry } from './operation.register';
import { RedisMessage, RedisMessageType } from 'src/types';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  public client: Redis;
  private readonly logger = new Logger(RedisService.name);
  constructor(
    @Inject('REDIS_CLIENT') private readonly proxy: ClientRedis,
    private readonly operationRegistry: OperationRegistry,
  ) {
    this.client = this.proxy.createClient();
  }

  async onModuleInit() {
    setTimeout(async () => {
      await this.client.xgroup(
        'CREATE',
        REQUEST_STREAM,
        CONSUMER_GROUP,
        '$',
        'MKSTREAM',
      );
      await this.client.xtrim(REQUEST_STREAM, 'MAXLEN', '~', '1000')
      while (true) {
        let requests = await this.client.xreadgroup(
          'GROUP',
          CONSUMER_GROUP,
          CONSUMER_NAME,
          'BLOCK',
          3000,
          'STREAMS',
          REQUEST_STREAM,
          '>',
        );

        if (requests?.length) {
          this.logger.verbose(`Found ${requests.length} pending messages`);
          requests = requests as Array<any>;
          for (const message of requests[STREAM_INDEX][MESSAGE_LIST_INDEX]) {
            const parsed = decode(message);
            const { id, ...data } = parsed;
            if (Object.values(data).every((x) => x)) {
              const operation = getEnumTypeByValue(
                RedisMessageType,
                parsed.type.toString(),
              );
              if (!operation) {
                const error = new RedisMessage(
                  parsed.consumer,
                  parsed.requester,
                  parsed.type,
                );
                error.payload.success = false;
                error.payload.errors.push('illegal opcode');
                (await this.client.xack(REQUEST_STREAM, CONSUMER_GROUP, id)) &&
                  this.logger.log(
                    `Acknowledged message ${id} by ${CONSUMER_NAME} (${CONSUMER_GROUP}) in ${REQUEST_STREAM}`,
                  );
                (await this.client.xadd(
                  RESPONSE_STREAM.concat('_', parsed.consumer),
                  '*',
                  'requester',
                  parsed.requester,
                  'type',
                  parsed.type,
                  'payload',
                  JSON.stringify(error.payload),
                )) &&
                  this.logger.log(
                    `${CONSUMER_NAME} (${CONSUMER_GROUP}) sent response to message ${id} in ${REQUEST_STREAM}`,
                  );
                this.logger.warn(
                  'Discarding invalid message ' + id + ' (illegal opcode)',
                );
                continue;
              }
              const computed = this.operationRegistry.execute(
                RedisMessageType[operation],
                data,
              );

              if (await this.client.xack(REQUEST_STREAM, CONSUMER_GROUP, id))
                this.logger.log(
                  `Acknowledged message ${id} by ${CONSUMER_NAME} (${CONSUMER_GROUP}) in ${REQUEST_STREAM}`,
                );
              await this.client.xadd(
                RESPONSE_STREAM.concat('_', parsed.consumer),
                '*',
                'requester',
                computed.requester,
                'type',
                computed.type,
                'payload',
                JSON.stringify(computed.payload),
              );
            } else {
              this.logger.warn(
                'Discarding invalid message ' + id + ' (corrupted data)',
              );
            }
          }
        } else {
          this.logger.verbose('No messages found. Retrying');
        }
      }
    });
  }
  async onModuleDestroy() {
    await this.client.quit();
  }
}

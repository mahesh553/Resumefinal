import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WebSocketGatewayService } from './websocket-gateway.service';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '15m',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [WebSocketGatewayService, WsAuthGuard],
  exports: [WebSocketGatewayService],
})
export class WebSocketModule {}
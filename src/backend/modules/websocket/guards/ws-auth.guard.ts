import { Injectable, CanActivate } from '@nestjs/common';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../auth/auth.service';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
  ) {}

  async canActivate(context: any): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractTokenFromSocket(client);

      if (!token) {
        throw new WsException('No token provided');
      }

      const payload = this.jwtService.verify(token);
      const user = await this.authService.validateUser(payload);

      if (!user) {
        throw new WsException('Invalid token');
      }

      // Store user data in client for later use
      client.data.user = user;
      client.data.userId = user.id;

      return true;
    } catch (error) {
      throw new WsException('Unauthorized');
    }
  }

  private extractTokenFromSocket(client: Socket): string | null {
    // Try to get token from handshake auth
    const token = client.handshake?.auth?.token || 
                 client.handshake?.query?.token ||
                 client.data?.token;
    
    if (token && typeof token === 'string') {
      // Remove 'Bearer ' prefix if present
      return token.replace('Bearer ', '');
    }
    
    return null;
  }
}
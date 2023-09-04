import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import * as fastify from 'fastify'

export class ReqContractDto {
  file: any
}

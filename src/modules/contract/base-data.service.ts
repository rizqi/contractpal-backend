import { ConfigService } from "@nestjs/config";

export class BaseDataService {
  constructor(private configService: ConfigService) { }
}
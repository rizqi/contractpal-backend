
// Nest JS
import { FileInterceptor } from '@nestjs/platform-express'
import { Body, Controller, FileTypeValidator, Get, MaxFileSizeValidator, ParseFilePipe, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common'

// Local
import { ReqContractDto } from './dto/req-contract.dto'
import { ContractService } from './contract.service'

@Controller('/contract')
export class ContractController {
  constructor(private readonly contractService: ContractService,) { }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async createSummaries(@UploadedFile(new ParseFilePipe({
    validators: [
      new FileTypeValidator({ fileType: '.pdf' }),
      new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 4 }),
    ],
  })) file: Express.Multer.File, @Body() body: any, @Req() req: any): Promise<any> {    
    const response = await this.contractService.getContractSummary(file, body.rule)
    return response.toString();
  }

  @Post("/upload")
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile(new ParseFilePipe({
    validators: [
      new FileTypeValidator({ fileType: '.pdf' }),
      new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 4 }),
    ],
  })) file: Express.Multer.File, @Body() body: any, @Req() req: any): Promise<any> {    
    const response = await this.contractService.saveUploadDoc(file)
    return response.toString();
  }
  
  @Post("/summary")
  async getSummary(@Body() body: any, @Req() req: any): Promise<any> {    
    const response = await this.contractService.getSummary(body.id, body.rule)
    return response.toString();
  }
}
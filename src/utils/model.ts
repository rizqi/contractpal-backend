import { ChatOpenAI } from "langchain/chat_models/openai"
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from "langchain";

@Injectable()
export class ModelUtil {
  constructor(private configService: ConfigService) { }

  private openAIApiKey = this.configService.get<string>('OPENAI_KEY')
  private chatModel = this.configService.get<string>('OPENAI_MODEL')
  private openAIApiBase = this.configService.get<string>('OPENAI_BASE')

  GetModel():ChatOpenAI {
    return new ChatOpenAI({
      temperature: 1,
      topP: 1,
      maxTokens: 16000,
      openAIApiKey: this.openAIApiKey,
      modelName: this.chatModel,
      verbose: true
      // streaming: true,
    }, { basePath: this.openAIApiBase })
  }
}
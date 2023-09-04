import { OpenAIEmbeddings } from "langchain/embeddings/openai"
import * as pdf from 'pdf-parse-fork'
import { HNSWLib } from "langchain/vectorstores/hnswlib"
import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { promises as fs } from 'fs';
import { TokenTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document"

@Injectable()
export class VectorUtil {
  constructor(private configService: ConfigService) { }
  private dir = "vector"
  private openAIApiKey = this.configService.get<string>('OPENAI_KEY')  

  // OpenAI will be used for embedding only, not for ChatCompletion
  private embeddings = new OpenAIEmbeddings({
    openAIApiKey: this.openAIApiKey,
  })

  private splitter = new TokenTextSplitter({
    // encodingName: "gpt2",
    chunkSize: 200,
    chunkOverlap: 20,
  });

  // default render callback
  private pdf_render_page = (pageData: any) =>  {
    //check documents https://mozilla.github.io/pdf.js/
    let render_options = {
        //replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
        normalizeWhitespace: false,
        //do not attempt to combine same line TextItem's. The default value is `false`.
        disableCombineTextItems: false
    }

    return pageData.getTextContent(render_options)
      .then((textContent: any) => {
        let lastY, text = '';        
        for (let item of textContent.items) {
          if (lastY == item.transform[5] || !lastY){
            text += ' ' + item.str;
          }  
          else{
            text += '\n' + item.str;
          }    
          lastY = item.transform[5];
        }
        // console.log(text)
        return text;
      });
  }    

  async CreateVectorStore() {
    // Create docs with a loader
    const pdfPath = "upload/UU_13_2003.pdf";
    const dataBuffer = await fs.readFile(pdfPath);
    const options = {
      pagerender: this.pdf_render_page
    }
    const data = await pdf(dataBuffer, options);    

    const docs = [new Document({ pageContent: data.text })];    

    const docsSplit = await this.splitter.splitDocuments(docs)  

    const vectorStore = await HNSWLib.fromDocuments(docsSplit, this.embeddings)

    // Save vector to a directory
    await vectorStore.save(this.dir)    
    console.log('Vector undang - undang successfully created')
  }

  async VectorStore(): Promise<HNSWLib> {
    const vectorStore = await HNSWLib.load(this.dir, this.embeddings)

    return vectorStore
  }
}
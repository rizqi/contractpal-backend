/* Nest JS */
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpException, HttpStatus } from '@nestjs/common'
import * as pdf from 'pdf-parse-fork'

/* Local */
import { ReqContractDto } from './dto/req-contract.dto'
import { ModelUtil } from 'src/utils/model'
import { VectorUtil } from 'src/utils/vectorStore'
import { TokenTextSplitter } from "langchain/text_splitter";

/* Langchain */
import { TextLoader } from 'langchain/document_loaders/fs/text'
import { CharacterTextSplitter } from 'langchain/text_splitter'
import { Document } from "langchain/document"
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from 'langchain/prompts'
import { LLMChain } from 'langchain/chains'
import { RetrievalQAChain } from "langchain/chains";
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'


@Injectable()
export class ContractService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache, private configService: ConfigService) { }

  private openAIApiKey = this.configService.get<string>('OPENAI_KEY')
  private vectorStore = new VectorUtil(this.configService)
  private model = new ModelUtil(this.configService)

  // rule = ["Working Hours"]
  // rule = ["Salary"]
  // rule = ["Salary and Allowances", "Job Description", "Employment Status", "Working Hours", "Obligations and Responsibilities", "Consequences of Violation", "Leave Entitlement", "Welfare and Insurance", "Termination of Contract"]


  async getContractSummary(req: Express.Multer.File, rule: string): Promise<any> {
    const docs = await this.loadInputDoc(req)
    const inputVectorStore = await this.createVectorStore(docs)
    let response: any

    const rulesArr = rule.split(",");

    await Promise.all(rulesArr.map(async (context) => {

      // create compression contract and uu
      const uuPromise = (async () => {
        // Create a chain that uses the OpenAI LLM and HNSWLib vector store.      
        const compressedChainUU = RetrievalQAChain.fromLLM(this.model.GetModel(), (await this.vectorStore.VectorStore()).asRetriever(10));
        const responseChainUU = await compressedChainUU.call({
          query: `Find applicable law related to ${context}`,
        });
        const uu = responseChainUU.text;
        console.log('Compressed undang - undang created')
        return uu;
      })();


      const contractPromise = (async () => {
        const compressedChainContract = RetrievalQAChain.fromLLM(this.model.GetModel(), inputVectorStore.asRetriever(10));
        const responseChainContract = await compressedChainContract.call({
          query: `Find applicable term related to ${context}`,
        });
        const contract = responseChainContract.text;
        console.log('Compressed contract created')
        return contract;
      })();

      const uu = await uuPromise;
      const contract = await contractPromise;

      console.log(`Undang undang terkait ${context}`, uu)
      console.log(`Kontrak kerja terkait ${context}`, contract)

      const chatPrompt = ChatPromptTemplate.fromPromptMessages([
        SystemMessagePromptTemplate.fromTemplate(
          (`You are a helpful assistant that Develop a system to analyze legal documents and provide a comprehensive legal checker tool. The system should be capable of reviewing and verifying various legal documents, contracts, and agreements. It should offer an automated process to identify potential issues, inconsistencies, and discrepancies within the documents.
          Response Formatting Prompt:

          When responding, please organize the information as outlined below:

          ${context}:
            - (✔) [Description of the positive aspect]
            - (X) [Description of the negative or missing aspect]
            - (-) References to applicable laws or regulations if necessary.

          This is the source of the applicable law about ${context}: {uu}.`).trim()
        ),
        HumanMessagePromptTemplate.fromTemplate((
          `Please review this ${context} contract base on knowledge you have. 
          Provide all response in Indonesian languange.
          The contract: {contract}.`).trim()
        ),
      ])

      const chain = new LLMChain({
        prompt: chatPrompt,
        llm: this.model.GetModel(),
      })

      // const uu = await (await this.vectorStore.VectorStore()).similaritySearch("give me information contained in the law about " + context, 5)
      // const uuContent = uu.map(val => val.pageContent).toString()

      // const text = await inputVectorStore.similaritySearch("give me information about " + context, 5)
      // const textContent = text.map(val => val.pageContent).toString()

      // console.log(uuContent)
      // console.log(textContent)
      return chain.call({
        uu: uu,
        contract: contract,
      })
    })).then(values => {
      response = values.map(val => val.text)
    }).catch(error => {
      console.log(error.response.data.error.message)
      throw new HttpException(
        error.response.data.error.message,
        error.response.status,
      )
    })

    return response
  }

  // async loadInputDoc(file: Express.Multer.File): Promise<Document[]> {
  //   const data = await pdf(file.buffer)
  //   const splitter = new CharacterTextSplitter({
  //     separator: "PASAL",
  //     chunkSize: 500,
  //     chunkOverlap: 10,
  //   })
  //   const docs = await splitter.createDocuments([data.text])

  //   return docs
  // }

  async createVectorStore(docs: Document[]): Promise<MemoryVectorStore> {
    // OpenAI will be used for embedding only, not for ChatCompletion
    const vectorStore = await MemoryVectorStore.fromDocuments(
      docs,
      new OpenAIEmbeddings({ openAIApiKey: this.openAIApiKey, verbose: true })
    )

    return vectorStore
  }

  async loadInputDoc(file: Express.Multer.File): Promise<Document[]> {

    // default render callback
    const render_page = (pageData: any) => {
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
            if (lastY == item.transform[5] || !lastY) {
              text += ' ' + item.str;
            }
            else {
              text += '\n' + item.str;
            }
            lastY = item.transform[5];
          }
          // console.log(text)
          return text;
        });
    }

    let options = {
      pagerender: render_page
    }

    try {
      const splitter = new TokenTextSplitter({
        // encodingName: "gpt2",
        chunkSize: 200,
        chunkOverlap: 20,
      });

      const data = await pdf(file.buffer, options);

      const docs = [new Document({ pageContent: data.text, metadata: { id: file.originalname } })];

      const docsSplit = await splitter.splitDocuments(docs)
      return docsSplit
    } catch (error) {
      console.error(error);
    }
  }

  async saveUploadDoc(file: Express.Multer.File): Promise<any> {
    const r = (Math.random() + 1).toString(36).substring(7)

    const docs = await this.loadInputDoc(file)
    const inputVectorStore = await this.createVectorStore(docs)
    await this.cacheManager.set(r, inputVectorStore, 10 * 60 * 1000)
    // console.log(inputVectorStore)
    console.log(await this.cacheManager.store.keys())
    return r
  }

  async getSummary(id: string, rule: string): Promise<any> {
    const inputVectorStore: MemoryVectorStore = await this.cacheManager.get(id)
    if(!inputVectorStore) {
      throw new HttpException(
        "id not found",
        HttpStatus.NOT_FOUND,
      )
    }
    
    let response: any

    const rulesArr = rule.split(",");

    await Promise.all(rulesArr.map(async (context) => {

      // create compression contract and uu
      const uuPromise = (async () => {
        // Create a chain that uses the OpenAI LLM and HNSWLib vector store.      
        const compressedChainUU = RetrievalQAChain.fromLLM(this.model.GetModel(), (await this.vectorStore.VectorStore()).asRetriever(10));
        const responseChainUU = await compressedChainUU.call({
          query: `Find applicable law related to ${context}`,
        });
        const uu = responseChainUU.text;
        console.log('Compressed undang - undang created')
        return uu;
      })();


      const contractPromise = (async () => {
        const compressedChainContract = RetrievalQAChain.fromLLM(this.model.GetModel(), inputVectorStore.asRetriever(10));
        const responseChainContract = await compressedChainContract.call({
          query: `Find applicable term related to ${context}`,
        });
        const contract = responseChainContract.text;
        console.log('Compressed contract created')
        return contract;
      })();

      const uu = await uuPromise;
      const contract = await contractPromise;

      console.log(`Undang undang terkait ${context}`, uu)
      console.log(`Kontrak kerja terkait ${context}`, contract)

      const chatPrompt = ChatPromptTemplate.fromPromptMessages([
        SystemMessagePromptTemplate.fromTemplate(
          (`You are a helpful assistant that Develop a system to analyze legal documents and provide a comprehensive legal checker tool. The system should be capable of reviewing and verifying various legal documents, contracts, and agreements. It should offer an automated process to identify potential issues, inconsistencies, and discrepancies within the documents.
          Response Formatting Prompt:

          When responding, please organize the information as outlined below:

          ${context}:
            - (✔) [Description of the positive aspect]
            - (X) [Description of the negative or missing aspect]
            - (-) References to applicable laws or regulations if necessary.

          This is the source of the applicable law about ${context}: {uu}.`).trim()
        ),
        HumanMessagePromptTemplate.fromTemplate((
          `Please review this ${context} contract base on knowledge you have. 
          Provide all response in Indonesian languange.
          The contract: {contract}.`).trim()
        ),
      ])

      const chain = new LLMChain({
        prompt: chatPrompt,
        llm: this.model.GetModel(),
      })

      // const uu = await (await this.vectorStore.VectorStore()).similaritySearch("give me information contained in the law about " + context, 5)
      // const uuContent = uu.map(val => val.pageContent).toString()

      // const text = await inputVectorStore.similaritySearch("give me information about " + context, 5)
      // const textContent = text.map(val => val.pageContent).toString()

      // console.log(uuContent)
      // console.log(textContent)
      return chain.call({
        uu: uu,
        contract: contract,
      })
    })).then(values => {
      response = values.map(val => val.text)
    }).catch(error => {
      console.log(error.response.data.error.message)
      throw new HttpException(
        error.response.data.error.message,
        error.response.status,
      )
    })

    return response
  }
}
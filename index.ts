/* eslint-disable turbo/no-undeclared-env-vars */
import cors from "cors";
import "dotenv/config";
import express, { Express, Request, Response } from "express";
import { initObservability } from "./src/observability";
import chatRouter from "./src/routes/chat.route";
//////////
import {
  Ollama,
  Settings,
  SimpleDirectoryReader,
  VectorStoreIndex,
} from "llamaindex";
const ollamaLLM = new Ollama({ model: "gemma:2b", temperature: 0.75 });
Settings.llm = ollamaLLM;
Settings.embedModel = ollamaLLM;

//////////

const app: Express = express();
const port = parseInt(process.env.PORT || "8000");

const env = process.env["NODE_ENV"];
const isDevelopment = !env || env === "development";
const prodCorsOrigin = process.env["PROD_CORS_ORIGIN"];

initObservability();

app.use(express.json());

if (isDevelopment) {
  console.warn("Running in development mode - allowing CORS for all origins");
  app.use(cors());
} else if (prodCorsOrigin) {
  console.log(
    `Running in production mode - allowing CORS for domain: ${prodCorsOrigin}`,
  );
  const corsOptions = {
    origin: prodCorsOrigin, // Restrict to production domain
  };
  app.use(cors(corsOptions));
} else {
  console.warn("Production CORS origin not set, defaulting to no CORS.");
}
//////////////////////////////////
const initializeServer = async () => {
  // const essay = await fs.readFile("./data/101.pdf", "utf-8");
  //
  // const document = new Document({
  //   text: "There was a farmer who had a dog and bingo was the dog's name.",
  //   id_: "essay",
  // });
  // console.log(document);

  // Load our data from a local directory
  const documents = await new SimpleDirectoryReader().loadData({
    directoryPath: "./data",
  });

  // Load and index documents
  const index = await VectorStoreIndex.fromDocuments(documents);

  // get retriever
  const retriever = index.asRetriever();

  // Create a query engine
  const queryEngine = index.asQueryEngine({
    retriever,
  });

  const query = "what was the dog's name?";

  // Query
  const response = await queryEngine.query({
    query,
  });

  // Log the response
  console.log(response.response);

  //////////////////////////////////
  app.use(express.text());

  app.get("/", (req: Request, res: Response) => {
    res.send("Ollama Express Server");
  });

  app.use("/api/chat", chatRouter);

  app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
  });
};
initializeServer();

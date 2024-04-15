var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/observability/index.ts
var initObservability;
var init_observability = __esm({
  "src/observability/index.ts"() {
    "use strict";
    initObservability = () => {
    };
  }
});

// src/controllers/engine/shared.ts
var STORAGE_CACHE_DIR, CHUNK_SIZE, CHUNK_OVERLAP;
var init_shared = __esm({
  "src/controllers/engine/shared.ts"() {
    "use strict";
    STORAGE_CACHE_DIR = "./cache";
    CHUNK_SIZE = 512;
    CHUNK_OVERLAP = 20;
  }
});

// src/controllers/engine/index.ts
import {
  serviceContextFromDefaults,
  storageContextFromDefaults,
  VectorStoreIndex
} from "llamaindex";
function getDataSource(llm) {
  return __async(this, null, function* () {
    const serviceContext = serviceContextFromDefaults({
      llm,
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP
    });
    const storageContext = yield storageContextFromDefaults({
      persistDir: `${STORAGE_CACHE_DIR}`
    });
    const numberOfDocs = Object.keys(
      storageContext.docStore.toDict()
    ).length;
    if (numberOfDocs === 0) {
      return null;
    }
    return yield VectorStoreIndex.init({
      storageContext,
      serviceContext
    });
  });
}
var init_engine = __esm({
  "src/controllers/engine/index.ts"() {
    "use strict";
    init_shared();
  }
});

// src/controllers/engine/chat.ts
import { ContextChatEngine } from "llamaindex";
function createChatEngine(llm) {
  return __async(this, null, function* () {
    const index = yield getDataSource(llm);
    if (!index) {
      throw new Error(
        `StorageContext is empty - call 'npm run generate' to generate the storage first`
      );
    }
    const retriever = index.asRetriever();
    retriever.similarityTopK = 3;
    return new ContextChatEngine({
      chatModel: llm,
      retriever
    });
  });
}
var init_chat = __esm({
  "src/controllers/engine/chat.ts"() {
    "use strict";
    init_engine();
  }
});

// src/controllers/chat-request.controller.ts
import { OpenAI } from "llamaindex";
var convertMessageContent, chatRequest;
var init_chat_request_controller = __esm({
  "src/controllers/chat-request.controller.ts"() {
    "use strict";
    init_chat();
    convertMessageContent = (textMessage, imageUrl) => {
      if (!imageUrl)
        return textMessage;
      return [
        {
          type: "text",
          text: textMessage
        },
        {
          type: "image_url",
          image_url: {
            url: imageUrl
          }
        }
      ];
    };
    chatRequest = (req, res) => __async(void 0, null, function* () {
      try {
        const { messages, data } = req.body;
        const userMessage = messages.pop();
        if (!messages || !userMessage || userMessage.role !== "user") {
          return res.status(400).json({
            error: "messages are required in the request body and the last message must be from the user"
          });
        }
        const llm = new OpenAI({
          model: process.env.MODEL || "gpt-3.5-turbo"
        });
        const userMessageContent = convertMessageContent(
          userMessage.content,
          data == null ? void 0 : data.imageUrl
        );
        const chatEngine = yield createChatEngine(llm);
        const response = yield chatEngine.chat({
          message: userMessageContent,
          chatHistory: messages
        });
        const result = {
          role: "assistant",
          content: response.response
        };
        return res.status(200).json({
          result
        });
      } catch (error) {
        console.error("[LlamaIndex]", error);
        return res.status(500).json({
          error: error.message
        });
      }
    });
  }
});

// src/controllers/llamaindex-stream.ts
import {
  createCallbacksTransformer,
  createStreamDataTransformer,
  experimental_StreamData,
  trimStartOfStreamHelper
} from "ai";
import { StreamingAgentChatResponse } from "llamaindex";
function createParser(res, data, opts) {
  const it = res[Symbol.asyncIterator]();
  const trimStartOfStream = trimStartOfStreamHelper();
  return new ReadableStream({
    start() {
      if (opts == null ? void 0 : opts.image_url) {
        const message = {
          type: "image_url",
          image_url: {
            url: opts.image_url
          }
        };
        data.append(message);
      } else {
        data.append({});
      }
    },
    pull(controller) {
      return __async(this, null, function* () {
        var _a2;
        const { value, done } = yield it.next();
        if (done) {
          controller.close();
          data.append({});
          data.close();
          return;
        }
        const text = trimStartOfStream((_a2 = value.response) != null ? _a2 : "");
        if (text) {
          controller.enqueue(text);
        }
      });
    }
  });
}
function LlamaIndexStream(response, opts) {
  const data = new experimental_StreamData();
  const res = response instanceof StreamingAgentChatResponse ? response.response : response;
  return {
    stream: createParser(res, data, opts == null ? void 0 : opts.parserOptions).pipeThrough(createCallbacksTransformer(opts == null ? void 0 : opts.callbacks)).pipeThrough(createStreamDataTransformer(true)),
    data
  };
}
var init_llamaindex_stream = __esm({
  "src/controllers/llamaindex-stream.ts"() {
    "use strict";
  }
});

// src/controllers/chat.controller.ts
import { streamToResponse } from "ai";
import { OpenAI as OpenAI2 } from "llamaindex";
var convertMessageContent2, chat;
var init_chat_controller = __esm({
  "src/controllers/chat.controller.ts"() {
    "use strict";
    init_chat();
    init_llamaindex_stream();
    convertMessageContent2 = (textMessage, imageUrl) => {
      if (!imageUrl)
        return textMessage;
      return [
        {
          type: "text",
          text: textMessage
        },
        {
          type: "image_url",
          image_url: {
            url: imageUrl
          }
        }
      ];
    };
    chat = (req, res) => __async(void 0, null, function* () {
      try {
        const { messages, data } = req.body;
        const userMessage = messages.pop();
        if (!messages || !userMessage || userMessage.role !== "user") {
          return res.status(400).json({
            error: "messages are required in the request body and the last message must be from the user"
          });
        }
        const llm = new OpenAI2({
          model: process.env.MODEL || "gpt-3.5-turbo"
        });
        const chatEngine = yield createChatEngine(llm);
        const userMessageContent = convertMessageContent2(
          userMessage.content,
          data == null ? void 0 : data.imageUrl
        );
        const response = yield chatEngine.chat({
          message: userMessageContent,
          chatHistory: messages,
          stream: true
        });
        const { stream, data: streamData } = LlamaIndexStream(response, {
          parserOptions: {
            image_url: data == null ? void 0 : data.imageUrl
          }
        });
        const processedStream = stream.pipeThrough(streamData.stream);
        return streamToResponse(processedStream, res, {
          headers: {
            // response MUST have the `X-Experimental-Stream-Data: 'true'` header
            // so that the client uses the correct parsing logic, see
            // https://sdk.vercel.ai/docs/api-reference/stream-data#on-the-server
            "X-Experimental-Stream-Data": "true",
            "Content-Type": "text/plain; charset=utf-8",
            "Access-Control-Expose-Headers": "X-Experimental-Stream-Data"
          }
        });
      } catch (error) {
        console.error("[LlamaIndex]", error);
        return res.status(500).json({
          error: error.message
        });
      }
    });
  }
});

// src/routes/chat.route.ts
import express from "express";
var llmRouter, chat_route_default;
var init_chat_route = __esm({
  "src/routes/chat.route.ts"() {
    "use strict";
    init_chat_request_controller();
    init_chat_controller();
    llmRouter = express.Router();
    llmRouter.route("/").post(chat);
    llmRouter.route("/request").post(chatRequest);
    chat_route_default = llmRouter;
  }
});

// index.ts
import cors from "cors";
import "dotenv/config";
import express2 from "express";
import {
  Ollama,
  Settings,
  SimpleDirectoryReader,
  VectorStoreIndex as VectorStoreIndex2
} from "llamaindex";
var require_ollama_app = __commonJS({
  "index.ts"(exports) {
    init_observability();
    init_chat_route();
    var ollamaLLM = new Ollama({ model: "gemma:2b", temperature: 0.75 });
    Settings.llm = ollamaLLM;
    Settings.embedModel = ollamaLLM;
    var app = express2();
    var port = parseInt(process.env.PORT || "8000");
    var env = process.env["NODE_ENV"];
    var isDevelopment = !env || env === "development";
    var prodCorsOrigin = process.env["PROD_CORS_ORIGIN"];
    initObservability();
    app.use(express2.json());
    if (isDevelopment) {
      console.warn("Running in development mode - allowing CORS for all origins");
      app.use(cors());
    } else if (prodCorsOrigin) {
      console.log(
        `Running in production mode - allowing CORS for domain: ${prodCorsOrigin}`
      );
      const corsOptions = {
        origin: prodCorsOrigin
        // Restrict to production domain
      };
      app.use(cors(corsOptions));
    } else {
      console.warn("Production CORS origin not set, defaulting to no CORS.");
    }
    var initializeServer = () => __async(exports, null, function* () {
      const documents = yield new SimpleDirectoryReader().loadData({
        directoryPath: "./data"
      });
      const index = yield VectorStoreIndex2.fromDocuments(documents);
      const retriever = index.asRetriever();
      const queryEngine = index.asQueryEngine({
        retriever
      });
      const query = "what was the dog's name?";
      const response = yield queryEngine.query({
        query
      });
      console.log(response.response);
      app.use(express2.text());
      app.get("/", (req, res) => {
        res.send("Ollama Express Server");
      });
      app.use("/api/chat", chat_route_default);
      app.listen(port, () => {
        console.log(`\u26A1\uFE0F[server]: Server is running at http://localhost:${port}`);
      });
    });
    initializeServer();
  }
});
export default require_ollama_app();

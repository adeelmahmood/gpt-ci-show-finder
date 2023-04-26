"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var supabase_js_1 = require("@supabase/supabase-js");
var dotenv_1 = require("dotenv");
var gpt3_tokenizer_1 = require("gpt3-tokenizer");
var openai_1 = require("openai");
dotenv_1["default"].config({ path: ".env.local" });
// configure openai
var configuration = new openai_1.Configuration({
    apiKey: process.env.OPENAI_API_KEY
});
var openai = new openai_1.OpenAIApi(configuration);
// configure supabase
var supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});
function loadTitles() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, error, data;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("Loading netflix titles from database");
                    return [4 /*yield*/, supabase.from("netflix_titles").select("*").limit(2)];
                case 1:
                    _a = _b.sent(), error = _a.error, data = _a.data;
                    if (error) {
                        console.error("Error in reading titles from database");
                        throw error;
                    }
                    return [2 /*return*/, data];
            }
        });
    });
}
function printEmbedding(embedding, inFull) {
    if (inFull === void 0) { inFull = false; }
    if (inFull) {
        console.log(embedding);
    }
    else {
        console.log("[".concat(embedding[0], ",").concat(embedding[1], "...").concat(embedding[embedding.length - 1], "]"));
    }
}
function generateEmbeddings(updateEmbeddings) {
    if (updateEmbeddings === void 0) { updateEmbeddings = false; }
    return __awaiter(this, void 0, void 0, function () {
        var titles, _i, titles_1, title, embedding, _a, error, data;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("generating embeddings");
                    return [4 /*yield*/, loadTitles()];
                case 1:
                    titles = _b.sent();
                    _i = 0, titles_1 = titles;
                    _b.label = 2;
                case 2:
                    if (!(_i < titles_1.length)) return [3 /*break*/, 6];
                    title = titles_1[_i];
                    return [4 /*yield*/, getEmbedding(title.description)];
                case 3:
                    embedding = _b.sent();
                    if (!updateEmbeddings) return [3 /*break*/, 5];
                    return [4 /*yield*/, supabase.from("netflix_titles_descr_embeddings").insert({
                            description: title.description,
                            embeddings: embedding,
                            show_id: title.show_id
                        })];
                case 4:
                    _a = _b.sent(), error = _a.error, data = _a.data;
                    if (error) {
                        console.error("Error in adding embedding to database");
                        throw error;
                    }
                    _b.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 2];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function getEmbedding(input) {
    return __awaiter(this, void 0, void 0, function () {
        var sanitizedInput, tokenizer, encoded, response, responseData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sanitizedInput = Array.isArray(input) ? input : [input];
                    sanitizedInput.forEach(function (i) { return i.trim(); });
                    tokenizer = new gpt3_tokenizer_1["default"]({ type: "gpt3" });
                    encoded = tokenizer.encode(input[0]);
                    console.log("Input ".concat(input[0], ", token length ").concat(encoded));
                    return [4 /*yield*/, openai.createEmbedding({
                            model: "text-embedding-ada-002",
                            input: sanitizedInput
                        })];
                case 1:
                    response = _a.sent();
                    if (response.status != 200) {
                        throw new Error("embedding request failed");
                    }
                    console.log(response.data);
                    responseData = response.data.data[0];
                    return [2 /*return*/, responseData.embedding];
            }
        });
    });
}
function testRpc() {
    return __awaiter(this, void 0, void 0, function () {
        var embedding, _a, rpcError, rpcData;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("now testing RPC");
                    return [4 /*yield*/, getEmbedding("food")];
                case 1:
                    embedding = _b.sent();
                    return [4 /*yield*/, supabase.rpc("match_netflix_titles_descr", {
                            embeddings: embedding,
                            match_threshold: 0.78,
                            match_count: 10
                        })];
                case 2:
                    _a = _b.sent(), rpcError = _a.error, rpcData = _a.data;
                    console.log(rpcError, rpcData);
                    return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getEmbedding(["test", "flowers"])];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
main()["catch"](function (e) {
    console.error(e);
    process.exit(1);
});

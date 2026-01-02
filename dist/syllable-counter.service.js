"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var SyllableCounterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyllableCounterService = void 0;
const common_1 = require("@nestjs/common");
const kuromoji = __importStar(require("kuromoji"));
const wanakana_1 = require("wanakana");
const util_1 = require("util");
const path = __importStar(require("path"));
let SyllableCounterService = SyllableCounterService_1 = class SyllableCounterService {
    logger = new common_1.Logger(SyllableCounterService_1.name);
    tokenizer = null;
    initPromise = null;
    async onModuleInit() {
        this.initPromise = this.initializeTokenizer();
        await this.initPromise;
    }
    async initializeTokenizer() {
        try {
            const dicPath = path.join(process.cwd(), 'node_modules/kuromoji/dict');
            this.logger.log(`Initializing kuromoji tokenizer with dictionary path: ${dicPath}`);
            const builder = kuromoji.builder({ dicPath });
            const buildAsync = (0, util_1.promisify)(builder.build.bind(builder));
            this.tokenizer = await buildAsync();
            this.logger.log('Kuromoji tokenizer initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize kuromoji tokenizer', error);
            throw error;
        }
    }
    async countSyllables(text) {
        if (this.initPromise) {
            await this.initPromise;
        }
        if (!this.tokenizer) {
            throw new Error('Tokenizer not initialized');
        }
        const cleanText = text.replace(/\s+/g, '');
        if (!cleanText)
            return 0;
        try {
            const tokens = this.tokenizer.tokenize(cleanText);
            let totalMorae = 0;
            for (const token of tokens) {
                const reading = token.reading || token.surface_form;
                const hiragana = (0, wanakana_1.toHiragana)(reading);
                totalMorae += this.countMoraeInHiragana(hiragana);
            }
            return totalMorae;
        }
        catch (error) {
            this.logger.error(`Failed to count syllables for text: ${text}`, error);
            return 0;
        }
    }
    countMoraeInHiragana(text) {
        let count = 0;
        const smallKana = ['ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'ゎ', 'ャ', 'ュ', 'ョ', 'ァ', 'ィ', 'ゥ', 'ェ', 'ォ', 'ヮ'];
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (smallKana.includes(char)) {
                continue;
            }
            if (this.isJapaneseCharacter(char)) {
                count++;
            }
        }
        return count;
    }
    isJapaneseCharacter(char) {
        const code = char.charCodeAt(0);
        return (code >= 0x3040 && code <= 0x309F) || (code >= 0x30A0 && code <= 0x30FF);
    }
};
exports.SyllableCounterService = SyllableCounterService;
exports.SyllableCounterService = SyllableCounterService = SyllableCounterService_1 = __decorate([
    (0, common_1.Injectable)()
], SyllableCounterService);
//# sourceMappingURL=syllable-counter.service.js.map
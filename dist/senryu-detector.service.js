"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SenryuDetectorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SenryuDetectorService = void 0;
const common_1 = require("@nestjs/common");
const syllable_counter_service_1 = require("./syllable-counter.service");
let SenryuDetectorService = SenryuDetectorService_1 = class SenryuDetectorService {
    syllableCounter;
    logger = new common_1.Logger(SenryuDetectorService_1.name);
    constructor(syllableCounter) {
        this.syllableCounter = syllableCounter;
    }
    async detectSenryu(text) {
        const cleanText = this.cleanText(text);
        if (!cleanText)
            return null;
        const segments = this.segmentText(cleanText);
        for (let i = 0; i < segments.length - 2; i++) {
            for (let j = i + 1; j < segments.length - 1; j++) {
                for (let k = j + 1; k < segments.length; k++) {
                    const line1 = segments.slice(i, j).join('');
                    const line2 = segments.slice(j, k).join('');
                    const line3 = segments.slice(k, k + 1).join('');
                    const count1 = await this.syllableCounter.countSyllables(line1);
                    const count2 = await this.syllableCounter.countSyllables(line2);
                    const count3 = await this.syllableCounter.countSyllables(line3);
                    if (count1 === 5 && count2 === 7 && count3 === 5) {
                        this.logger.log(`Senryu detected: [${line1}](5) [${line2}](7) [${line3}](5)`);
                        return { line1, line2, line3 };
                    }
                }
            }
        }
        const continuousResult = await this.detectContinuousSenryu(cleanText);
        if (continuousResult) {
            return continuousResult;
        }
        return null;
    }
    async detectContinuousSenryu(text) {
        const maxLength = text.length;
        for (let i = 1; i < maxLength - 1; i++) {
            for (let j = i + 1; j < maxLength; j++) {
                const line1 = text.substring(0, i);
                const line2 = text.substring(i, j);
                const line3 = text.substring(j);
                const count1 = await this.syllableCounter.countSyllables(line1);
                const count2 = await this.syllableCounter.countSyllables(line2);
                const count3 = await this.syllableCounter.countSyllables(line3);
                if (count1 === 5 && count2 === 7 && count3 === 5) {
                    this.logger.log(`Continuous senryu detected: [${line1}](5) [${line2}](7) [${line3}](5)`);
                    return { line1, line2, line3 };
                }
            }
        }
        return null;
    }
    cleanText(text) {
        return text
            .replace(/https?:\/\/[^\s]+/g, '')
            .replace(/<@!?\d+>/g, '')
            .replace(/<#\d+>/g, '')
            .replace(/<@&\d+>/g, '')
            .replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, '')
            .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
            .replace(/[\s\u3000]+/g, '')
            .trim();
    }
    segmentText(text) {
        const segments = [];
        let current = '';
        for (const char of text) {
            if ('、。！？!?\n\r'.includes(char)) {
                if (current) {
                    segments.push(current);
                    current = '';
                }
            }
            else {
                current += char;
            }
        }
        if (current) {
            segments.push(current);
        }
        if (segments.length === 0) {
            segments.push(text);
        }
        return segments;
    }
};
exports.SenryuDetectorService = SenryuDetectorService;
exports.SenryuDetectorService = SenryuDetectorService = SenryuDetectorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [syllable_counter_service_1.SyllableCounterService])
], SenryuDetectorService);
//# sourceMappingURL=senryu-detector.service.js.map
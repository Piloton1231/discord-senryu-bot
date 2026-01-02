import { SyllableCounterService } from './syllable-counter.service';
export interface SenryuMatch {
    line1: string;
    line2: string;
    line3: string;
}
export declare class SenryuDetectorService {
    private readonly syllableCounter;
    private readonly logger;
    constructor(syllableCounter: SyllableCounterService);
    detectSenryu(text: string): Promise<SenryuMatch | null>;
    private detectContinuousSenryu;
    private cleanText;
    private segmentText;
}

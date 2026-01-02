import { OnModuleInit } from '@nestjs/common';
export declare class SyllableCounterService implements OnModuleInit {
    private readonly logger;
    private tokenizer;
    private initPromise;
    onModuleInit(): Promise<void>;
    private initializeTokenizer;
    countSyllables(text: string): Promise<number>;
    private countMoraeInHiragana;
    private isJapaneseCharacter;
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as kuromoji from 'kuromoji';
import { toHiragana } from 'wanakana';
import { promisify } from 'util';
import * as path from 'path';

@Injectable()
export class SyllableCounterService implements OnModuleInit {
  private readonly logger = new Logger(SyllableCounterService.name);
  private tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures> | null = null;
  private initPromise: Promise<void> | null = null;

  async onModuleInit() {
    this.initPromise = this.initializeTokenizer();
    await this.initPromise;
  }

  private async initializeTokenizer(): Promise<void> {
    try {
      const dicPath = path.join(process.cwd(), 'node_modules/kuromoji/dict');
      this.logger.log(`Initializing kuromoji tokenizer with dictionary path: ${dicPath}`);
      
      const builder = kuromoji.builder({ dicPath });
      const buildAsync = promisify(builder.build.bind(builder));
      this.tokenizer = await buildAsync() as kuromoji.Tokenizer<kuromoji.IpadicFeatures>;
      
      this.logger.log('Kuromoji tokenizer initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize kuromoji tokenizer', error);
      throw error;
    }
  }

  /**
   * Count the number of morae (syllables) in Japanese text
   * @param text Japanese text
   * @returns Number of morae
   */
  async countSyllables(text: string): Promise<number> {
    if (this.initPromise) {
      await this.initPromise;
    }

    if (!this.tokenizer) {
      throw new Error('Tokenizer not initialized');
    }

    // Remove whitespace
    const cleanText = text.replace(/\s+/g, '');
    if (!cleanText) return 0;

    try {
      // Tokenize the text
      const tokens = this.tokenizer.tokenize(cleanText);
      let totalMorae = 0;

      for (const token of tokens) {
        // Get the reading (pronunciation) in katakana
        const reading = token.reading || token.surface_form;
        // Convert to hiragana for counting
        const hiragana = toHiragana(reading);
        // Count morae
        totalMorae += this.countMoraeInHiragana(hiragana);
      }

      return totalMorae;
    } catch (error) {
      this.logger.error(`Failed to count syllables for text: ${text}`, error);
      return 0;
    }
  }

  /**
   * Count morae in hiragana text
   * Rules:
   * - Each hiragana character = 1 mora
   * - Small characters (ゃ, ゅ, ょ, ぁ, ぃ, ぅ, ぇ, ぉ, ゎ) = 0 mora (combined with previous)
   * - ん = 1 mora
   * - っ = 1 mora (counts as separate mora in Japanese prosody)
   */
  private countMoraeInHiragana(text: string): number {
    let count = 0;
    const smallKana = ['ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'ゎ', 'ャ', 'ュ', 'ョ', 'ァ', 'ィ', 'ゥ', 'ェ', 'ォ', 'ヮ'];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Skip small kana (they combine with the previous character)
      if (smallKana.includes(char)) {
        continue;
      }
      
      // Check if it's a Japanese character (hiragana, katakana)
      if (this.isJapaneseCharacter(char)) {
        count++;
      }
    }

    return count;
  }

  private isJapaneseCharacter(char: string): boolean {
    const code = char.charCodeAt(0);
    // Hiragana: 0x3040-0x309F
    // Katakana: 0x30A0-0x30FF
    return (code >= 0x3040 && code <= 0x309F) || (code >= 0x30A0 && code <= 0x30FF);
  }
}

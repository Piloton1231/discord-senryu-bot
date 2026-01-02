import { Injectable, Logger } from '@nestjs/common';
import { SyllableCounterService } from './syllable-counter.service';

export interface SenryuMatch {
  line1: string; // 5 syllables
  line2: string; // 7 syllables
  line3: string; // 5 syllables
}

@Injectable()
export class SenryuDetectorService {
  private readonly logger = new Logger(SenryuDetectorService.name);

  constructor(private readonly syllableCounter: SyllableCounterService) {}

  /**
   * Detect 5-7-5 pattern in text
   * @param text Input text
   * @returns SenryuMatch if detected, null otherwise
   */
  async detectSenryu(text: string): Promise<SenryuMatch | null> {
    // Remove URLs, mentions, emojis
    const cleanText = this.cleanText(text);
    if (!cleanText) return null;

    // Try to split by punctuation or natural breaks
    const segments = this.segmentText(cleanText);
    
    // Try different combinations to find 5-7-5 pattern
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

    // Also try the entire text as continuous segments
    const continuousResult = await this.detectContinuousSenryu(cleanText);
    if (continuousResult) {
      return continuousResult;
    }

    return null;
  }

  /**
   * Try to detect senryu in continuous text by finding optimal split points
   */
  private async detectContinuousSenryu(text: string): Promise<SenryuMatch | null> {
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

  /**
   * Clean text by removing URLs, mentions, emojis, etc.
   */
  private cleanText(text: string): string {
    return text
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/<@!?\d+>/g, '') // Remove Discord mentions
      .replace(/<#\d+>/g, '') // Remove channel mentions
      .replace(/<@&\d+>/g, '') // Remove role mentions
      .replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, '') // Remove custom emojis
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Remove emoji
      .replace(/[\s\u3000]+/g, '') // Remove whitespace
      .trim();
  }

  /**
   * Segment text by punctuation and natural breaks
   */
  private segmentText(text: string): string[] {
    // Split by common Japanese punctuation
    const segments: string[] = [];
    let current = '';

    for (const char of text) {
      if ('、。！？!?\n\r'.includes(char)) {
        if (current) {
          segments.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      segments.push(current);
    }

    // Also add the original text as one segment
    if (segments.length === 0) {
      segments.push(text);
    }

    return segments;
  }
}

import { ParsedTransaction } from '../types';

export class TransactionParserService {
  /**
   * Parse transaction text and extract structured data
   * Handles multiple formats: structured statements, SMS-style, and messy logs
   */
  static parseTransaction(text: string): ParsedTransaction {
    const normalizedText = text.trim();

    // Extract date
    const date = this.extractDate(normalizedText);

    // Extract amount
    const amount = this.extractAmount(normalizedText);

    // Determine transaction type
    const type: 'debit' | 'credit' = this.determineType(normalizedText, amount);

    // Extract description
    const description = this.extractDescription(normalizedText);

    // Extract balance
    const balance = this.extractBalance(normalizedText);

    // Calculate confidence score (0-100)
    const confidence = this.calculateConfidence({
      date,
      amount,
      description,
      balance,
      text: normalizedText,
    });

    return {
      date,
      description,
      amount: Math.abs(amount), // Store absolute value
      type,
      balance,
      confidence,
    };
  }

  /**
   * Extract date from text in various formats:
   * - DD/MM/YYYY
   * - DD MMM YYYY (e.g., "11 Dec 2025")
   * - YYYY-MM-DD
   */
  private static extractDate(text: string): Date {
    // Pattern 1: "Date: 11 Dec 2025" or "11 Dec 2025"
    const datePattern1 = /(?:Date:\s*)?(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i;
    const match1 = text.match(datePattern1);
    if (match1) {
      const day = parseInt(match1[1], 10);
      const monthName = match1[2];
      const year = parseInt(match1[3], 10);
      const monthMap: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };
      const month = monthMap[monthName.toLowerCase()];
      return new Date(year, month, day);
    }

    // Pattern 2: DD/MM/YYYY or MM/DD/YYYY (assuming DD/MM/YYYY for Indian format)
    const datePattern2 = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
    const match2 = text.match(datePattern2);
    if (match2) {
      const day = parseInt(match2[1], 10);
      const month = parseInt(match2[2], 10) - 1; // JS months are 0-indexed
      const year = parseInt(match2[3], 10);
      return new Date(year, month, day);
    }

    // Pattern 3: YYYY-MM-DD
    const datePattern3 = /(\d{4})-(\d{1,2})-(\d{1,2})/;
    const match3 = text.match(datePattern3);
    if (match3) {
      const year = parseInt(match3[1], 10);
      const month = parseInt(match3[2], 10) - 1;
      const day = parseInt(match3[3], 10);
      return new Date(year, month, day);
    }

    // Default to current date if no date found
    return new Date();
  }

  /**
   * Extract amount from text
   * Handles: ₹ symbol, negative numbers, commas, "Dr", "Cr"
   */
  private static extractAmount(text: string): number {
    // Pattern 1: "Amount: -420.00" or "Amount: 420.00"
    const amountPattern1 = /Amount:\s*([+-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/;
    const match1 = text.match(amountPattern1);
    if (match1) {
      return parseFloat(match1[1].replace(/,/g, ''));
    }

    // Pattern 2: "₹1,250.00" or "₹1250.00"
    const amountPattern2 = /₹\s*([+-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/;
    const match2 = text.match(amountPattern2);
    if (match2) {
      return parseFloat(match2[1].replace(/,/g, ''));
    }

    // Pattern 3: Negative number with "debited" or "Dr"
    const debitPattern = /([+-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:debited|Dr)/i;
    const debitMatch = text.match(debitPattern);
    if (debitMatch) {
      const value = parseFloat(debitMatch[1].replace(/,/g, ''));
      return value < 0 ? value : -value; // Ensure negative for debit
    }

    // Pattern 4: Standalone number (last resort)
    const numbers = text.match(/\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g);
    if (numbers && numbers.length > 0) {
      // Usually the first significant number is the amount
      const amountStr = numbers[0].replace(/,/g, '');
      return parseFloat(amountStr);
    }

    return 0;
  }

  /**
   * Determine transaction type (debit or credit)
   */
  private static determineType(text: string, amount: number): 'debit' | 'credit' {
    const lowerText = text.toLowerCase();

    // Explicit keywords
    if (lowerText.includes('debited') || lowerText.includes(' dr ') || lowerText.includes(' dr\n')) {
      return 'debit';
    }
    if (lowerText.includes('credited') || lowerText.includes(' cr ') || lowerText.includes(' cr\n')) {
      return 'credit';
    }

    // Negative amount indicates debit
    if (amount < 0) {
      return 'debit';
    }

    // Default to debit for most transactions
    return 'debit';
  }

  /**
   * Extract description/merchant name
   * Removes transaction IDs, order numbers, and other noise
   */
  private static extractDescription(text: string): string {
    let description = text;

    // Remove transaction IDs (e.g., "txn123", "txn_123")
    description = description.replace(/txn\w*\s*/gi, '');

    // Remove order numbers (e.g., "#403-1234567-8901234")
    description = description.replace(/#\d+[-\d]*/g, '');

    // Remove date patterns
    description = description.replace(/\d{1,2}\/\d{1,2}\/\d{4}/g, '');
    description = description.replace(/\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/gi, '');
    description = description.replace(/\d{4}-\d{1,2}-\d{1,2}/g, '');

    // Remove amount patterns
    description = description.replace(/Amount:\s*[+-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/gi, '');
    description = description.replace(/₹\s*[+-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g, '');
    description = description.replace(/[+-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:debited|credited|Dr|Cr)/gi, '');

    // Remove balance patterns
    description = description.replace(/Balance\s+after\s+transaction:\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?/gi, '');
    description = description.replace(/Available\s+Balance\s*→\s*₹\d{1,3}(?:,\d{3})*(?:\.\d{2})?/gi, '');
    description = description.replace(/Bal\s+\d{1,3}(?:,\d{3})*(?:\.\d{2})?/gi, '');

    // Remove common labels
    description = description.replace(/Date:\s*/gi, '');
    description = description.replace(/Description:\s*/gi, '');
    description = description.replace(/→/g, '');

    // Remove asterisks and clean up
    description = description.replace(/\*/g, ' ');

    // Remove category tags at the end (e.g., "Shopping", "Food")
    description = description.replace(/\s+(Shopping|Food|Travel|Entertainment|Bills|Other)$/i, '');

    // Clean up whitespace
    description = description.replace(/\s+/g, ' ').trim();

    // If description is empty, use a default
    if (!description || description.length === 0) {
      return 'Transaction';
    }

    return description;
  }

  /**
   * Extract balance from text
   */
  private static extractBalance(text: string): number | null {
    // Pattern 1: "Balance after transaction: 18,420.50" or "Balance after transaction: 18420.50"
    // Try with commas first, then without
    const balancePattern1WithCommas = /Balance\s+after\s+transaction:\s*(\d{1,3}(?:,\d{3})+(?:\.\d{2})?)/i;
    const match1a = text.match(balancePattern1WithCommas);
    if (match1a) {
      return parseFloat(match1a[1].replace(/,/g, ''));
    }
    const balancePattern1NoCommas = /Balance\s+after\s+transaction:\s*(\d+(?:\.\d{2})?)/i;
    const match1b = text.match(balancePattern1NoCommas);
    if (match1b) {
      return parseFloat(match1b[1].replace(/,/g, ''));
    }

    // Pattern 2: "Available Balance → ₹17,170.50" or "Available Balance → ₹17170.50"
    const balancePattern2WithCommas = /Available\s+Balance\s*→\s*₹\s*(\d{1,3}(?:,\d{3})+(?:\.\d{2})?)/i;
    const match2a = text.match(balancePattern2WithCommas);
    if (match2a) {
      return parseFloat(match2a[1].replace(/,/g, ''));
    }
    const balancePattern2NoCommas = /Available\s+Balance\s*→\s*₹\s*(\d+(?:\.\d{2})?)/i;
    const match2b = text.match(balancePattern2NoCommas);
    if (match2b) {
      return parseFloat(match2b[1].replace(/,/g, ''));
    }

    // Pattern 3: "Bal 14171.50" or "Bal 14,171.50"
    // Try pattern with commas first, then without
    const balancePattern3WithCommas = /Bal\s+(\d{1,3}(?:,\d{3})+(?:\.\d{2})?)/i;
    const match3a = text.match(balancePattern3WithCommas);
    if (match3a) {
      return parseFloat(match3a[1].replace(/,/g, ''));
    }
    const balancePattern3NoCommas = /Bal\s+(\d+(?:\.\d{2})?)/i;
    const match3b = text.match(balancePattern3NoCommas);
    if (match3b) {
      return parseFloat(match3b[1].replace(/,/g, ''));
    }

    return null;
  }

  /**
   * Calculate confidence score (0-100) based on parsing success
   * According to PRD: Sample 1 should have confidence 100 (all fields found)
   */
  private static calculateConfidence(data: {
    date: Date;
    amount: number;
    description: string;
    balance: number | null;
    text: string;
  }): number {
    // Check if all required fields are present and valid
    const isDateValid = data.date instanceof Date && !isNaN(data.date.getTime());
    const hasValidAmount = Math.abs(data.amount) > 0; // Use absolute value since amount can be negative
    const hasValidDescription = data.description && data.description.length > 3 && data.description !== 'Transaction';
    const hasBalance = data.balance !== null && data.balance > 0;

    // According to PRD: If all 4 fields are found (date, amount, description, balance), confidence should be 100
    if (isDateValid && hasValidAmount && hasValidDescription && hasBalance) {
      return 100;
    }

    // Calculate score based on individual fields
    let score = 0;

    // Date found and valid: +30 points
    if (isDateValid) {
      score += 30;
    }

    // Amount found and valid: +30 points (use absolute value since amount can be negative)
    if (Math.abs(data.amount) > 0) {
      score += 30;
    }

    // Description found and meaningful: +25 points
    if (hasValidDescription) {
      score += 25;
    }

    // Balance found: +15 points
    if (hasBalance) {
      score += 15;
    }

    return Math.min(100, Math.max(0, score));
  }
}


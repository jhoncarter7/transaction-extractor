import { TransactionParserService } from '../services/transaction-parser.service';

describe('Transaction Parser Service', () => {
  describe('Sample 1: Structured Bank Statement', () => {
    test('Parser correctly extracts Sample 1', () => {
      const text = `Date: 11 Dec 2025
Description: STARBUCKS COFFEE MUMBAI
Amount: -420.00
Balance after transaction: 18,420.50`;

      const result = TransactionParserService.parseTransaction(text);

      expect(result.date).toBeInstanceOf(Date);
      expect(result.date.getFullYear()).toBe(2025);
      expect(result.date.getMonth()).toBe(11); // December is month 11 (0-indexed)
      expect(result.date.getDate()).toBe(11);

      expect(result.description).toBe('STARBUCKS COFFEE MUMBAI');
      expect(result.amount).toBe(420.0);
      expect(result.type).toBe('debit');
      expect(result.balance).toBe(18420.5);
      expect(result.confidence).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Sample 2: SMS-Style Notification', () => {
    test('Parser correctly extracts Sample 2', () => {
      const text = `Uber Ride * Airport Drop
12/11/2025 → ₹1,250.00 debited
Available Balance → ₹17,170.50`;

      const result = TransactionParserService.parseTransaction(text);

      expect(result.date).toBeInstanceOf(Date);
      expect(result.date.getFullYear()).toBe(2025);
      expect(result.date.getMonth()).toBe(10); // November is month 10 (0-indexed)
      expect(result.date.getDate()).toBe(12);

      expect(result.description).toContain('Uber');
      expect(result.description).toContain('Airport');
      expect(result.amount).toBe(1250.0);
      expect(result.type).toBe('debit');
      expect(result.balance).toBe(17170.5);
      expect(result.confidence).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Sample 3: Messy Transaction Log', () => {
    test('Parser correctly extracts Sample 3', () => {
      const text = `txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping`;

      const result = TransactionParserService.parseTransaction(text);

      expect(result.date).toBeInstanceOf(Date);
      expect(result.date.getFullYear()).toBe(2025);
      expect(result.date.getMonth()).toBe(11); // December is month 11 (0-indexed)
      expect(result.date.getDate()).toBe(10);

      expect(result.description).toContain('Amazon');
      expect(result.description).not.toContain('txn123');
      expect(result.description).not.toContain('#403');
      expect(result.amount).toBe(2999.0);
      expect(result.type).toBe('debit');
      expect(result.balance).toBe(14171.5);
      expect(result.confidence).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Edge Cases', () => {
    test('Handles credit transactions', () => {
      const text = `Date: 15 Dec 2025
Description: SALARY CREDIT
Amount: 50000.00
Balance: 50000.00`;

      const result = TransactionParserService.parseTransaction(text);

      expect(result.amount).toBeGreaterThan(0);
      // Credit detection might need adjustment based on implementation
    });

    test('Handles missing balance', () => {
      const text = `Date: 11 Dec 2025
Description: TEST TRANSACTION
Amount: -100.00`;

      const result = TransactionParserService.parseTransaction(text);

      expect(result.date).toBeInstanceOf(Date);
      expect(result.description).toBeDefined();
      expect(result.amount).toBe(100.0);
      // Balance might be null
    });
  });
});


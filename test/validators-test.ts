import { GetIssueArgs } from '../src/types.js';
import { 
    validateJQLSearchArgs, 
    validateGetIssueArgs,
    isNonEmptyExpand,
    sanitizeFields,
    sanitizeMaxResults
  } from '../src/validators.js';
  
  describe('Validator Functions', () => {
    describe('validateJQLSearchArgs', () => {
      test('should validate valid JQL search args', () => {
        const validArgs = {
          jql: 'project = TEST',
          maxResults: 10,
          fields: ['summary', 'description'],
          expand: 'changelog'
        };
        
        const result = validateJQLSearchArgs(validArgs);
        
        expect(result).toEqual(validArgs);
      });
      
      test('should throw error when jql is missing', () => {
        const invalidArgs = {
          maxResults: 10
        };
        
        expect(() => validateJQLSearchArgs(invalidArgs)).toThrow('Invalid JQL Search arguments:jql: Required');
      });
    });
    
    describe('validateGetIssueArgs', () => {
      test('should validate valid get issue args', () => {
        const validArgs = {
          issueIdOrKey: 'TEST-1',
          fields: ['summary', 'description'],
          expand: 'changelog'
          
        };
        
        const result:GetIssueArgs = validateGetIssueArgs(validArgs);
        console.log(result);
        
        expect(result).toEqual(validArgs);
      });
      
      test('should throw error when issueIdOrKey is missing', () => {
        const invalidArgs = {
          fields: ['summary']
        };
        
        expect(() => validateGetIssueArgs(invalidArgs)).toThrow('Invalid Get Issue arguments:issueIdOrKey: Required');
      });
    });
    
    describe('isNonEmptyExpand', () => {
      test('should return true for non-empty string', () => {
        expect(isNonEmptyExpand('changelog')).toBe(true);
      });
      
      test('should return false for empty string', () => {
        expect(isNonEmptyExpand('')).toBe(false);
      });
      
      test('should return false for undefined', () => {
        expect(isNonEmptyExpand(undefined)).toBe(false);
      });
    });
    
    describe('sanitizeFields', () => {
      test('should return the array if valid', () => {
        const fields = ['summary', 'description'];
        expect(sanitizeFields(fields)).toEqual(fields);
      });
      
      test('should return empty array if input is undefined', () => {
        expect(sanitizeFields(undefined)).toEqual([]);
      });
      
      test('should filter out non-string values', () => {
        const fields = ['summary', null, 'description', undefined, 123] as (string | number | null | undefined)[];
        expect(sanitizeFields(fields)).toEqual(['summary', 'description', '123']);
      });
    });
    
    describe('sanitizeMaxResults', () => {
      test('should return the number if valid', () => {
        expect(sanitizeMaxResults(10)).toBe(10);
      });
      
      test('should return 50 if input is undefined', () => {
        expect(sanitizeMaxResults(undefined)).toBe(50);
      });
    });
  });
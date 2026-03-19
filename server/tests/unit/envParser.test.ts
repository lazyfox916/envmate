/**
 * Unit Tests for .env File Parser
 * Tests parsing, validation, and edge cases
 */

import {
  parseEnvContent,
  stringifyEnv,
  isValidKey,
  sanitizeKey,
  mergeVariables,
  validateEnvFile,
  EnvVariable,
} from '../../src/utils/envParser';

describe('.env Parser', () => {
  // ===========================================
  // Key Validation Tests
  // ===========================================

  describe('isValidKey', () => {
    it('should accept valid keys', () => {
      expect(isValidKey('DATABASE_URL')).toBe(true);
      expect(isValidKey('API_KEY')).toBe(true);
      expect(isValidKey('myVar')).toBe(true);
      expect(isValidKey('_PRIVATE')).toBe(true);
      expect(isValidKey('VAR_123')).toBe(true);
    });

    it('should reject keys starting with numbers', () => {
      expect(isValidKey('1VAR')).toBe(false);
      expect(isValidKey('123')).toBe(false);
    });

    it('should reject keys with special characters', () => {
      expect(isValidKey('MY-VAR')).toBe(false);
      expect(isValidKey('MY.VAR')).toBe(false);
      expect(isValidKey('MY VAR')).toBe(false);
      expect(isValidKey('VAR@NAME')).toBe(false);
    });

    it('should reject empty key', () => {
      expect(isValidKey('')).toBe(false);
    });
  });

  describe('sanitizeKey', () => {
    it('should uppercase keys', () => {
      expect(sanitizeKey('myvar')).toBe('MYVAR');
    });

    it('should replace invalid characters with underscores', () => {
      expect(sanitizeKey('my-var')).toBe('MY_VAR');
      expect(sanitizeKey('my.var')).toBe('MY_VAR');
      expect(sanitizeKey('my var')).toBe('MY_VAR');
    });

    it('should prefix with underscore if starts with number', () => {
      expect(sanitizeKey('123var')).toBe('_123VAR');
    });
  });

  // ===========================================
  // Basic Parsing Tests
  // ===========================================

  describe('parseEnvContent - basic', () => {
    it('should parse simple key=value pairs', () => {
      const content = 'DATABASE_URL=postgres://localhost/db\nAPI_KEY=secret123';
      const { variables, errors } = parseEnvContent(content);

      expect(errors).toHaveLength(0);
      expect(variables).toHaveLength(2);
      expect(variables[0]).toEqual({ key: 'DATABASE_URL', value: 'postgres://localhost/db' });
      expect(variables[1]).toEqual({ key: 'API_KEY', value: 'secret123' });
    });

    it('should skip empty lines', () => {
      const content = 'VAR1=value1\n\n\nVAR2=value2';
      const { variables, errors } = parseEnvContent(content);

      expect(errors).toHaveLength(0);
      expect(variables).toHaveLength(2);
    });

    it('should skip comment lines', () => {
      const content = '# This is a comment\nVAR1=value1\n# Another comment\nVAR2=value2';
      const { variables, errors } = parseEnvContent(content);

      expect(errors).toHaveLength(0);
      expect(variables).toHaveLength(2);
    });

    it('should handle Windows line endings (CRLF)', () => {
      const content = 'VAR1=value1\r\nVAR2=value2\r\n';
      const { variables, errors } = parseEnvContent(content);

      expect(errors).toHaveLength(0);
      expect(variables).toHaveLength(2);
    });

    it('should handle export statements', () => {
      const content = 'export VAR1=value1\nexport VAR2=value2';
      const { variables, errors } = parseEnvContent(content);

      expect(errors).toHaveLength(0);
      expect(variables).toHaveLength(2);
      expect(variables[0].key).toBe('VAR1');
    });
  });

  // ===========================================
  // Quoted Values Tests
  // ===========================================

  describe('parseEnvContent - quoted values', () => {
    it('should parse double-quoted values', () => {
      const content = 'VAR="hello world"';
      const { variables, errors } = parseEnvContent(content);

      expect(errors).toHaveLength(0);
      expect(variables[0].value).toBe('hello world');
    });

    it('should parse single-quoted values', () => {
      const content = "VAR='hello world'";
      const { variables, errors } = parseEnvContent(content);

      expect(errors).toHaveLength(0);
      expect(variables[0].value).toBe('hello world');
    });

    it('should handle escape sequences in double quotes', () => {
      const content = 'VAR="line1\\nline2\\ttabbed"';
      const { variables, errors } = parseEnvContent(content);

      expect(errors).toHaveLength(0);
      expect(variables[0].value).toBe('line1\nline2\ttabbed');
    });

    it('should preserve literal escape sequences in single quotes', () => {
      const content = "VAR='line1\\nline2'";
      const { variables, errors } = parseEnvContent(content);

      expect(errors).toHaveLength(0);
      expect(variables[0].value).toBe('line1\\nline2');
    });

    it('should handle escaped double quotes', () => {
      const content = 'VAR="hello \\"world\\""';
      const { variables, errors } = parseEnvContent(content);

      expect(errors).toHaveLength(0);
      expect(variables[0].value).toBe('hello "world"');
    });

    it('should handle empty quoted values', () => {
      const content = 'VAR1=""\nVAR2=\'\'';
      const { variables, errors } = parseEnvContent(content);

      expect(errors).toHaveLength(0);
      expect(variables[0].value).toBe('');
      expect(variables[1].value).toBe('');
    });
  });

  // ===========================================
  // Multiline Values Tests
  // ===========================================

  describe('parseEnvContent - multiline', () => {
    it('should parse multiline double-quoted values', () => {
      const content = 'VAR="line1\nline2\nline3"';
      const { variables, errors } = parseEnvContent(content);

      expect(errors).toHaveLength(0);
      expect(variables[0].value).toBe('line1\nline2\nline3');
    });

    it('should parse multiline single-quoted values', () => {
      const content = "VAR='line1\nline2\nline3'";
      const { variables, errors } = parseEnvContent(content);

      expect(errors).toHaveLength(0);
      expect(variables[0].value).toBe('line1\nline2\nline3');
    });

    it('should report error for unclosed multiline', () => {
      const content = 'VAR="unclosed\nmultiline';
      const { variables, errors } = parseEnvContent(content);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Unclosed multiline');
    });
  });

  // ===========================================
  // Special Characters Tests
  // ===========================================

  describe('parseEnvContent - special characters', () => {
    it('should handle values with equals sign', () => {
      const content = 'VAR=key=value=pair';
      const { variables, errors } = parseEnvContent(content);

      expect(errors).toHaveLength(0);
      expect(variables[0].value).toBe('key=value=pair');
    });

    it('should handle inline comments', () => {
      const content = 'VAR=value # this is a comment';
      const { variables, errors } = parseEnvContent(content);

      expect(errors).toHaveLength(0);
      expect(variables[0].value).toBe('value');
    });

    it('should preserve hash in quoted values', () => {
      const content = 'VAR="value#notacomment"';
      const { variables, errors } = parseEnvContent(content);

      expect(errors).toHaveLength(0);
      expect(variables[0].value).toBe('value#notacomment');
    });

    it('should handle URLs with special characters', () => {
      const content = 'DATABASE_URL=postgres://user:pass@localhost:5432/db?sslmode=require';
      const { variables, errors } = parseEnvContent(content);

      expect(errors).toHaveLength(0);
      expect(variables[0].value).toBe('postgres://user:pass@localhost:5432/db?sslmode=require');
    });

    it('should handle whitespace around equals', () => {
      const content = 'VAR = value';
      const { variables, errors } = parseEnvContent(content);

      // Key should be trimmed, value may have leading space
      expect(variables[0]?.key).toBe('VAR');
    });
  });

  // ===========================================
  // Error Handling Tests
  // ===========================================

  describe('parseEnvContent - errors', () => {
    it('should report error for line without equals', () => {
      const content = 'VAR1=value1\nINVALIDLINE\nVAR2=value2';
      const { variables, errors } = parseEnvContent(content);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain("No '=' found");
      expect(variables).toHaveLength(2);
    });

    it('should report error for invalid key', () => {
      const content = '1INVALID=value';
      const { variables, errors } = parseEnvContent(content);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Invalid key');
    });

    it('should continue parsing after errors', () => {
      const content = 'VALID1=value1\n1INVALID=value\nVALID2=value2';
      const { variables, errors } = parseEnvContent(content);

      expect(variables).toHaveLength(2);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // ===========================================
  // stringifyEnv Tests
  // ===========================================

  describe('stringifyEnv', () => {
    it('should convert simple variables to .env format', () => {
      const variables: EnvVariable[] = [
        { key: 'VAR1', value: 'value1' },
        { key: 'VAR2', value: 'value2' },
      ];
      const result = stringifyEnv(variables);

      expect(result).toBe('VAR1=value1\nVAR2=value2');
    });

    it('should quote values with spaces', () => {
      const variables: EnvVariable[] = [
        { key: 'VAR', value: 'hello world' },
      ];
      const result = stringifyEnv(variables);

      expect(result).toBe('VAR="hello world"');
    });

    it('should escape newlines in values', () => {
      const variables: EnvVariable[] = [
        { key: 'VAR', value: 'line1\nline2' },
      ];
      const result = stringifyEnv(variables);

      expect(result).toContain('\\n');
    });

    it('should escape quotes in values', () => {
      const variables: EnvVariable[] = [
        { key: 'VAR', value: 'say "hello"' },
      ];
      const result = stringifyEnv(variables);

      expect(result).toContain('\\"');
    });

    it('should include comments', () => {
      const variables: EnvVariable[] = [
        { key: 'VAR', value: 'value', comment: 'This is a comment' },
      ];
      const result = stringifyEnv(variables);

      expect(result).toContain('# This is a comment');
    });

    it('should handle empty array', () => {
      const result = stringifyEnv([]);
      expect(result).toBe('');
    });
  });

  // ===========================================
  // mergeVariables Tests
  // ===========================================

  describe('mergeVariables', () => {
    it('should merge two variable arrays', () => {
      const existing: EnvVariable[] = [
        { key: 'VAR1', value: 'old1' },
        { key: 'VAR2', value: 'old2' },
      ];
      const incoming: EnvVariable[] = [
        { key: 'VAR2', value: 'new2' },
        { key: 'VAR3', value: 'new3' },
      ];

      const merged = mergeVariables(existing, incoming);

      expect(merged).toHaveLength(3);
      expect(merged.find(v => v.key === 'VAR1')?.value).toBe('old1');
      expect(merged.find(v => v.key === 'VAR2')?.value).toBe('new2');
      expect(merged.find(v => v.key === 'VAR3')?.value).toBe('new3');
    });

    it('should handle empty existing array', () => {
      const merged = mergeVariables([], [{ key: 'VAR', value: 'value' }]);
      expect(merged).toHaveLength(1);
    });

    it('should handle empty incoming array', () => {
      const merged = mergeVariables([{ key: 'VAR', value: 'value' }], []);
      expect(merged).toHaveLength(1);
    });
  });

  // ===========================================
  // validateEnvFile Tests
  // ===========================================

  describe('validateEnvFile', () => {
    it('should accept valid file', () => {
      const result = validateEnvFile('VAR=value');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty file', () => {
      const result = validateEnvFile('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject too large file', () => {
      const largeContent = 'x'.repeat(200 * 1024); // 200KB
      const result = validateEnvFile(largeContent);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('should respect custom size limit', () => {
      const content = 'x'.repeat(100);
      const result = validateEnvFile(content, 50);
      expect(result.valid).toBe(false);
    });
  });

  // ===========================================
  // Round Trip Tests
  // ===========================================

  describe('round trip', () => {
    it('should parse and stringify back to equivalent content', () => {
      const original: EnvVariable[] = [
        { key: 'VAR1', value: 'simple' },
        { key: 'VAR2', value: 'with spaces' },
        { key: 'VAR3', value: 'with "quotes"' },
      ];

      const stringified = stringifyEnv(original);
      const { variables, errors } = parseEnvContent(stringified);

      expect(errors).toHaveLength(0);
      expect(variables).toHaveLength(3);
      expect(variables[0].value).toBe('simple');
      expect(variables[1].value).toBe('with spaces');
      expect(variables[2].value).toBe('with "quotes"');
    });
  });

  // ===========================================
  // Real-world .env File Tests
  // ===========================================

  describe('real-world .env files', () => {
    it('should parse typical Node.js .env file', () => {
      const content = `
# Database Configuration
DATABASE_URL=postgres://user:password@localhost:5432/mydb
DB_HOST=localhost
DB_PORT=5432

# API Keys
API_KEY="sk-1234567890abcdef"
SECRET_KEY='single-quoted-secret'

# Features
ENABLE_FEATURE_X=true
DEBUG=false
`;

      const { variables, errors } = parseEnvContent(content);

      expect(errors).toHaveLength(0);
      expect(variables.length).toBeGreaterThanOrEqual(6);
      expect(variables.find(v => v.key === 'DATABASE_URL')?.value).toContain('postgres://');
      expect(variables.find(v => v.key === 'API_KEY')?.value).toBe('sk-1234567890abcdef');
    });

    it('should parse Docker Compose style .env', () => {
      const content = `
COMPOSE_PROJECT_NAME=myproject
POSTGRES_USER=dbuser
POSTGRES_PASSWORD=dbpass123!@#
POSTGRES_DB=mydb
REDIS_URL=redis://localhost:6379
`;

      const { variables, errors } = parseEnvContent(content);

      expect(errors).toHaveLength(0);
      expect(variables.find(v => v.key === 'POSTGRES_PASSWORD')?.value).toBe('dbpass123!@#');
    });
  });
});

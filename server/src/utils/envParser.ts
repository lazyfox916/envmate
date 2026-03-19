/**
 * .env File Parser
 * Handles parsing of .env file content including edge cases:
 * - Comments (# lines)
 * - Empty lines
 * - Quoted values (single and double quotes)
 * - Multiline values
 * - Special characters
 * - Export statements
 */

export interface EnvVariable {
  key: string;
  value: string;
  comment?: string;
}

export interface ParseResult {
  variables: EnvVariable[];
  errors: string[];
}

/**
 * Validate an environment variable key
 * Keys should only contain alphanumeric characters and underscores
 */
export const isValidKey = (key: string): boolean => {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);
};

/**
 * Sanitize a variable key (remove invalid characters)
 */
export const sanitizeKey = (key: string): string => {
  // Replace invalid characters with underscores
  let sanitized = key.replace(/[^A-Za-z0-9_]/g, '_');
  // Ensure it doesn't start with a number
  if (/^[0-9]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }
  return sanitized.toUpperCase();
};

/**
 * Parse a .env file content string into key-value pairs
 */
export const parseEnvContent = (content: string): ParseResult => {
  const variables: EnvVariable[] = [];
  const errors: string[] = [];
  const lines = content.split(/\r?\n/);
  
  let currentKey: string | null = null;
  let currentValue: string = '';
  let inMultiline = false;
  let multilineQuote: string | null = null;
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber++;
    
    // Handle multiline values
    if (inMultiline) {
      currentValue += '\n' + line;
      
      // Check if multiline ends
      if (multilineQuote && line.trimEnd().endsWith(multilineQuote)) {
        // Remove the closing quote
        currentValue = currentValue.slice(0, -1);
        
        if (currentKey) {
          variables.push({ key: currentKey, value: currentValue });
        }
        
        currentKey = null;
        currentValue = '';
        inMultiline = false;
        multilineQuote = null;
      }
      continue;
    }
    
    // Skip empty lines
    if (line.trim() === '') {
      continue;
    }
    
    // Skip comments
    if (line.trim().startsWith('#')) {
      continue;
    }
    
    // Handle export statements (export KEY=value)
    let processedLine = line;
    if (processedLine.trim().startsWith('export ')) {
      processedLine = processedLine.replace(/^(\s*)export\s+/, '$1');
    }
    
    // Find the first = sign
    const equalIndex = processedLine.indexOf('=');
    if (equalIndex === -1) {
      // Line doesn't have =, skip it
      errors.push(`Line ${lineNumber}: No '=' found`);
      continue;
    }
    
    const key = processedLine.slice(0, equalIndex).trim();
    let value = processedLine.slice(equalIndex + 1);
    
    // Validate key
    if (!isValidKey(key)) {
      errors.push(`Line ${lineNumber}: Invalid key "${key}"`);
      continue;
    }
    
    // Handle quoted values
    const trimmedValue = value.trim();
    const firstChar = trimmedValue.charAt(0);
    const lastChar = trimmedValue.charAt(trimmedValue.length - 1);
    
    if ((firstChar === '"' || firstChar === "'")) {
      if (firstChar === lastChar && trimmedValue.length > 1) {
        // Single-line quoted value
        value = trimmedValue.slice(1, -1);
        // Handle escape sequences for double quotes
        if (firstChar === '"') {
          value = value
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        }
      } else if (trimmedValue.length === 1 || lastChar !== firstChar) {
        // Start of multiline value
        currentKey = key;
        currentValue = trimmedValue.slice(1);
        inMultiline = true;
        multilineQuote = firstChar;
        continue;
      }
    } else {
      // Unquoted value - trim it
      value = trimmedValue;
      
      // Remove inline comments (but be careful with # in values)
      const commentIndex = value.indexOf(' #');
      if (commentIndex !== -1) {
        value = value.slice(0, commentIndex).trim();
      }
    }
    
    variables.push({ key, value });
  }
  
  // Handle unclosed multiline
  if (inMultiline && currentKey) {
    errors.push(`Unclosed multiline value for key "${currentKey}"`);
    // Add what we have anyway
    variables.push({ key: currentKey, value: currentValue });
  }
  
  return { variables, errors };
};

/**
 * Convert variables back to .env format
 */
export const stringifyEnv = (variables: EnvVariable[]): string => {
  const lines: string[] = [];
  
  for (const { key, value, comment } of variables) {
    if (comment) {
      lines.push(`# ${comment}`);
    }
    
    // Determine if value needs quoting
    const needsQuotes = 
      value.includes('\n') ||
      value.includes('\r') ||
      value.includes('"') ||
      value.includes("'") ||
      value.includes(' ') ||
      value.includes('#') ||
      value.includes('$') ||
      value.startsWith(' ') ||
      value.endsWith(' ');
    
    if (needsQuotes) {
      // Use double quotes and escape special characters
      const escaped = value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      lines.push(`${key}="${escaped}"`);
    } else {
      lines.push(`${key}=${value}`);
    }
  }
  
  return lines.join('\n');
};

/**
 * Merge two sets of variables (new values override old ones)
 */
export const mergeVariables = (
  existing: EnvVariable[],
  incoming: EnvVariable[]
): EnvVariable[] => {
  const merged = new Map<string, EnvVariable>();
  
  // Add existing variables
  for (const variable of existing) {
    merged.set(variable.key, variable);
  }
  
  // Override with incoming variables
  for (const variable of incoming) {
    merged.set(variable.key, variable);
  }
  
  return Array.from(merged.values());
};

/**
 * Validate file content size and type
 */
export const validateEnvFile = (
  content: string,
  maxSizeBytes: number = 100 * 1024 // 100KB default
): { valid: boolean; error?: string } => {
  const size = Buffer.byteLength(content, 'utf8');
  
  if (size > maxSizeBytes) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${Math.round(maxSizeBytes / 1024)}KB`,
    };
  }
  
  if (size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }
  
  return { valid: true };
};

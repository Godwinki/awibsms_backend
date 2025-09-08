/**
 * Code Generation Utilities
 * Generate unique codes for branches, accounts, etc.
 */

/**
 * Generate branch code from name
 * @param {string} name - Branch name
 * @param {number} attempt - Attempt number for uniqueness
 * @returns {string} Generated branch code
 */
function generateBranchCode(name, attempt = 0) {
  // Remove special characters and split into words
  const words = name.toUpperCase().replace(/[^A-Z\s]/g, '').split(/\s+/).filter(Boolean);
  let code = '';
  
  if (words.length === 1) {
    // Single word: take first 4 characters
    code = words[0].substring(0, 4);
  } else if (words.length === 2) {
    // Two words: take 2 chars from each
    code = words[0].substring(0, 2) + words[1].substring(0, 2);
  } else {
    // Multiple words: take first char from first 4 words
    code = words.slice(0, 4).map(word => word.charAt(0)).join('');
  }
  
  // Ensure we have at least 2 characters
  if (code.length < 2) {
    code = (code + 'XX').substring(0, 4);
  }
  
  // Ensure exactly 4 characters
  code = code.substring(0, 4);
  
  // Add attempt number for uniqueness
  if (attempt > 0) {
    code = code.substring(0, 3) + attempt.toString();
  }
  
  return code;
}

/**
 * Generate account number
 * @param {string} branchCode - Branch code (4 chars)
 * @param {string} accountType - Account type code (2 chars)
 * @param {number} sequence - Sequential number
 * @returns {string} Generated account number
 */
function generateAccountNumber(branchCode, accountType, sequence) {
  const typeCode = accountType.toUpperCase().substring(0, 2);
  const seqStr = sequence.toString().padStart(6, '0');
  return `${branchCode}${typeCode}${seqStr}`;
}

/**
 * Generate member number
 * @param {string} branchCode - Branch code (4 chars)
 * @param {number} sequence - Sequential number
 * @returns {string} Generated member number
 */
function generateMemberNumber(branchCode, sequence) {
  const seqStr = sequence.toString().padStart(6, '0');
  return `${branchCode}M${seqStr}`;
}

/**
 * Generate transaction reference
 * @param {string} branchCode - Branch code
 * @param {string} transactionType - Transaction type (DEP, WTH, TRF, etc.)
 * @returns {string} Generated transaction reference
 */
function generateTransactionReference(branchCode, transactionType) {
  const timestamp = Date.now().toString().slice(-8);
  const typeCode = transactionType.toUpperCase().substring(0, 3);
  return `${branchCode}${typeCode}${timestamp}`;
}

/**
 * Validate branch code format
 * @param {string} code - Branch code to validate
 * @returns {boolean} Is valid
 */
function validateBranchCode(code) {
  return /^[A-Z0-9]{2,4}$/.test(code);
}

/**
 * Extract region code from branch name
 * @param {string} branchName - Full branch name
 * @returns {string} Region code
 */
function extractRegionCode(branchName) {
  const regionPatterns = {
    'ARUSHA': 'AR',
    'DAR': 'DS',
    'DODOMA': 'DO',
    'MWANZA': 'MW',
    'MBEYA': 'MB',
    'MOROGORO': 'MR',
    'TANGA': 'TG',
    'IRINGA': 'IR',
    'MTWARA': 'MT',
    'TABORA': 'TB'
  };

  const upperName = branchName.toUpperCase();
  
  for (const [region, code] of Object.entries(regionPatterns)) {
    if (upperName.includes(region)) {
      return code;
    }
  }
  
  // Default to first 2 characters of first word
  const firstWord = branchName.split(' ')[0];
  return firstWord.substring(0, 2).toUpperCase();
}

module.exports = {
  generateBranchCode,
  generateAccountNumber,
  generateMemberNumber,
  generateTransactionReference,
  validateBranchCode,
  extractRegionCode
};

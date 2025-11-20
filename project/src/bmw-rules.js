/**
 * BMW MG1/MD1 ECU Lock Detection Logic
 * 
 * BMW introduced MG1/MD1 anti-tuning protection after June 2020.
 * This affects all modern BMW platforms (G-series and late F-series).
 */

// BMW engine codes that use MG1/MD1 ECU protection
const MG1_MD1_ENGINES = {
  // Petrol engines (MG1)
  'B38': { lockDate: '2020-06-01', type: 'MG1', description: '1.5L 3-cylinder turbo' },
  'B46': { lockDate: '2020-06-01', type: 'MG1', description: '2.0L 4-cylinder turbo' },
  'B48': { lockDate: '2020-06-01', type: 'MG1', description: '2.0L 4-cylinder turbo' },
  'B58': { lockDate: '2020-06-01', type: 'MG1', description: '3.0L 6-cylinder turbo' },
  'B58TU': { lockDate: '2020-06-01', type: 'MG1', description: '3.0L 6-cylinder turbo (TU)' },
  'S58': { lockDate: '2020-06-01', type: 'MG1', description: '3.0L 6-cylinder twin-turbo (M)' },
  'S63': { lockDate: '2020-06-01', type: 'MG1', description: '4.4L V8 twin-turbo (M)' },
  'N63': { lockDate: '2020-06-01', type: 'MG1', description: '4.4L V8 twin-turbo' },
  
  // Diesel engines (MD1)
  'B37': { lockDate: '2020-06-01', type: 'MD1', description: '1.5L 3-cylinder diesel' },
  'B47': { lockDate: '2020-06-01', type: 'MD1', description: '2.0L 4-cylinder diesel' },
  'B57': { lockDate: '2020-06-01', type: 'MD1', description: '3.0L 6-cylinder diesel' }
};

// BMW model to engine mapping for inference
const BMW_MODEL_ENGINE_MAP = {
  // 1-Series
  '118i': 'B38',
  '120i': 'B48',
  '118d': 'B47',
  '120d': 'B47',
  
  // 2-Series
  '218i': 'B38',
  '220i': 'B48',
  '218d': 'B47',
  '220d': 'B47',
  'M235i': 'B58',
  'M240i': 'B58',
  
  // 3-Series
  '318i': 'B48',
  '320i': 'B48',
  '330i': 'B48',
  'M340i': 'B58',
  '318d': 'B47',
  '320d': 'B47',
  '330d': 'B57',
  
  // 4-Series
  '420i': 'B48',
  '430i': 'B48',
  '440i': 'B58',
  'M440i': 'B58',
  '420d': 'B47',
  '430d': 'B57',
  
  // 5-Series
  '520i': 'B48',
  '530i': 'B48',
  '540i': 'B58',
  'M550i': 'N63',
  '520d': 'B47',
  '530d': 'B57',
  '540d': 'B57',
  
  // X-Series
  'X1 18i': 'B38',
  'X1 20i': 'B48',
  'X1 18d': 'B47',
  'X1 20d': 'B47',
  'X3 20i': 'B48',
  'X3 30i': 'B48',
  'X3 M40i': 'B58',
  'X3 20d': 'B47',
  'X3 30d': 'B57',
  'X5 40i': 'B58',
  'X5 50i': 'N63',
  'X5 30d': 'B57',
  'X5 40d': 'B57',
  
  // M-Series
  'M2': 'S58',
  'M3': 'S58',
  'M4': 'S58',
  'M5': 'S63',
  'M8': 'S63',
  'X3 M': 'S58',
  'X4 M': 'S58',
  'X5 M': 'S63',
  'X6 M': 'S63'
};

// G-series and late F-series platforms (all affected by MG1/MD1)
const MG1_PLATFORMS = [
  'F40', 'F44', // 1-Series
  'F45', 'F46', // 2-Series Active/Gran Tourer
  'G42', // 2-Series Coupe
  'G20', 'G21', // 3-Series
  'G22', 'G23', 'G26', // 4-Series
  'G30', 'G31', // 5-Series
  'G32', // 6-Series GT
  'G11', 'G12', // 7-Series
  'G14', 'G15', 'G16', // 8-Series
  'F48', 'F49', // X1
  'U06', // X1 (new)
  'F39', // X2
  'G01', // X3
  'G02', // X4
  'G05', // X5
  'G06', // X6
  'G07' // X7
];

/**
 * Extract engine code from DVX engine description
 */
export function extractEngineCode(engineDescription) {
  if (!engineDescription) return null;
  
  // Try to find engine code patterns (B48, B58, S58, etc.)
  const codeMatch = engineDescription.match(/\b([BS]\d{2,3}[A-Z]*\d*)\b/i);
  if (codeMatch) {
    return codeMatch[1].toUpperCase();
  }
  
  return null;
}

/**
 * Infer engine code from model name and power
 */
export function inferEngineFromModel(modelName, engineName, power) {
  if (!modelName || !engineName) return null;
  
  // Combine model and engine name for lookup
  const lookupKey = `${modelName} ${engineName}`.trim();
  
  // Direct lookup
  if (BMW_MODEL_ENGINE_MAP[engineName]) {
    return BMW_MODEL_ENGINE_MAP[engineName];
  }
  
  if (BMW_MODEL_ENGINE_MAP[lookupKey]) {
    return BMW_MODEL_ENGINE_MAP[lookupKey];
  }
  
  return null;
}

/**
 * Check if a BMW platform code is affected by MG1/MD1
 */
export function isMG1Platform(platformCode) {
  if (!platformCode) return false;
  return MG1_PLATFORMS.some(p => platformCode.toUpperCase().includes(p));
}

/**
 * Determine if ECU unlock is required for a BMW engine
 */
export function requiresECUUnlock(engineData) {
  const { engineCode, modelName, engineName, type, year, platformCode } = engineData;
  
  // 1. Try to extract or infer engine code
  let detectedCode = engineCode || extractEngineCode(engineName) || inferEngineFromModel(modelName, engineName);
  
  // 2. If we have an engine code, check the lock table
  if (detectedCode && MG1_MD1_ENGINES[detectedCode]) {
    const lockInfo = MG1_MD1_ENGINES[detectedCode];
    
    // If year is provided, check against lock date
    if (year) {
      const yearNum = parseInt(year);
      return yearNum >= 2020 || (yearNum === 2020 && year >= '2020-06');
    }
    
    // No year data → assume locked (conservative approach)
    return true;
  }
  
  // 3. Check if it's a known MG1 platform
  if (platformCode && isMG1Platform(platformCode)) {
    return true;
  }
  
  // 4. Fallback: if type contains platform info
  if (type) {
    const platformMatch = type.match(/([FG]\d{2})/i);
    if (platformMatch && isMG1Platform(platformMatch[1])) {
      return true;
    }
  }
  
  // 5. Default: assume no lock if we can't determine
  return false;
}

/**
 * Generate ECU unlock object for BMW
 */
export function generateECUUnlockInfo(required = true) {
  if (!required) return null;
  
  return {
    required: true,
    fromDate: '2020-06-01',
    extraCost: null,
    note: 'Alle BMW\'s met productiedatum ná 06/2020 hebben anti-tuning protection (MG1/MD1). ECU unlock vereist voor chiptuning. Neem contact op voor meer informatie.'
  };
}

export default {
  extractEngineCode,
  inferEngineFromModel,
  isMG1Platform,
  requiresECUUnlock,
  generateECUUnlockInfo,
  MG1_MD1_ENGINES,
  BMW_MODEL_ENGINE_MAP
};


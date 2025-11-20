/**
 * Configuration for DVX Scraper
 */

export const CONFIG = {
  // DVX Performance URL
  baseUrl: 'https://dvxperformance.com/dvxsteenokkerzeel/reprogramming',
  
  // Target brands to scrape
  targetBrands: [
    'Audi',
    'BMW',
    'Mercedes',
    'Volkswagen',
    'Porsche',
    'Cupra',
    'Skoda',
    'Seat',
    'Mini',
    'Lamborghini',
    'Bentley',
    'Aston Martin'
  ],
  
  // Puppeteer options
  puppeteer: {
    headless: false, // Set to true for production
    defaultViewport: {
      width: 1920,
      height: 1080
    },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  },
  
  // Wait times (in milliseconds)
  waitTimes: {
    navigation: 3000,
    shortDelay: 500,
    mediumDelay: 1000,
    longDelay: 2000
  },
  
  // Output path
  outputPath: './data/supreme-tuning-master.json',
  
  // Selectors based on HTML analysis
  selectors: {
    brands: '.brands .brand a',
    models: '.models .model a',
    types: '.types .type a',
    engines: '.engines .engine a',
    stageTable: 'table tr',
    engineName: '.engine a div span',
    enginePower: '.engine a div span:nth-child(2)'
  }
};

export default CONFIG;


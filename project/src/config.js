/**
 * Configuration for DVX Scraper
 */

export const CONFIG = {
  // DVX Performance URL
  baseUrl: 'https://dvxperformance.com/dvxsteenokkerzeel/reprogramming',
  
  // Target brands to scrape
  targetBrands: [
    // 'Audi',
    // 'BMW',
    'Mercedes',
    'Volkswagen',
    'Porsche',
    // 'Cupra',
    'Skoda',
    'Seat',
    'Mini',
    'Lamborghini',
    // 'Bentley',
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
    navigation: 1000,
    shortDelay: 1000,
    mediumDelay: 5000,
    longDelay: 2000
  },
  
  // Output path
  outputPath: './data/step_1_data.json',
  
  // Selectors based on HTML analysis
  selectors: {
    // Brand page: .col-md-2.col-xs-6.centered.brand.featured
    brands: '.brand.featured a, .brand a',

    // Model page: .col-md-4.col-xs-12.model.hvr-grow
    models: '.model.hvr-grow a, .model a',

    // Type page: .col-md-4.col-xs-12.type.hvr-grow
    types: '.type.hvr-grow a, .type a',

    // Engine page: .col-lg-6.col-md-12.col-sm-12.engine.hvr-grow
    engines: '.engine.hvr-grow a, .engine a',
    engineType: '.engine-heading',

    // Stage data scraper
    engineName: ".pricing-table .value", // engine name on stage page
    hpBars: "h2 + .improvement + .progress .progress-bar span", // HP bars
    nmBars: "h2 + .improvement + .progress .progress-bar span", // Nm bars
    oldPrice: ".old-price", // old price element
    newPrice: ".new-price", // new price element
  }
};

export default CONFIG;


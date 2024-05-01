import logger from './logger.js';
import puppeteer, { Browser, Page } from 'puppeteer';
import { Cache } from './cache.js';
import { upsertRentals } from '../domains/rental/zillow.rental.resolvers.js';
import type { ZillowRentalInput } from '../domains/rental/zillow.rental.model.js';

const cache = new Cache();

const URL = 'https://www.zillow.com/homes/for_rent/?searchQueryState=%7B%22pagination%22%3A%7B%7D%2C%22isMapVisible%22%3Atrue%2C%22mapBounds%22%3A%7B%22west%22%3A-97.7904768939565%2C%22east%22%3A-97.67615041690571%2C%22south%22%3A30.250872135276055%2C%22north%22%3A30.355358017795723%7D%2C%22mapZoom%22%3A13%2C%22customRegionId%22%3A%22ebd3465b7cX1-CRvfdul3zlzgkr_1487v5%22%2C%22filterState%22%3A%7B%22fr%22%3A%7B%22value%22%3Atrue%7D%2C%22fsba%22%3A%7B%22value%22%3Afalse%7D%2C%22fsbo%22%3A%7B%22value%22%3Afalse%7D%2C%22nc%22%3A%7B%22value%22%3Afalse%7D%2C%22cmsn%22%3A%7B%22value%22%3Afalse%7D%2C%22auc%22%3A%7B%22value%22%3Afalse%7D%2C%22fore%22%3A%7B%22value%22%3Afalse%7D%2C%22ah%22%3A%7B%22value%22%3Atrue%7D%7D%2C%22isListVisible%22%3Atrue%7D';
const COOKIE = 'DoubleClickSession=true; zguid=24|%246c172d45-6752-48d0-bf93-8b2c60065b10; zgsession=1|7cc52ee5-6113-4c28-bec7-8ccff1e462f0; _ga=GA1.2.1048671194.1704202965; zjs_anonymous_id=%226c172d45-6752-48d0-bf93-8b2c60065b10%22; zjs_user_id=null; zg_anonymous_id=%22d2c223c1-2f43-4265-8051-6e010390ead1%22; _gcl_au=1.1.20067546.1704202966; _fbp=fb.1.1704202966212.1487298310; __pdst=9fd31ede5f9d4e6f8372dd204ef4e85a; _pin_unauth=dWlkPVpUTXdZekUxTUdJdFltTTJOeTAwT1RFMUxUazFNVFF0WlRRNE9UazFZekJsT1dNMQ; g_state={"i_p":1706273742245,"i_l":2}; optimizelyEndUserId=oeu1706542313328r0.4990390612719162; pjs-last-visited-page=/research/data/; pjs-pages-visited=1; zgcus_aeut=AEUUT_875e7478-bebb-11ee-bb29-4ef0c20711a1; zgcus_aeuut=AEUUT_875e7478-bebb-11ee-bb29-4ef0c20711a1; JSESSIONID=8E74DDF083AE1E26B01EF3F52250DC10; pxcts=87b8bbe4-bebb-11ee-b839-1708c1e673c4; _pxvid=87b8af64-bebb-11ee-b837-117b665fb3f9; _clck=nn5wjf%7C2%7Cfit%7C0%7C1462; AWSALB=XjIYDa2mJfsVO/Ju1zymDcEF2shiEud8K5P5Hicl8PdWwUQFeqM5WkyZkrvSIR+uWcE37xah34ncNDaSpcYzgazf9sIexNVx6Za6/BWE06vMRzpZ41M4WoGMFnL4; AWSALBCORS=XjIYDa2mJfsVO/Ju1zymDcEF2shiEud8K5P5Hicl8PdWwUQFeqM5WkyZkrvSIR+uWcE37xah34ncNDaSpcYzgazf9sIexNVx6Za6/BWE06vMRzpZ41M4WoGMFnL4; __gads=ID=b17fb94eb9f4f292:T=1704202966:RT=1706545784:S=ALNI_MYY44kzP-7r1mpIiQ67OkkCEIkKpA; __eoi=ID=d53981954f7b7682:T=1706187338:RT=1706545784:S=AA-AfjbOnn76e9PJK78XcGgol543; _uetvid=91e1a3c0356111ed92eff76c73aa9414; _derived_epik=dj0yJnU9VnlpeHVOc0FJR0J5eTk4ems0aG9VVkVnekhkdmVQejImbj1UYjF0SzROeHZ6SWwyVXFyR2VVZWlBJm09ZiZ0PUFBQUFBR1czMG5nJnJtPWYmcnQ9QUFBQUFHVzMwbmcmc3A9Mg; search=6|1709137807182%7Crect%3D30.407559171192375%2C-97.60765752750142%2C30.198587463351977%2C-97.85896978336079%26crid%3Debd3465b7cX1-CRvfdul3zlzgkr_1487v5%26disp%3Dmap%26mdm%3Dauto%26p%3D1%26z%3D1%26listPriceActive%3D1%26fs%3D0%26fr%3D1%26mmm%3D0%26rs%3D0%26ah%3D0%26singlestory%3D0%26housing-connector%3D0%26abo%3D0%26garage%3D0%26pool%3D0%26ac%3D0%26waterfront%3D0%26finished%3D0%26unfinished%3D0%26cityview%3D0%26mountainview%3D0%26parkview%3D0%26waterview%3D0%26hoadata%3D1%26zillow-owned%3D0%263dhome%3D0%26featuredMultiFamilyBuilding%3D0%26student-housing%3D0%26income-restricted-housing%3D0%26military-housing%3D0%26disabled-housing%3D0%26senior-housing%3D0%26excludeNullAvailabilityDates%3D0%26isRoomForRent%3D0%26isEntirePlaceForRent%3D1%26commuteMode%3Ddriving%26commuteTimeOfDay%3Dnow%09%09%09%7B%22isList%22%3Atrue%2C%22isMap%22%3Atrue%7D%09%09%09%09%09; _px3=e562314609235d8647ecb027e826d620d4dc139ff3e51713050d13fec221140e:VCtLxmwXfK/ydScPvhSwxTMl9/5pbv1ziyUYbWb7fmj56Ppnw1gfF0j5uuxBm3IOlcHPXBjQ7b3Xftx6apx/JQ==:1000:UW0JG+k/zhZS+iw4DLMAKmjBp/yOvZ10vdQkO2JM0AZpB6IYm9qkGSFld6QL5vT6VhgY/qLaEorOzQvapFPuAbilWKG9zPvA18qeE4OR7NKLJWY+tt3hH6WBdgUMVQKFlXhOUinmP3n2XH/CnZiT3VOiCqPKNeKSkN5DTcVfnQqHYbdvfdKzvqsh7KVmtm53Y7qns0iqTO8yta5440bA2EGvQ82GT/Bv5IeZWIZa2xY=';
const API_ROOT = 'https://www.zillow.com/async-create-search-page-state';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const PAYLOAD = {
  searchQueryState: {
    isMapVisible: true,
    mapBounds: {
      north: 30.32924698878185,
      south: 30.27700404394706,
      east: -97.7023716922353,
      west: -97.7642556186269
    },
    filterState: {
      isForRent: {
        value: true
      },
      isForSaleByAgent: {
        value: false
      },
      isForSaleByOwner: {
        value: false
      },
      isNewConstruction: {
        value: false
      },
      isComingSoon: {
        value: false
      },
      isAuction: {
        value: false
      },
      isForSaleForeclosure: {
        value: false
      },
      isAllHomes: {
        value: true
      }
    },
    isListVisible: true,
    mapZoom: 14,
    customRegionId: "ebd3465b7cX1-CRvfdul3zlzgkr_1487v5"
  },
  wants: {
    cat1: [
      "listResults",
      "mapResults"
    ]
  },
  requestId: 25,
  isDebugRequest: false
};

export const loadPage = async (): Promise<ZillowRentalInput[]> => {
  const cachedData: ResultsType = await cache.get(URL);
  const _rentals: ZillowRentalInput[] = cachedData?.cat1?.searchResults?.mapResults ?? [];
  if (_rentals?.length) {
    await upsertRentals(_rentals);
    return _rentals;
  }


  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  let responseData = null;

  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({
    'Cookie': COOKIE,
  })

  // Enable request interception
  await page.setRequestInterception(true);

  const waitForApiCall: Promise<ResultsType> = new Promise((resolve, reject) => {
    page.on('request', request => {
      if (request.url().endsWith('async-create-search-page-state')) {
        logger.debug('call detected.');
      }
      request.continue();
    });

    page.on('response', async response => {
      if (response.url().includes('zillow.com')) {
        logger.debug(response.url());
        logger.debug('\n');
      }
      if (response.url().includes('async-create-search-page-state')) {
        responseData = await response.json(); // Get response data
        logger.debug('async-create-search-page-state response', responseData); // Output the data
        resolve(responseData ?? []);
        cache.set(URL, responseData);
      }
    });
  });

  // listen to errors and log them
  page.on('error', err => logger.error('error', err));

  await page.goto(URL); // Go to the website
  const results = await waitForApiCall;
  logger.debug('page', responseData);
  await browser.close();
  return results?.cat1?.searchResults?.mapResults ?? [];
}

// makes a PUT request to 'API_ROOT' with a payload of 'PAYLOAD' using the 'COOKIE' as cookies in the header 
// and USER_AGENT as the User agent, and returns the response as a JSON object 
export async function putZillowResults(): Promise<any> {
  const response = await fetch(API_ROOT, {
    method: 'PUT',
    headers: {
      'Cookie': COOKIE,
      'User-Agent': USER_AGENT,
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://www.zillow.com',
      'Sec-Fetch-Mode': 'cors',
    },
    body: JSON.stringify(PAYLOAD)
  });
  return await response.json();
}

type ResultsType = {
  cat1?: {
    searchResults?: {
      mapResults?: ZillowRentalInput[];
    };
  };
};
import logger from '@utils/logger';
import puppeteer, { Browser, Page } from 'puppeteer';
import { Cache } from '@utils/cache';
import { upsertApartments } from '@domains/apartment/apartment.resolvers';
import type { ApartmentInput } from '@domains/apartment/apartment.model';

const cache = new Cache();
const linkGen = (page: number | undefined | false = false) =>
  `https://www.apartments.com/student-housing/${page ? page + '/' : ''}?bb=uhh93g33qJt18sqe`;
const SCRAPE_TIUMEOUT = 10000;

export async function parseListingHTML(page: Page): Promise<ApartmentInput[]> {
  logger.debug('start parseListingHTML');
  const listingsSelector = await page.waitForSelector('.placardContainer', { timeout: SCRAPE_TIUMEOUT });

  const rawResults =
    (await listingsSelector?.evaluate((container) => {
      const listings = container.querySelectorAll('article.placard');
      return [...listings].reduce((acc, listing) => {
        const parsedRent = (
          listing.querySelector('.property-pricing') ||
          listing.querySelector('.price-range') ||
          listing.querySelector('.price-rents') ||
          listing.querySelector('.property-rents')
        )?.textContent.trim();
        const parsedBedBath =
          listing.querySelector('.property-beds')?.textContent.trim() ||
          listing.querySelector('.bed-range')?.textContent.trim();
        const description = listing.querySelector('.property-amenities')?.textContent.trim() ?? null;
        const url = listing.querySelector('.property-link')?.href ?? null;
        const title = listing.querySelector('.property-title')?.textContent.trim() ?? null;
        const address = `${title}, ${listing.querySelector('.property-address')?.textContent.trim() ?? null}`;

        if (url && title) {
          acc.push({ title, address, description, parsedRent, parsedBedBath, url });
        }
        return acc;
      }, []);
    })) ?? [];

  // NOTE: when in the context of puppetier evaluate(), all kinds of JS shits get fucked. Even loggers dont log in there
  // Like new Date() returns literally {}, so we can only realy do things like DOM reads inside of evaluate()
  const apartmentModels = rawResults.map((l: ApartmentInput) => {
    const hasPriceRange = !!l.parsedRent?.includes(' - ');
    const price = Number(l.parsedRent?.replace(/[^0-9.-]+/g, ''));
    let [beds = 0, baths = 0] =
      l.parsedBedBath?.split(',').map((s: string | undefined) => Number(s?.trim()?.split(' ')[0])) || [];

    if (Number.isNaN(baths)) baths = 0;
    if (Number.isNaN(beds)) beds = 0;

    return { ...l, rent: { date: new Date(), price: Number.isNaN(price) ? null : price }, beds, baths, hasPriceRange };
  });

  return apartmentModels;
}

export async function apartmentsScraper(): Promise<ApartmentInput[]> {
  const cachedData = await cache.get(linkGen());
  if (cachedData) {
    logger.debug('apartmentsScraper: Using cached data');
    return cachedData;
  }

  logger.debug('apartmentsScraper: No cache, running scraper');

  const allListings: ApartmentInput[] = [];
  const browser: Browser = await puppeteer.launch({ headless: 'new', args: ['--disable-http2'] });
  const page: Page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  );
  await page.setExtraHTTPHeaders({
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',

    // NOTE: apartments.com API will fail if it doenst have valid cookies from an actual session
    // This expires REAL quick, so it needs to be updated often. If you see a timeout error, it's probably because of this
    Cookie:
      'cb=1; cul=en-US; ab=%7b%22e%22%3atrue%2c%22r%22%3a%5b%5d%7d; afe=%7b%22e%22%3afalse%7d; fso=%7b%22e%22%3afalse%7d; _gid=GA1.2.2132494544.1706048363; _gat=1; _gcl_au=1.1.1972247788.1706048364; akaalb_www_apartments_com_main=1706051963~op=ap_rent_trends_exclusions:www_apartments_com_RESTON|www_apartments_com:www_apartments_com_LAX|~rv=78~m=www_apartments_com_RESTON:0|www_apartments_com_LAX:0|~os=0847b47fe1c72dfaedb786f1e8b4b630~id=16b1416b076b4a9db67eb10940bcf564; ak_bmsc=167048D8F5F3F9836A03D4A9BDC9BC18~000000000000000000000000000000~YAAQFNcbuGNunBaNAQAAcB1oOBZm7hgHGFVJXR96+oLjNGfBjlw/LllzXrVEmLoetK0mpmTQnWw0G2DRV4oTec+UnsCN+Gd3pPk22DUbIUrxn3a1GPoP3VAsVnfIishgW3ezrr+ka8KT5cJj2D0NJxbNdh+EwikepVXYBQQe8IsSMq1wNPIHYr74nLFgZNo79BCCdiqEEmaJQrx23u1a8gr8pP65o+knLrZGzu/FAJQaqgp8cIvE9A+NeYWOyovwgJ2m9y0dac9UMOpehIHc9SiQVhQUo3785GhvCkqMIgkFGnN2vO0MIDjI/oYJMSXWk9w35Z1qrnV/nFfGYVnw7u13O8x4KsruLtWOYhH433EC/RcwDBXInl6UaKP2ShsbVTgqLOi2uvKQ3buF86heR1SJ3g8+59niVQLkomfc6DtGCPsT/kKmP5dNCOJ+4xIgoyBJ7Ly5spak3MYjM4eug5em25aBk1XYNAu1052XUElBHcPv65rfN9TVjz76VQwWzCNXYrs=; _dpm_ses.c51a=*; _fbp=fb.1.1706048364364.1300125251; _scid=ad965006-e296-4e96-b09f-d3df24bc792b; _tt_enable_cookie=1; _ttp=chvhL18ouwrazRxK8k535Ioo6u8; _pin_unauth=dWlkPU5qaGhPRGMwWm1FdE9UZzVZeTAwTkRNM0xXSXlaalV0TTJRMk0yRTRZV1ExTmpBeQ; _clck=anx2df%7C2%7Cfin%7C0%7C1483; _sctr=1%7C1705989600000; _dpm_id.c51a=4636d1cd-0c21-416b-b625-00f5d1b3fc5c.1706048364.1.1706048378.1706048364.60208848-970b-423c-89cc-3ac08c518a4c; _scid_r=ad965006-e296-4e96-b09f-d3df24bc792b; _uetsid=76b66d60ba3d11eebe9cb16096cb0183; _uetvid=76b6a0c0ba3d11eeab18973ec310ce5a; _ga=GA1.1.383924439.1706048363; cto_bundle=Cgw7h19YTTN0MEtVWHVBZ21JNUswZHlUMzVFWHB2cEVWNyUyRm1aeVFuamhPRXc0a0tqdUc0a0VwaGlrUzRnMGZmdE5CZERUdGVQJTJGQUFGb04wSEJqSFc2ZlZ2UmhDWkMzRUlhJTJGRElOYyUyRkM0Y2pkREw0Y0trMDdKcmFIRGtNMUh5SlFCUEZJWEVaZmQxd3YwcDJQd25VU1VRMVlzcFZFZk02M0kyMzRTZTM2TXd2SWZ3UjlUb2FZbkYwdEFhUEtIdmhYR3IySg; RT="z=1&dm=apartments.com&si=471f209e-5b3b-4c37-b1ef-af26afecc062&ss=lrqx57qf&sl=2&tt=6f1&bcn=%2F%2F17de4c16.akstat.io%2F&ld=ewn"; sr=%7B%22Width%22%3A715%2C%22Height%22%3A755%2C%22PixelRatio%22%3A2%7D; uat=%7B%22VisitorId%22%3A%22a81dce48-df4e-4a4d-a325-7116a502623e%22%2C%22VisitId%22%3A%221304517e-5e56-4d42-9918-c44330c13d9a%22%2C%22LastActivityDate%22%3A%222024-01-23T17%3A19%3A37.02859-05%3A00%22%2C%22LastFrontDoor%22%3A%22APTS%22%2C%22LastSearchId%22%3A%22C30291C0-677F-446E-A188-717E730F7E05%22%7D; lsc=%7B%22Map%22%3A%7B%22BoundingBox%22%3A%7B%22LowerRight%22%3A%7B%22Latitude%22%3A30.21392%2C%22Longitude%22%3A-97.67416%7D%2C%22UpperLeft%22%3A%7B%22Latitude%22%3A30.40006%2C%22Longitude%22%3A-97.81045%7D%7D%2C%22CountryCode%22%3A%22US%22%7D%2C%22Geography%22%3A%7B%22GeographyType%22%3A7%2C%22Address%22%3A%7B%22CountryCode%22%3A%22US%22%7D%2C%22Location%22%3A%7B%22Latitude%22%3A30.303%2C%22Longitude%22%3A-97.738%7D%7D%2C%22Listing%22%3A%7B%22Specialties%22%3A4%7D%2C%22Paging%22%3A%7B%7D%2C%22ResultSeed%22%3A750994%2C%22Options%22%3A0%2C%22CountryAbbreviation%22%3A%22US%22%7D; s=; bm_sv=062909A2A062DD21173D8845750620D6~YAAQLdcbuAblNDONAQAAFoBoOBYZXrTH09eOg1QNH7baVUpd5NFtFhPl84x8Rh/XOy/DW/LuOkil2aH4V3VL7/X+6mkOG7VvvM5A5JQpy9+/oo4apbz+gMAtMXNOehO6eV0GP7KbKwQvT05p4Qcuzamd9/1/bpHUGQWz+cKvv5BSERQFxBR+Lf4avwSgpky6gk5gLkFxknvpeshxB9D/9s+wqK9QMO8Gct9zMMBWSFlQHjauQO+uTeztu+GeBYLgQ2yGBQ==~1; _dd_s=rum=0&expire=1706049277664; _ga_X3LTX2PVM9=GS1.1.1706048363.1.1.1706048389.34.0.0; _clsk=pd1x6l%7C1706048389892%7C3%7C0%7Cn.clarity.ms%2Fcollect',
  });
  const totalPages = 18; // await fetchTotalPages(page);
  logger.debug('--- totalPages ---', totalPages);

  for (let i = 1; i <= totalPages; i++) {
    try {
      const listings = await fetchPageData(page, i);
      await upsertApartments(listings);
      allListings.push(...listings);
    } catch (error) {
      logger.error(`Error fetching page ${i}:`, error);
    }
  }

  await browser.close();
  await cache.set(linkGen(), allListings);
  return allListings;
}

async function fetchTotalPages(page: Page): Promise<number> {
  logger.debug('fetching total pages');
  await page.goto(linkGen(), { timeout: SCRAPE_TIUMEOUT });
  const el = await page.waitForSelector('.searchResults .pageRange');
  const totalPagesText = await el?.evaluate((container) => {
    return container.querySelector('.searchResults .pageRange')?.textContent.trim();
  });
  logger.debug('totalPagesText', totalPagesText);
  return parseInt(totalPagesText?.split(' of ')[1] || '1', 10);
}

async function fetchPageData(page: Page, pageNumber: number): Promise<ApartmentInput[]> {
  const url = linkGen(pageNumber);
  const cachedData = await cache.get(url);
  if (cachedData) {
    return cachedData;
  }

  logger.debug(`Fetching page ${pageNumber}`);
  await page.goto(url, { timeout: SCRAPE_TIUMEOUT });
  logger.debug(`Page fetched ${pageNumber}`);
  const listings = await parseListingHTML(page);
  logger.debug('listings processed', listings.at(1));
  await cache.set(url, listings);
  return listings;
}

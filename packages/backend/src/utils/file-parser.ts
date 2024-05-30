import logger from '@utils/logger';
import fs from 'fs';
import { parse } from 'csv-parse';

const isNumberString = (value: string): boolean => {
  return !isNaN(value as any) && !isNaN(parseFloat(value));
};

async function parseCsvFile(fileContent: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    logger.debug('parseCsvFile starting');
    parse(fileContent, { columns: true }, (error, results) => {
      if (error) {
        reject(error);
        logger.debug('parseCsvFile error', error);
      } else {
        resolve(postProcessCsvData(results));
        logger.debug('parseCsvFile complete');
      }
    });
  });
}

function postProcessCsvData(data: DataObject[]): DataObject[] {
  return data.map((obj) => {
    const newObj: DataObject = {};
    Object.keys(obj).forEach((key) => {
      if (key !== '') {
        const value = obj[key];
        let parsedValue: string | number | boolean | null = value;

        // Check if the value is a string
        if (typeof value === 'string') {
          // Convert numeric strings to numbers
          if (isNumberString(value)) {
            parsedValue = parseFloat(value);
          }
          // Convert 'true'/'false' strings to booleans
          else if (value === 'true' || value === 'false') {
            parsedValue = value === 'true';
          }
          // Convert empty strings to null
          else if (value === '') {
            parsedValue = null;
          }
        }

        const camelCaseKey = key
          .split(' ')
          .map((word, index) => {
            if (index === 0) {
              return word.toLowerCase();
            } else {
              return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
          })
          .join('');
        newObj[camelCaseKey] = parsedValue;
      }
    });
    return newObj;
  });
}

const fileParser = async (filePath: string, ext: string): Promise<unknown> => {
  logger.debug('reading file contents');
  const fileContents = fs.readFileSync(filePath, 'utf-8');
  logger.debug('reading file contents complete');

  // parseCsvFile
  switch (ext) {
    case '.json':
      try {
        return JSON.parse(fileContents);
      } catch (error) {
        throw new Error('Invalid JSON format');
      }
      break;
    case '.csv':
      try {
        const result = parseCsvFile(fileContents).catch((error) => {
          console.log('parseCsvFile error');
          return error;
        });
        fs.promises.writeFile(filePath.replace('.csv', '.json'), JSON.stringify(result));
        return result;
      } catch (error) {
        throw new Error('Invalid CSV format');
      }
      break;
    case '.md':
      // TODO add markdown validation
      throw new Error('.md files arent supported yet');
    default:
      throw new Error(`${ext} is not a supported file type`);
  }
};

type DataObject = {
  [key: string]: string | number | boolean | null;
};

export default fileParser;

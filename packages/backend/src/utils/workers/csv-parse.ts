import { parse } from 'csv-parse';
import fs from 'fs';
import os from 'os';
import path from 'path';

process.on('message', async (filePath: string) => {
  try {
    // Create a unique filename for the temporary file using a timestamp and random number
    const tempFileName = `temp-${Date.now()}-${Math.floor(Math.random() * 10000)}.json`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    const writableStream = fs.createWriteStream(tempFilePath);
    let isFirstRecord = true;

    writableStream.write('['); // Start of JSON array

    const parser = fs.createReadStream(filePath)
      .pipe(parse({ columns: true }))
      .on('data', (data) => {
        if (!isFirstRecord) {
          writableStream.write(',');
        } else {
          isFirstRecord = false;
        }
        writableStream.write(JSON.stringify(data));
      });

    parser.on('end', () => {
      writableStream.write(']'); // End of JSON array
      writableStream.end();
    });

    writableStream.on('finish', () => {
      process.send!({ tempFilePath });
      process.exit(0);
    });
  } catch (error) {
    process.send!({ error: (error as Error).message });
    process.exit(1);
  }
});

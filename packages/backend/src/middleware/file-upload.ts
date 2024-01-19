import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import fileParser from '../utils/file-parser.js';
import { createIndex, addData } from '../utils/elastic-search.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDirectory = determineUploadDirectory(req as UploadRequest);
    fs.mkdirSync(uploadDirectory, { recursive: true });
    cb(null, uploadDirectory);
  },
  filename: async (req, file, cb) => {
    const fileName = await createUniqueFilename(req.body, file);
    logger.debug('fileName', fileName);


    return cb(null, fileName);
  }
});


const upload = multer({
  storage,
  fileFilter: (req: UploadRequest, file, cb) => {
    const filetypes = /csv|json|md/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      req.fileValidationError = `${file.mimetype} is not supported. Only CSV and JSON files are supported`;
      return cb(null, false);
    }
  },
});

const createAndInsertData = async (req: UploadRequest, data: unknown) => {
  if (Array.isArray(data)) {
    // inset into elastic search
    const elasticsearchIndex = `dataset-${req.body.id}-${req.file.originalname.split('.')[0]}`.toLowerCase();
    logger.debug(`${elasticsearchIndex} | elasticsearch creating index`);
    const esResult = await createIndex(elasticsearchIndex);
    // @ts-ignore
    const idx = esResult?.[elasticsearchIndex];
    console.debug('ES record created', idx.settings.index.uuid);
    req.file.index = elasticsearchIndex;

    if (idx.settings.index.uuid) {
      req.file.esId = idx.settings.index.uuid;
      logger.debug('req.file.esId', req.file.esId)
    } else {
      logger.error('createAndInsertData - elasticsearch didnt return an index', esResult)
    }
    logger.debug(`${elasticsearchIndex} | elasticsearch index created`);
    logger.debug(`${elasticsearchIndex} | elasticsearch inserting data`);
    addData(elasticsearchIndex, data); // it's OK for this to be async
    logger.debug(`${elasticsearchIndex} | elasticsearch data added`);
  } else {
    logger.error('createAndInsertData - incoming data is not an array of records', data);
  }
}

export const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  logger.debug('uploadMiddleware');

  // Perform the necessary type check for UploadRequest
  const uploadReq = req as UploadRequest; // Safely cast to UploadRequest

  upload.single('file')(uploadReq, res, async (err: any) => {
    // ...rest of your middleware logic...

    if (!uploadReq.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const data = await fileParser(uploadReq.file.path, path.extname(uploadReq.file.originalname));
      logger.debug('file parsed, inserting into elasticsearch');
      await createAndInsertData(uploadReq, data);
      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'File validation error';
      return res.status(422).json({ error: errorMessage });
    }
  });

};

export const uploadHandler = async (req: Request, res: Response): Promise<void> => {
  logger.debug('uploadHandler');
  const uploadReq = req as UploadRequest; // Safely cast to UploadRequest
  const file = uploadReq.file;

  try {
    const files = [file];
    res.status(200).json({ files });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
};


export type UploadResponse = { message: string; filename?: void | string, error?: void | string }

interface ExtendedMulterFile extends Express.Multer.File {
  esId?: string;
  index?: string;
}

export interface FileUpload {
  type: 'avatar' | 'dataset';
  id?: string;
  file: ExtendedMulterFile;
}

interface UploadRequest extends Request {
  body: FileUpload;
  file: ExtendedMulterFile;
  fileValidationError?: string;
}

const determineUploadDirectory = (req: UploadRequest): string => {
  let uploadDirectory = path.join(__dirname, '../uploads');

  switch (req.body.type) {
    case 'avatar':
      return path.join(uploadDirectory, 'avatars');
    case 'dataset':
      if (req.body.id) {
        return path.join(uploadDirectory, 'datasets', req.body.id);
      } else {
        req.fileValidationError = 'Dataset ID is required for dataset files';
      }
      break;
    default:
      req.fileValidationError = 'Unsupported file type';
  }

  return uploadDirectory;
};

const createUniqueFilename = async (body: UploadRequest['body'], file: ExtendedMulterFile): Promise<string> => {
  const filename = file.originalname;
  console.log('createUniqueFilename filename', filename, body.type)
  // In the future if we need every uploaded file to be uniqued, then 
  // the blow will do that, but right now I actualyl think we want to 
  // keep the original filename/ overwrite the file if it already exists
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  // return file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
  return `${uniqueSuffix}-${filename}`;
};


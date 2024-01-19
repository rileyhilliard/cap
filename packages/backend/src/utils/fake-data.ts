// import { faker } from '@faker-js/faker';
// import { Dataset, DatasetModel, Quality, Reviews, ValidationStatus, UpdateFrequency } from '../domains/dataset/dataset.model.js';
// import { Types } from 'mongoose';
// import { User, UserModel } from '../domains/user/user.model.js';
// import { AccountStatus } from '../domains/user/user.base.model.js';
// import { Organization } from '../domains/organization/organization.model.js';
// import logger from './logger.js';

// function generateObjectId(): Types.ObjectId {
//   return new Types.ObjectId();
// }

// interface DatasetWithVirtuals extends Omit<Dataset, 'path'> {
//   path?: string | null;
//   // any other virtual properties you might have
// }

// type Overrides = Partial<User | DatasetWithVirtuals>;

// export default class FakeData {
//   private static instance: FakeData;
//   private cache: Map<string, any>;

//   constructor() {
//     this.cache = new Map();
//   }

//   user(overrides: Partial<User> = {}): User {
//     return new UserModel({
//       id: generateObjectId(),
//       username: faker.internet.userName(),
//       email: faker.internet.email(),
//       password: faker.internet.password(),
//       profileImage: faker.image.avatar(),
//       dateOfBirth: faker.date.past(),
//       name: {
//         first: faker.person.firstName(),
//         last: faker.person.lastName()
//       },
//       bio: faker.lorem.paragraph(),
//       status: AccountStatus.ACTIVE,
//       createdAt: faker.date.past(),
//       updatedAt: faker.date.past(),
//       verificationToken: faker.git.commitSha(),
//       isVerified: true,
//       slug: faker.lorem.slug(),
//       watchedDatasets: this.generate(generateObjectId, faker.number.int({ min: 1, max: 5 })),
//       starredDatasets: this.generate(generateObjectId, faker.number.int({ min: 1, max: 5 })),
//       administratedDatasets: this.generate(generateObjectId, faker.number.int({ min: 0, max: 5 })),
//       ownedDatasets: this.generate(generateObjectId, faker.number.int({ min: 0, max: 5 })),
//       ...overrides
//     });
//   }

//   orginization(): Organization {
//     return {
//       id: generateObjectId(),
//       name: faker.company.name(),
//       slug: faker.lorem.slug(),
//       website: faker.internet.url(),
//       description: faker.company.catchPhrase(),
//       administrators: this.generate(generateObjectId, faker.number.int({ min: 1, max: 4 })),
//       visibility: faker.helpers.arrayElement(['public', 'private']),
//       createdAt: faker.date.past(),
//       datasets: this.generate(generateObjectId, faker.number.int({ min: 0, max: 10 })),
//     };
//   }

//   generate<T>(method: () => T, count = 2) {
//     const { name: key } = method;
//     const cache = this.cache.get(key);
//     if (cache && cache?.length >= count) {
//       // logger.info({
//       //   message: `generate - cache hit`,
//       //   key,
//       // });
//       return cache.slice(0, count);
//     }

//     const existingItems = cache ? cache?.length : 0;
//     if (!!existingItems) {
//       // logger.info({
//       //   message: `generate - cache miss`,
//       //   key,
//       // });
//     } else {
//       // logger.info({
//       //   message: `generate - cache hit`,
//       //   existingItems: existingItems?.length,
//       //   cache: cache?.length,
//       //   requestedCount: count,
//       // });
//     }
//     const result = Array.from({ length: count - existingItems }, () => method());

//     this.cache.set(key, [...(cache ?? []), ...result]);
//     return result;
//   }

//   dataset(overrides: Overrides = {}): Dataset {
//     const ownerId = generateObjectId();
//     // Base properties
//     return new DatasetModel({
//       id: generateObjectId(),
//       ownerId,
//       // @ts-ignore
//       owner: this.user({ id: ownerId }),
//       title: faker.lorem.words(2).split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
//       contributors: [ownerId],
//       administrators: [ownerId],
//       license: faker.lorem.paragraph(),
//       sources: [faker.internet.url()],
//       tags: Array.from({ length: faker.number.int({ min: 2, max: 15 }) }, () => faker.word.adverb()),
//       quality: {
//         reliabilityScore: faker.number.int({ min: 0, max: 100 }),
//         completenessScore: faker.number.int({ min: 0, max: 100 }),
//         licenseScore: faker.number.int({ min: 0, max: 100 })
//       },
//       updateFrequency: faker.helpers.arrayElement([UpdateFrequency.DAILY, UpdateFrequency.WEEKLY, UpdateFrequency.MONTHLY, UpdateFrequency.YEARLY]),
//       nextUpdate: faker.date.future(),
//       description: faker.lorem.paragraph(),
//       starCount: faker.number.int({ min: 0, max: 100000 }),
//       starrers: [],// this.generate(generateObjectId, faker.number.int({ min: 0, max: 100 })),
//       watchers: [], // this.generate(generateObjectId, faker.number.int({ min: 0, max: 25 })),
//       watchersCount: faker.number.int({ min: 0, max: 10000 }),
//       issues: faker.number.int({ min: 0, max: 100 }),
//       createdAt: faker.date.past(),
//       updatedAt: faker.date.past(),
//       lastModifiedDate: faker.date.recent(),
//       isPublic: faker.datatype.boolean(),
//       accessControlList: [], // this.generate(generateObjectId, faker.number.int({ min: 0, max: 5 })),
//       downloadCount: faker.number.int({ min: 0, max: 1000000 }),
//       isArchived: faker.datatype.boolean(),
//       slug: faker.lorem.slug(),
//       origin: {
//         title: faker.lorem.sentence(),
//         url: faker.internet.url()
//       },
//       usageNotes: faker.lorem.paragraph(),
//       restrictions: faker.lorem.paragraph(),
//       // TODO: resolve the cyclical dependency issue in dataset.model
//       // relatedDatasets: Array.from({ length: faker.number.int({ min: 0, max: 4 }) }, () => new Types.ObjectId()),
//       validationStatus: faker.helpers.arrayElement([
//         ValidationStatus.PENDING,
//         ValidationStatus.VALIDATED,
//         ValidationStatus.REJECTED,
//         ValidationStatus.UNDER_REVIEW
//       ]),
//       reviews: {
//         count: faker.number.int({ min: 0, max: 10000 }),
//         average: faker.number.float({ min: 0, max: 5 }),
//         users: this.generate(generateObjectId, faker.number.int({ min: 0, max: 25 }))
//       },
//       ...overrides
//     });
//   }

//   public static create(): FakeData {
//     if (!FakeData.instance) {
//       FakeData.instance = new FakeData();
//     }
//     return FakeData.instance;
//   }
// }
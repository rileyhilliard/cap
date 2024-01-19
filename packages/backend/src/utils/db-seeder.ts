// import { User, UserModel } from '../domains/user/user.model.js';
// import FakeData from './fake-data.js';
// import { Dataset, DatasetModel } from '../domains/dataset/dataset.model.js';
// import { faker } from '@faker-js/faker';

// const SEED_COUNT = 100;  // Number of mock users to create

// export async function seedUsers(): Promise<void> {
//   try {
//     // Fetch all datasets from the database
//     const datasets = await DatasetModel.find().exec();

//     // Use the FakeData utility to create mock users
//     const fakeData = FakeData.create();


//     // TODO: only generate a dataset when the user is setting one up (NOTE: a data set probably does need a user for things like url contruction)
//     const datasetsToInsert: Dataset[] = datasets?.length ? datasets : [];

//     const usersToInsert = Array.from({ length: 1000 }, () => {
//       const user = fakeData.user();
//       const ownedDatasets = Array.from({ length: faker.number.int({ min: 1, max: 2 }) }, () => {
//         const dataset = fakeData.dataset({
//           // @ts-ignore
//           owner: user,
//           ownerId: user.id
//         });
//         datasetsToInsert.push(dataset);
//         return dataset.id;
//       });
//       const starredDatasets = Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => {
//         const dataset = faker.helpers.arrayElement([...datasets, ...datasetsToInsert]);
//         if (!dataset?.starrers?.includes(user.id)) {
//           dataset?.starrers?.push(user.id);
//         }
//         return dataset.id;
//       });
//       const watchedDatasets = Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => {
//         const dataset = faker.helpers.arrayElement([...datasets, ...datasetsToInsert]);
//         if (!dataset?.watchers?.includes(user.id)) {
//           dataset?.watchers?.push(user.id);
//         }
//         return dataset.id;
//       });
//       user.starredDatasets = [...new Set(starredDatasets)];
//       user.ownedDatasets = [...new Set(ownedDatasets)];
//       user.watchedDatasets = [...new Set(watchedDatasets)];
//       return user;
//     });

//     // Insert mock users into the database using the User Mongoose model
//     if (datasetsToInsert.length) {
//       await DatasetModel.insertMany(datasetsToInsert);
//       console.log(`Inserted ${datasetsToInsert.length} datasets into the database.`);
//     }
//     // console.log(usersToInsert)
//     await UserModel.insertMany(usersToInsert);

//     console.log(`Inserted ${SEED_COUNT} mock users into the database.`);
//   } catch (error) {
//     console.error('Error seeding the database:', error);
//   }
// }


// export async function setup(): Promise<void> {
//   try {
//     // Next, seed the users and link them to the datasets they own
//     await seedUsers();

//     console.log('Database seeding completed successfully.');
//   } catch (error) {
//     console.error('Error during database seeding:', error);
//   }
// }

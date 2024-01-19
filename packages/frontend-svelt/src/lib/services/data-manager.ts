// src/lib/DataManager.ts
import type { User, Dataset, UpdateDatasetInput, CreateDatasetInput } from '@backend/types';
import { gql } from '@urql/svelte';
import type { TypedDocumentNode } from '@urql/svelte';
import { client } from '../../utils/urqlClient';
import type { Session } from '@supabase/supabase-js';

// Define the result and variables type for the GraphQL query
interface UsersQueryResult {
  user: User;
}

interface UsersQueryVariables {
  id: string;
}

const USER_QUERY: TypedDocumentNode<UsersQueryResult, UsersQueryVariables> = gql`
  query Users($id: String) {
    user(id: $id) {
      id
      username
      createdAt
      updatedAt
      email, 
      watchedDatasets,
      ownedDatasets,
      starredDatasets,
    }
  }
`;

interface DatasetsQueryVariables {
  ids: string[];
}

interface DatasetsQueryResult {
  datasets: Dataset[];
}

const DATASETS_QUERY: TypedDocumentNode<DatasetsQueryResult, DatasetsQueryVariables> = gql`
  query Datasets($ids: [ID!]) {
    datasets(ids: $ids) {
      id,
      downloadCount
      description
      isPublic
      issues
      license
      nextUpdate
      path
      slug
      sources
      starCount
      tags
      watchersCount
      quality {
        completenessScore
        reliabilityScore
      }
      createdAt
      updatedAt
      usageNotes
      contributors
      watchers
      title
      starrers
      origin {
        title
        url
      }
      accessControlList
      administrators
      restrictions
      reviews {
        average
        count
        users
      }
      validationStatus
      updateFrequency
      owner {
        id
        email
        username
      }
    }
  }
`;

interface DatasetQueryVariables {
  slug: string;
}

interface DatasetQueryResult {
  dataset: Dataset;
}

const DATASET_QUERY: TypedDocumentNode<DatasetQueryResult, DatasetQueryVariables> = gql`
  query Dataset($slug: String!) {
    dataset(slug: $slug) {
      id
      createdAt
      updatedAt
      owner {
        id
        username
        name {
          first
          last
        }
        supaBaseId
      }
      title
      contributors
      files {
        path
        version
        originalname
        name
        mimetype
        size
        downloadCount
      }
      license
      sources
      tags
      updateFrequency
      nextUpdate
      description
      starCount
      watchersCount
      issues
      lastModifiedDate
      isPublic
      accessControlList
      downloadCount
      isArchived
      usageNotes
      slug
      restrictions
      validationStatus
      reviews {
        average
        count
        users
      }
      watchers
      starrers
      administrators
      path
    }
  }
`;

// Define the UpdateDatasetResult type
interface UpdateDatasetResult {
  updateDataset: Dataset | null;
}

const UPDATE_DATASET_MUTATION: TypedDocumentNode<UpdateDatasetResult, { dataset: UpdateDatasetInput }> = gql`
  mutation UpdateDataset($dataset: UpdateDatasetInput!) {
    updateDataset(dataset: $dataset) {
      id
      files {
        index
        esId
        path
        version
        originalname
        name
        mimetype
        size
        downloadCount
      }
    }
  }
`;

interface CreateDatasetResult {
  createDataset: {
    slug: string;
    title: string;
    path: string;
  };
}

const CREATE_DATASET_MUTATION: TypedDocumentNode<CreateDatasetResult, { dataset: CreateDatasetInput }> = gql`
  mutation CreateDataset($dataset: CreateDatasetInput!) {
    createDataset(dataset: $dataset) {
      slug
      title
      path
    }
  }
`;



class DataManager {
  // Method to fetch user data
  public async getUser(session: Session | null): Promise<User | null> {
    if (!session?.user?.id) {
      // user's not logged in
      return Promise.resolve(null);
    }
    const result = await client.query(USER_QUERY, { id: session.user.id }).toPromise();
    if (result.error) {
      console.error('Error fetching user data:', result.error);
      throw result.error;
    }

    return result.data?.user ?? null;
  }

  public async getDatasets(ids: string[]): Promise<Dataset[] | null> {
    const result = await client.query(DATASETS_QUERY, { ids }).toPromise();
    if (result.error) {
      console.error('Error fetching datasets data:', result.error);
      throw result.error;
    }
    console.log('getDatasets', result);
    return result.data?.datasets ?? null;
  }

  public async getDataset(slug: string): Promise<Dataset | null> {
    const result = await client.query(DATASET_QUERY, { slug }).toPromise();
    if (result.error) {
      console.error('Error fetching dataset data:', result.error);
      throw result.error;
    }

    return result.data?.dataset ?? null;
  }

  public async createDataset(dataset: CreateDatasetInput): Promise<CreateDatasetResult['createDataset'] | null> {
    const result = await client.mutation(CREATE_DATASET_MUTATION, { dataset }).toPromise();
    if (result.error) {
      console.error('Error creating dataset:', result.error);
      throw result.error;
    }

    return result.data?.createDataset ?? null;
  }

  public async updateDataset(dataset: UpdateDatasetInput): Promise<UpdateDatasetResult['updateDataset'] | null> {
    console.log('updateDataset', { dataset })
    const result = await client.mutation(UPDATE_DATASET_MUTATION, { dataset }).toPromise();
    if (result.error) {
      console.error('Error updating dataset:', result.error);
      throw result.error;
    }

    return result.data?.updateDataset ?? null;
  }
}

export default new DataManager();

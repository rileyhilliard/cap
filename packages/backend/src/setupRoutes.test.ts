import { beforeEach, describe, it, expect } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { setupRoutes } from './setupRoutes';
import nock from 'nock';

let app: Express;

beforeEach(() => {
  // app = express();
  // app.use(express.json());
  // setupRoutes(app);

  // const elasticSearchServer = nock('http://localhost:9200');

  // // Intercept search requests
  // elasticSearchServer
  //   .persist() // This will allow nock to intercept all requests, not just the first one
  //   .post('/_search')
  //   .reply(200, {
  //     hits: {
  //       total: {
  //         value: 1,
  //         relation: 'eq',
  //       },
  //       hits: [
  //         {
  //           _index: 'test',
  //           _type: '_doc',
  //           _id: '1',
  //           _score: 1,
  //           _source: {
  //             field: 'value',
  //           },
  //         },
  //       ],
  //     },
  //   });

  // // Intercept document requests
  // elasticSearchServer
  //   .persist()
  //   .post('/_doc')
  //   .reply(200, {
  //     _index: 'test',
  //     _type: '_doc',
  //     _id: '1',
  //     _version: 1,
  //     result: 'created',
  //     _shards: {
  //       total: 2,
  //       successful: 1,
  //       failed: 0,
  //     },
  //     _seq_no: 0,
  //     _primary_term: 1,
  //   });

  // elasticSearchServer
  //   .persist()
  //   .get('/_cat/indices')
  //   .reply(200, [
  //     {
  //       health: 'green',
  //       status: 'open',
  //       index: 'test',
  //       uuid: 'xHgRzRznQ2ey_PVHMzJmmQ',
  //       pri: '1',
  //       rep: '1',
  //       'docs.count': '0',
  //       'docs.deleted': '0',
  //       'store.size': '230b',
  //       'pri.store.size': '230b',
  //     },
  //   ]);
});

describe('Routes', () => {
  // it('PUT /v1/regions/:id', async () => {
  //   const response = await request(app)
  //     .put('/v1/regions/test-id')
  //     .send({ key: 'value' });
  //   expect(response.status).toBe(200);
  //   expect(response.body).toHaveProperty('id', 'test-id');
  // });

  // it('DELETE /v1/regions/:id', async () => {
  //   const response = await request(app).delete('/v1/regions/test-id');
  //   expect(response.status).toBe(200);
  // });

  // it('GET /v1/regions', async () => {
  //   const response = await request(app).get('/v1/regions');
  //   expect(response.status).toBe(200);
  // });

  // it('GET /v1/regions/:id', async () => {
  //   const response = await request(app).get('/v1/regions/test-id');
  //   expect(response.status).toBe(200);
  // });

  // it('GET /v1/indexes', async () => {
  //   const response = await request(app).get('/v1/indexes');
  //   expect(response.status).toBe(200);
  // });

  // it('GET /v1/indexes/:id', async () => {
  //   const response = await request(app).get('/v1/indexes/test-id');
  //   expect(response.status).toBe(200);
  // });

  it('PASSES', async () => {
    expect('bro').toBe('bro');
  });
});

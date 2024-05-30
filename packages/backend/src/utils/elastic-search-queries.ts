export const queries = {
  LAST_30_DAYS_UNIQUE_BY_ADDRESS: {
    size: 1000,
    query: {
      range: {
        lastSeen: {
          gte: 'now-30d/d',
          lte: 'now/d',
        },
      },
    },
    collapse: {
      field: 'address.keyword',
    },
    sort: [
      {
        lastSeen: {
          order: 'desc',
        },
      },
    ],
  },
};

export const aggregations = {
  uniqueBy: (term: string = 'address', count = 1000) => {
    return {
      [`uniqueBy_${term}`]: {
        terms: {
          field: term,
          size: count,
        },
        aggs: {
          latest_record: {
            top_hits: {
              size: 1,
              _source: {
                includes: ['price'],
              },
              sort: [
                {
                  lastSeen: {
                    order: 'desc',
                  },
                },
              ],
            },
          },
        },
      },
    };
  },
};

import React, { useState, useEffect, useMemo, type FC } from 'react';
import './App.css'
import { Avatar } from './components/avatar'
import { Link } from './components/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/table'

type PropertyType = {
  mlsId: { value: React.Key | null | undefined };
  url: string;
  price: { value: number };
  cashFlow: { yearlyNet: number };
  [key: string]: any;
};

type DataType = PropertyType[] | null;

function formatCurrency(number: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(number));
}

const App: FC = () => {
  console.count('invoked');

  const [data, setData] = useState<DataType>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (data === null || sortField === null) return data;
    const sorted = [...data].sort((a, b) => (a[sortField] > b[sortField] ? 1 : -1));
    return sortDirection === 'asc' ? sorted : sorted.reverse();
  }, [data, sortField, sortDirection]);


  // NOTE: this will fetch data twice duue to dev-time 
  // checking via <React.StrictMode> in main.tsx. Apparently 
  // this is considered OK and only will occur in dev 🤷‍♂️ 
  useEffect(() => {
    fetch('/v1/properties/college')
      .then(response => response.json())
      .then(data => {
        return data.sort((a: PropertyType, b: PropertyType) => {
          return b.cashFlow.yearlyNet - a.cashFlow.yearlyNet;
        })
      })
      .then(setData);
  }, []);

  if (data === null) {
    return '...loading'
  } else {
    console.log('data was fetched', data);
  }

  return (
    <>
      <Table className="[--gutter:theme(spacing.6)] sm:[--gutter:theme(spacing.8)]">
        <TableHead>
          <TableRow>
            <TableHeader onClick={() => handleSort('url')}>URL</TableHeader>
            <TableHeader onClick={() => handleSort('price')}>Price</TableHeader>
            <TableHeader onClick={() => handleSort('yearlyNet')}>Yearly Net</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((property) => (
            <TableRow key={property.mlsId?.value}>
              <TableCell>
                <a target="_blank" href={`https://redfin.com${property.url}`}>{property.url}</a>
              </TableCell>
              <TableCell className="text-zinc-500">{formatCurrency(property.price?.value)}</TableCell>
              <TableCell>
                {formatCurrency(property.cashFlow.yearlyNet)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

    </>
  )
}

export default App
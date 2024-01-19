# OpenData

A repository platform for maintaining open data, providing a hub for data enthusiasts, researchers, and businesses, streamlining the access, management, and utilization of open datasets. Centralizing diverse data into one unified repository, we champion collaborative data management akin to "GitHub for datasets." With tools for standardized data schemas and advanced querying, even non-tech-savvy users should be able to delve deep into data analysis. From fetching relevant datasets using everyday language to AI-powered predictions, our goal is to democratize data, making it easily accessible and actionable for everyone.

## Getting Started

1. **Clone the Repository**:
   
   ```bash
   git clone git@github.com:rileyhilliard/opendata.git
   ```

   ```bash
   gh repo clone rileyhilliard/opendata
   ```

2. **Install Dependencies**:
   
   ```bash
   cd opendata
   yarn
   ```

3. **Run the Development Server**:

   ```bash
   yarn start
   ```

4. **Open Svelte App**
  ```bash
   visit http://localhost:3000/
   ```
   
5. **Open Apollo Graphql Environment**
  ```bash
   visit http://localhost:4000/graphql or http://localhost:3000/graphql
   ```

## Features

- **Community-Driven Data Repositories**: Users can upload and maintain datasets, fostering an open-data ecosystem.
  
- **Automated Data Profiling**: The system attempts to identify patterns and similarities between datasets to establish potential relations.
  
- **Dynamic Data Associations**: Identified relationships between datasets are recorded, enabling complex cross-repository queries and analyses.

- **GraphQL Integration**: Data retrieval powered by Apollo GraphQL, allowing for flexible and efficient queries.

- **User Authentication**: Secure user registration and authentication mechanisms.

## Tech Stack

### Backend

- **Language**: Node.js
- **Authentication**: OAuth (via Passport.js)
- **Database**: MongoDB
- **API**: Apollo GraphQL

### Frontend

- **Framework**: SvelteKit
- **Authentication**: 
- **CSS**: Tailwind
- **Build Tool**: Vite
- **Testing**: ViTest

## Contribution Guidelines

We welcome contributions! If you're looking to contribute:

1. Create a new feature branch.
2. Make your changes.
3. Submit a pull request with a detailed description of the changes.

For detailed contribution guidelines, refer to [CONTRIBUTING.md](CONTRIBUTING.md).

## Roadmap

https://docs.google.com/document/d/1PzYTAwi8ZQV_tEXXF3eMDjFuXUlk3oIk9qUbqgMH1qk/edit?usp=sharing

## License

This project is propriatary and cannot be licensed 
   

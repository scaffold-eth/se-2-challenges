# Backend for Challenge - Multisig

## Overview

This Express server application is a simple REST API designed for managing transaction data. It uses Node.js, Express.js, CORS, body-parser, dotenv for environment variable management, and lowdb for a lightweight JSON database. The server allows fetching and storing transaction data.

## Features

- **Get Transaction**: Retrieve transaction data based on a unique key.
- **Post Transaction**: Add a new transaction to the database.
- **CORS Enabled**: Allows cross-origin requests.
- **Environment Variable Support**: Configurable settings via `.env` file.
- **JSON Database**: Uses lowdb for storing transaction data.

## Installation

To set up the project locally, follow these steps:

1. **Clone the Repository**

   ```bash
   git clone git@github.com:scaffold-eth/se-2-challenges.git multisig-backend
   cd multisig-backend
   git checkout multisig-backend
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Set Up Environment Variables**

   Create a `.env` file in the project root and set your environment variables

   Example `.env` file: `.env.example`

## Usage

## Starting the Server

To start the server, follow these two steps:

1. **Build the Project**

   First, compile the TypeScript files into JavaScript. This process creates the necessary files in the `dist` folder, which will be used to run the server.

   Run the build command:

   ```bash
   npm run build
   ```

2. **Run the Server**

   After building the project, start the server by running:

   ```bash
   npm run start
   ```

   This command will launch the Node.js server using the compiled JavaScript files in the dist folder.

### API Endpoints

1. **Get Transaction**

   - Method: `GET`
   - URL: `/:key`
   - Description: Retrieve a transaction by its unique key.

2. **Post Transaction**

   - Method: `POST`
   - URL: `/`
   - Description: Add a new transaction to the database.

## Database

The application uses lowdb with a JSON file for data persistence. The structure of the database is as follows:

- `transactions`: A dictionary of transaction objects keyed by a unique identifier.

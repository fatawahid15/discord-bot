import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables from the .env file
dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri) {
    throw new Error('MONGODB_URI is not defined in the .env file.');
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
export const client = new MongoClient(uri);

export async function connectToDB() {
    try {
        // Connect the client to the server (optional starting in v4.7)
        await client.connect();
        // Establish and verify connection
        await client.db("admin").command({ ping: 1 });
        console.log("Successfully connected to MongoDB!");
    } catch (error) {
        console.error("Failed to connect to MongoDB", error);
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}
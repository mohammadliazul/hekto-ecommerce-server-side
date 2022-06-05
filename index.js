const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const port = process.env.PORT || 5000;
// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hta0c.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// check uri paisee cmd te 
// console.log(uri);

async function run() {
    try {
        await client.connect();
        // check db connection paisee cmd te
        console.log('Database connected successfully');

        const database = client.db("hekto_Database");
        const productsCollection = database.collection("products");


        // POST API
        app.post('/products', async (req, res) => {
            const product = req.body;
            // console.log('hit the post api', product);
            // res.send('post hitted');

            const result = await productsCollection.insertOne(product);
            // console.log(result);
            res.json(result);
        });

        // Get Products API
        app.get('/products', async (req, res) => {
            const cursor = productsCollection.find({});
            const products = await cursor.toArray();
            res.send(products);
        });


    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Running Hekto Server')
})

app.listen(port, () => {
    console.log(`listening on port ${port}`)
})
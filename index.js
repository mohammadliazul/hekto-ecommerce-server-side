const express = require('express');
const app = express();
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const e = require('express');

const port = process.env.PORT || 5000;

// 
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hta0c.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// check uri paisee cmd te 
// console.log(uri);

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        let token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }

    }
    next();
}


async function run() {
    try {
        await client.connect();
        // check db connection paisee cmd te
        console.log('Database connected successfully');

        const database = client.db("hekto_Database");
        const productsCollection = database.collection("products");
        const reviewsCollection = database.collection("reviews");
        const usersCollection = database.collection("users");
        const ordersCollection = database.collection("orders");
   


        // POST products API
        app.post('/products', async (req, res) => {
            const product = req.body;
            // console.log('hit the post product api', product);
            // res.send('post product hitted');

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

        // Delete Product API
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            // console.log('getting specific product id', id);
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.json(result);
        });

        

        // Admin yes or not API
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        });


        // POST users API
        app.post('/users', async (req, res) => {
            const user = req.body;
            // console.log('hit the post user api', user);
            // res.send('post user hitted');

            const result = await usersCollection.insertOne(user);
            // console.log(result);
            res.json(result);
        });

        // PUT users API
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        // Add admin role
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            // console.log('put req.headers >>>', req.headers);
            // console.log('put req.headers.authorization >>>', req.headers.authorization);
            const requester = req.decodedEmail;
            // console.log('put requester >>>', requester);
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.send(result);
                }
            }
            else {
                res.status(403).json({ message: 'You do not have access to make admin' });
            }
        })

        // POST reviews/testimonials API
        app.post('/reviews', async (req, res) => {
            const review = req.body;
            // console.log('hit the post review api', review);
            // res.send('post review hitted');

            const result = await reviewsCollection.insertOne(review);
            // console.log(result);
            res.json(result);
        });


        // Get reviews/testimonials API
        app.get('/reviews', async (req, res) => {
            const cursor = reviewsCollection.find({});
            const reviews = await cursor.toArray();
            res.send(reviews);
        });
        
        // Get purchase product id api
        app.get('/purchase/:id', async (req, res) => {
            const id = req.params.id;
            // console.log('getting specific product', id);
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.findOne(query);
            res.json(result);
        });

        // Order Now
        app.put("/orders", async (req, res) => {
            const order = req.body;
            const existUserEmail = await ordersCollection.findOne({ email: order.email });
            const existUserProductId = await ordersCollection.findOne({ product_id: order.product_id });
            const query = { email: order.email, product_id: order.product_id };
            const exist = await ordersCollection.findOne(query);

            if (existUserEmail === null || existUserProductId === null || exist == null) {
                // console.log('if condition working')
                const result = await ordersCollection.insertOne(order);
                res.json(result);
            }
            else {
                // console.log('else condition working');
                const filter = { exist };
                const options = { upsert: true }
                const updateDoc = {
                    $set: {
                        exist: order?.exist,
                        displayName: order.displayName,
                        email: order?.email,
                        quantity: exist?.quantity + order?.quantity,
                        price: order?.price * (exist?.quantity + order?.quantity),
                        product_id: order?.product_id,
                        status: order?.status,
                        thumbnail: order?.thumbnail,
                        title: order?.title,

                    }
                };
                const result = await ordersCollection.updateOne(filter, updateDoc, options);
                const delete_Exist = ordersCollection.deleteOne(exist);
                res.json(result);
            }
        })

        // Get orders API
        app.get('/orders/:email', async (req, res) => {
            const result = await ordersCollection.find({ email: req.params.email }).toArray();
            // console.log(result);
            res.send(result);
        });

        // user delete order api (before user place order) and
        // manage order delete api
        app.delete('/order/delete/:id', async (req, res) => {
            const deleteOrderId = req.params.id;
            // console.log("deleteOrderId >>>", deleteOrderId);
            const result = await ordersCollection.deleteOne({ _id: ObjectId(deleteOrderId) });
            // console.log(result);
            res.json(result);
        });

        app.put("/orders-placed/:email", async (req, res) => {
        const shippingInfo = req.body;
        const email = req.params.email;
        // console.log(shippingInfo, email);
        const filter = { email: email };
        // const options = { upsert: false }
        const updateDoc = { 
            $set: {
                shippingName: shippingInfo?.shippingName,
                shippingEmail: shippingInfo?.shippingEmail,
                address: shippingInfo?.address,
                apartment: shippingInfo?.apartment,
                city: shippingInfo?.city,
                postcode: shippingInfo?.postcode,
                country: shippingInfo?.country,
                phone: shippingInfo?.phone,
            }
        };
        const result = await ordersCollection.updateMany(filter, updateDoc);
        res.send(result);
        });

        // Manage orders get API
        app.get("/manage-orders", async (req, res) => {
        const result = await ordersCollection.find({}).toArray();
        res.send(result);
        });

        // update order status
        app.put("/update-order-status/:id", (req, res) => {
            const id = req.params.id;
            const updatedStatus = req.body.status;
            const filter = { _id: ObjectId(id) };
            // console.log(updatedStatus);
            ordersCollection
                .updateOne(filter, {
                    $set: { status: updatedStatus },
                })
                .then((result) => {
                    res.send(result);
                });
        });

    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Running Hekto Server');
})

app.listen(port, () => {
    console.log(`listening on port ${port}`);
})
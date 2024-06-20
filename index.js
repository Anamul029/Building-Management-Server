const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId, Timestamp } = require('mongodb');
const cors = require('cors');
const app = express();
require('dotenv').config()
var jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

// midleware
app.use(cors())
app.use(express.json())


// database

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yl5czei.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const roomCollection = client.db('BuildingDB').collection('rooms')
        const bookingCollection = client.db('BuildingDB').collection('booking')
        const annouchmentCollection = client.db('BuildingDB').collection('annouchment')
        const userCollection = client.db('BuildingDB').collection('users')
        const paymentCollection = client.db('BuildingDB').collection('payments')


        // create token
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({token})
        })
        // midleware 
        const verifyToken = (req, res, next) => {
            console.log('inside verify token', req.headers.authorization)
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            const token = req.headers.authorization.split(' ')[1];
            // decoding token verify
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next()
            })
            // next();
        }
        // use verify admin after verify token
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query)
            const isAdmin = user?.role === 'admin'
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }


        // save a user data in db
        app.put('/users',async (req, res) => {
            const user = req.body;
            // console.log(user,'user here')
            // chack if user already exist
            const isExist =await userCollection.findOne({ email: user?.email })
            if (isExist) {
                return res.send({ message: 'user already exists', insetedId: null })
            }
            const options={upsert:true}
            const query={email:user?.email}
            const updateDoc={
                $set:{
                    ...user,
                    Timestamp:Date.now()
                }
            }
            const result=await userCollection.updateOne(query,updateDoc,options)
            res.send(result);
        })
        app.patch('/users/:email',async(req,res)=>{
            const email=req.params.email;
            const query={email:email}
            const updateDoc={
                $set:{
                    role:'member'
                }
            }
            const result=await userCollection.updateOne(query,updateDoc)
            res.send(result);
        })
        
        // get all user data from database
        app.get('/users',async(req,res)=>{
            const query=req.body;
            const result=await userCollection.find(query).toArray();
            res.send(result);
        })
        
        // get user info by email from db
        app.get('/users/:email',async(req,res)=>{
            const email=req.params.email;
            const result=await userCollection.findOne({email})
            res.send(result);
        })


        app.get('/rooms', async (req, res) => {
            const query = req.body;
            const result = await roomCollection.find(query).toArray()
            res.send(result)
        })
       

        // add booking data to the database  with agreement button
        app.post('/booking', async (req, res) => {
            const room = req.body;
            const result = await bookingCollection.insertOne(room)
            res.send(result)
        })

        // get booking data useing email
        app.get('/booking/:email',async(req,res)=>{
            const email=req.params.email;
            const query={email:email}
            const result=await bookingCollection.findOne(query);
            res.send(result);
        })


        app.get('/booking', async (req, res) => {
            const user = req.body;
            const result = await bookingCollection.find().toArray()
            res.send(result)
        })
        app.delete('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingCollection.deleteOne(query)
            res.send(result)
        })

        // annouchment related api
        app.post('/annouchment', async (req, res) => {
            const data = req.body;
            const result = await annouchmentCollection.insertOne(data)
            res.send(result)
        })
        // get annouchment from database
        app.get('/annouchment',async(req,res)=>{
            const notice=req.body;
            const result=await annouchmentCollection.find().toArray();
            res.send(result);
        })

        // create payment intent
        app.post('/create-payment-intent', async(req,res)=>{
            const {price}=req.body;
            const amount=parseInt(price*100);
            console.log(amount);
            // create paymentIntent with the order amount and currency
            const paymentIntent=await stripe.paymentIntents.create({
                amount:amount,
                currency: "usd",
                payment_method_types:['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            })
           
        })

        app.post('/payments',async(req,res)=>{
            const payment=req.body;
            const result=await paymentCollection.insertOne(payment);
            console.log('payment info',payment)
            res.send(result)
        })
    //    get payment data
       app.get('/payments',async(req,res)=>{
        const result= await paymentCollection.find().toArray();
        res.send(result)
       })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Building server is running')
})

app.listen(port, () => {
    console.log(`Building server is running on port ${port}`)
})
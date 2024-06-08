const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const app = express();
require('dotenv').config()
const port = process.env.PORT || 5000

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
        await client.connect();

        const roomCollection = client.db('BuildingDB').collection('rooms')
        const bookingCollection = client.db('BuildingDB').collection('booking')
        const annouchmentCollection=client.db('BuildingDB').collection('annouchment')
        const userCollection=client.db('BuildingDB').collection('users')


        app.get('/rooms',async(req,res)=>{
            const query=req.body;
            const result=await roomCollection.find(query).toArray()
            res.send(result)
        })
        // deleted rooms info
        app.delete('/rooms/:id',async(req,res)=>{
            const id=req.params.id;
            const query={_id:new ObjectId(id)}
            const result=await roomCollection.deleteOne(query)
            res.send(result);
        })

        // add booking data to the database  with agreement button
        app.post('/booking',async(req,res)=>{
            const room=req.body;
            const result=await bookingCollection.insertOne(room)
            res.send(result)
        })
        // get room data by email
        // app.get('/booking', async (req, res) => {
        //     const email=req.query.email;
        //     const query={email:email}
        //     console.log(query)
        //     const result = await bookingCollection.find(query).toArray();
        //     res.send(result);
        // })

        app.get('/booking', async(req,res)=>{
            const user=req.body;
            const result=await bookingCollection.find().toArray()
            res.send(result)
        })
        app.delete('/booking/:id',async(req,res)=>{
            const id=req.params.id;
            const query={_id:new ObjectId(id)};
            const result=await bookingCollection.deleteOne(query)
            res.send(result)
        })
     
        // annouchment related api
        app.post('/annouchment',async(req,res)=>{
            const data=req.body;
            const result=await annouchmentCollection.insertOne(data)
            res.send(result)
        })

        // users related api
        app.post('/users',async(req,res)=>{
            const user=req.body;
            // insert email if user doesnot exist
            const query={email:user.email}
            const existingUser=await userCollection.findOne(query)
            if(existingUser){
                return res.send({message:'user already exists',insetedId:null})
            }
            const result= await userCollection.insertOne(user)
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
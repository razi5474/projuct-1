const express = require ('express')

const mongoose = require("mongoose")
const Product = require('./models/product')

const app = express()
const jwt = require('jsonwebtoken')
require('dotenv').config()
const secret_key=process.env.JWT_SECRET_KEY
const cors = require('cors');
const bcrypt = require('bcrypt')
const live_url = process.env.LIVE_URL
const port = process.env.PORT 



app.use(cors({
    origin: live_url, // Allow only your frontend origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
  }));

app.use(express.json())

app.get('/',(req,res)=>{
    res.send("Hello World")
})

const mongo_url=process.env.MONGODB_URL
async function main(){
    await mongoose.connect(mongo_url)
}
    
main()
.then(()=>console.log("DB connected"))
.catch(err=>console.log(err))

const authenticateTocken = (req,res,next)=>{
    const token = req.headers['authorization']?.split(' ')[1]
    if(!token) return res.sendStatus(401)

    jwt.verify(token,secret_key,(err,user)=>{
        if(err) return res.status(403).json(err) //invalid token
        req.user =user;
        next()
    })

}

// create product
app.post('/products',authenticateTocken,async(req,res)=>{
    try {
        const product = new Product(req.body)
        await product.save()
        res.status(201).json(product)
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

// get all products
app.get('/products',async(req,res)=>{
    try {
        const products = await Product.find()
        
        res.status(200).json(products)

    } catch (error) {
        console.log(error)
        res.status(500).json(error)  
    }
})

// Aggregate-get product count greater than input value

app.get('/products/count/:price',async(req,res)=>{
   
    try {
        const price = Number(req.params.price)
        const produtCount =await Product.aggregate([
            {
                $match:{price:{$gt:price}}
            },
            {
                $count:"productCount"
            }
        ])
        res.status(200).send(produtCount)
        
    } catch (error) {
        console.log(error)
        res.status(500).json(error) 
    }
})

//get the average price of all products in the collection
app.get('/products/average-price'),async(req,res)=>{
    try {
        const avgPrice = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    averagePrice: { $avg: "$price" }
                }
            }
        ]);

        res.status(200).json(avgPrice.length > 0 ? avgPrice[0] : { averagePrice: 0 });
    } catch (error) {
        console.log(error)
        res.status(500).json(error) 
    }
}


// get products by id
app.get('/products/:id',async(req,res)=>{
    try {
        const productId = req.params.id
        if(!mongoose.Types.ObjectId.isValid(productId)){
            return res.status(400).json({error:"Invalid Product ID format"})
        }
        const product = await Product.findById(productId)

        
        if(!product){
            return res.status(404).json({message:"Product not found"})
        }
        else{
            res.status(200).json(product)
        }  
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

// Update products
app.patch('/products/:id',async(req,res)=>{

    try {
        const productId = req.params.id
        if(!productId){
            return res.status(400).json({error:"Product ID is required"})
        }
        if(!req.body || Object.keys(req.body).length === 0){
           return res.status(400).json({error:"Product deatails can't be empty"})
        }
        if(!mongoose.Types.ObjectId.isValid(productId)){
            return res.status(400).json({error:"Invalid Product ID format"})
        }
        const product = await Product.findByIdAndUpdate(productId,req.body,{new:true})
        res.status(200).json(product)
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

// deleate products
app.delete('/products/:id',async(req,res)=>{

    try {
        const productId = req.params.id
        if(!productId){
            return res.status(400).json({error:"Product ID is required"})
        }

        if(!mongoose.Types.ObjectId.isValid(productId)){
            return res.status(400).json({error:"Invalid Product ID format"})
        }

        const product = await Product.findByIdAndDelete(productId)
        if (!product){
            return res.status(404).json({message:"Product not found"})
        }
        else{
            res.status(200).json({message:"Product deleted succesfully"})
        }


    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

// Users
const User = require('./models/user')

// creat user-Sign up from front end

app.post('/user',async (req,res)=>{
    try {
        if(!req.body){
            return res.status(400).json({error:"Users deatails can't be empty"})
         }
         const saltRounds = 10
         bcrypt.hash(req.body.password,saltRounds, async(err,hash)=>{

            var userItem={
                name:req.body.name,
                email:req.body.email,
                password:hash,
                createdAt:new Date()
             }
             var user = new User(userItem)
             await user.save()
             res.status(201).json(user)

         }) }
          catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

// Login- Sign in from front end

app.post('/login',async(req,res)=>{
    try {
        if(!req.body){
            return res.status(400).json({error:"Login deatails can't be empty"})
         }

         const{email,password} = req.body
         const user = await User.findOne({email:email})
         if(!user){
            return res.status(404).json({message:"User not found "})
         }
         console.log(user)
         const isValid = await bcrypt.compare(password,user.password)
         if(!isValid){
            return res.status(500).json({message:"invalid password"})
         }

        //  Create tocken
        let payload = {user:email}
        console.log(secret_key)
        let token = jwt.sign(payload,secret_key)
        res.status(200).json({message:"Login is successfull",token:token})



    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

app.listen(port,()=>{
    console.log("server started")
})


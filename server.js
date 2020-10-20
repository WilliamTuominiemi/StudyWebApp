const express = require('express')
const bodyParser= require('body-parser')
const MongoClient = require('mongodb').MongoClient
const app = express()
const bcrypt = require('bcrypt')
var path = require('path')

app.use(bodyParser.urlencoded({ extended: true }))

// CSS stylesheet for html
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs')

// Change this to your own mongodb database connection string
const connectionString = 'mongodb+srv://WilliamLaptop:39Hh7wQVFMH4t9w2@cluster0.nb3c9.mongodb.net/CRUD?retryWrites=true&w=majority'

app.listen(3000, () => {
    console.log('listening on 3000')
})

/* Connect to mongoDB database first. */
MongoClient.connect(connectionString, { useUnifiedTopology: true })
  .then(client => {
    console.log('Connected to Database')
    const db = client.db('USER-AUTH')
    const collection = db.collection('users')
    const datacollection = db.collection('user-data')


    /* Render main page at root. */
    app.get('/', (req, res) => {
        db.collection('users').find().toArray()
        .then(results => {
            res.render('index.ejs', {users: results})
        })  .catch(error => console.error(error))      
    })

    // Register.
    app.post('/register', (req, res) => {
        console.log("registering")

        /* First check if email or username already exists by creating an array
        where you push all the emails already in database. */
        let emails = []
        let usernames = []

        db.collection('users').find().toArray()            
        .then(results => {
            /* Push each object email element to array. */
            results.forEach(object => {
                emails.push(object.email)
                usernames.push(object.username)
            })

            /* Check if array has the email the user is trying to register. */
            if(emails.includes(req.body.email) || usernames.includes(req.body.username))
            {
                console.log("email or username already registered")
                res.redirect('/err/auth')
            }
            else {
                /* If not, add user to database. */
                bcrypt.hash(req.body.password , 10, (err, hash) => {
                    req.body.password = hash
                    // Store hash in database

                    let obj = {
                        "username" : req.body.username,
                        "email" : req.body.email,
                        "password" : req.body.password,
                    }

                    let dataobj = {
                        "username" : req.body.username,
                    }

                    collection.insertOne(obj)
                    .then(result => {
                        console.log("users: ", obj)
                        datacollection.insertOne(dataobj)
                        .then(dresult => {
                            console.log("users: ", dataobj)
                            res.redirect('/')
                        })
                        .catch(error => console.error(error))
                    })
                    .catch(error => console.error(error))
                  });
            }
        })  .catch(error => console.error(error))                   
    })
    
    // Login.
    app.post('/login', (req, res) => {
        console.log("logging in")
        let itemsProcessed = 0;
        db.collection('users').find().toArray()            
        .then(results => {                                  
            results.forEach(object => {    
                /* Check if any authentication info in database match the authentication info input of user. */
                /* .trim() function removes all whitespace. */
                if(object.username.trim() === req.body.username.trim()) {
                        /* Use bcrypt to compare the two */
                        console.log(bcrypt.compareSync(req.body.password, object.password))
                        if(bcrypt.compareSync(req.body.password, object.password)){
                            // Passwords match
                            itemsProcessed++
                            console.log("Password match: ", itemsProcessed, results.length)
                            res.redirect('/users/' + object._id)   
                        } else{
                            // Passwords don't match
                            itemsProcessed++
                            console.log("Password don't match: ", itemsProcessed, results.length)
                            if(itemsProcessed === results.length+1)
                            {
                                console.log("Passwords don't match")
                                res.redirect('/err/auth')
                            }
                        }
                }  
                else{
                    // User not found
                    itemsProcessed++
                    console.log("Password don't match: ", itemsProcessed, results.length)
                    if(itemsProcessed === results.length)
                    {
                        console.log("User not found")
                        res.redirect('/err/auth')
                    }
                }       
            })
            
        })  .catch(error => console.error(error))
    })

    // User profile page.
    app.get('/users/:userId/', (req, res) => {
        requestParam = JSON.stringify(req.params)
        const BreakException = {}
        db.collection('users').find().toArray()
        .then(results => {
            results.forEach(object => {                
                if(requestParam.includes(object._id.toString()))
                {
                    console.log("id matches")

                    console.log(object.username)

                    const query = { username : object.username }

                    db.collection("user-data").find(query).toArray()
                    .then(items => {
                      console.log(`Successfully found ${items.length} documents.`)
                      console.log("user data: ", items[0])
                      res.render('user-profile.ejs', {user: object, data: items[0]})
                    })
                    .catch(err => console.error(`Failed to find documents: ${err}`))
                        
                    
                }
                else {
                    console.log("id does not match")
                }
            })
        })  .catch(error => console.error("user error: ", error))   
    })

    // Register/Login error
    app.get('/err/auth', (err,res) => {
        res.render('auth-error.ejs', {err: "Login or registration failed"})
    })
    
    
    app.post('/add-submit', (req,res) => {

        let postDate = new Date();
        let dd = String(postDate.getDate()).padStart(2, '0');
        let mm = String(postDate.getMonth() + 1).padStart(2, '0');
        let yyyy = postDate.getFullYear();

        postDate = mm + '/' + dd + '/' + yyyy;

        subject = req.body.subject

        let pushValue = {
            "time": req.body.time,
            "description": req.body.description,
            "date": postDate 
        }
            
        console.log(pushValue)

        console.log(postDate)

        let newvalues = { 
            $push: {
                [postDate] : {
                    [subject] : {
                        "time": req.body.time,
                        "description": req.body.description,
                        "date": postDate 
                    }
                }
            }                             
        }
        var query = { username: req.body.username };

        db.collection("user-data").updateOne(query, newvalues, (err, response) => {
            if (err) {
                throw err;
            }
            console.log("1 document updated");
            res.redirect('/users/'+req.body.id)
        }); 
    })
    

    // 404 page
    app.use((req, res) => {
        res.status(404).send('404 not found');
    });
})
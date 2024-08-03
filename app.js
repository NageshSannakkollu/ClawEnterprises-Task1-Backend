const express= require('express');
const app = express();
const {open} = require("sqlite");
const sqlite3  = require('sqlite3');
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cors = require('cors');
const { stat } = require('fs');
app.use(cors());
app.use(express.json())
const dbPath = path.join(__dirname,'clawDatabase.db'); 
const port = 3006;

let db = null;

const initializeDbAndServer = async() =>{
    try{
        db = await open({
        filename:dbPath,
        driver:sqlite3.Database
    })
    app.listen({port},(() =>{
    console.log(`Server Running at: http://localhost:${port}`);
}))
    }catch(e){
        console.log(`Error Raised At:${e.message}`)
    }
}
const validatePassword = (password) => {
    return password.length > 4;
}
initializeDbAndServer();

//Authenticate Token 

const AuthenticateToken = (request,response,next) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if(authHeader !== undefined){
        jwtToken = authHeader.split(" ")[1]
        if(jwtToken === undefined){
            response.status(401)
            response.send("Invalid JWT Token");
        }else{
            jwt.verify(jwtToken,'MY_SECRETE_KEY',async(error,payload) => {
                if(error){
                    response.status(401);
                    response.send("Invalid JWT Token")
                }else{
                    next()
                }
            })
        }
    }
}

// USER Register

app.post('/register',async(request,response) => {
    const {username,name,password,gender,location} = request.body;
    const  hashedPassword = await bcrypt.hash(password,10);
    const selectUserQuery = `SELECT * FROM users WHERE username='${username}'`;
    const userQueryResponse = await db.get(selectUserQuery);
    // console.log(userQueryResponse)
    if(userQueryResponse === undefined){
        const createUserQuery = `
        INSERT INTO 
        users(username,name,password,gender,location) 
        VALUES
        (
            '${username}',
            '${name}',
            '${hashedPassword}',
            '${gender}',
            '${location}'
        )`

        if(validatePassword(password)){
            await db.run(createUserQuery);
            response.send("User Created Successfully")
        }else{
            response.status(400);
            response.send("Password is too short...")
        }
    }else {
        response.status(400);
        response.send("User Already Exists");
    }
})

//User Login 

app.post("/login",async(request,response) => {
    const {username,password} = request.body;
    const getUserQuery = `SELECT * FROM users WHERE username='${username}'`;
    const userResponse = await db.get(getUserQuery);
    if(userResponse === undefined){
        response.status(400)
        response.send("Invalid User")
    }else{
        const comparePassword = await bcrypt.compare(password,userResponse.password)
        if(comparePassword){
            const payload = {
                username:username,
            }
            const jwtToken=jwt.sign(payload,'MY_SECRETE_KEY')
            response.send({jwtToken})
        }
    }
})

//GET-todos

app.get("/todos",async(request,response) => {
    const getAllTodoItems = `SELECT * FROM to_do_items;`;
    const todosResponse = await db.all(getAllTodoItems);
    response.send(todosResponse);
})

//POST /todos 

app.post("/todos",async(request,response) => {
    const {userId,description,status} = request.body;
    const postTodoQuery = `INSERT INTO to_do_items(user_id,description,status) 
    VALUES(
        ${userId},
        '${description}',
        '${status}'
    );`;
    await db.run(postTodoQuery);
    response.send("Todo Item Added Successfully");
})

//Put -todos 

app.put("/todos/:id/",async(request,response) => {
   const {id} = request.params;
   console.log(id)
   const {userId,description,status} = request.body;
   console.log(userId,description,status);
    const updateToDoDetails = `
    UPDATE 
    to_do_items(user_id,description,status)
    SET
        user_id= ${userId},
        description = '${description}',
        status = '${status}'
    WHERE 
        id=${id}`
    await db.run(updateToDoDetails);
    response.send("Todo Item Updated Successfully..");
})

//DELETE 

app.delete("/todos/:id/",async(request,response) => {
    const {id} = request.params;
    console.log(id)
    const deleteQuery = `DELETE FROM to_do_items WHERE id=${id};`;
    await db.run(deleteQuery);
    response.send("Todo Item Deleted Successfully");
})
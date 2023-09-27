const express = require("express")
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt');
const cors = require('cors')
const fu = require("express-fileupload");
const IP = require('ip');
var jwt = require('jsonwebtoken');
var cookieParser = require('cookie-parser')


let app = express()
app.use(express.json());
app.use("/pictures",express.static("pictures"));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json())
app.use(cors())
app.use(fu())
app.use(cookieParser());
app.listen(4000)    

const {sendVerification} = require("./email-sender.js")

require('dotenv').config();
const {client} = require("./db.js");
const { test } = require("node:test");
client.connect()

app.post("/loginAdmin", loginAdmin)
app.post("/verifyCode",verifyCode)
app.get("/logout",logout)

app.get("/getCategories", getCategories)
app.post("/createCategory", createCategory)
app.delete("/deleteCategory/:id",checkToken, deleteCategory)
app.put("/updateCategory/:id",checkToken, updateCategory)

app.get("/getDishes", getDishes)
app.post("/createDish", createDish)
app.delete("/deleteDish/:id", deleteDish)
app.put("/updateDish/:id", updateDish)

app.get("/getDrinks", getDrinks)
app.post("/createDrink", createDrink)
app.delete("/deleteDrink/:id", deleteDrink)
app.put("/updateDrink/:id", updateDrink)

app.get("/getInfo", getInfo)
app.put("/updateInfoAboutUs", updateAboutUs)

app.get("/slideShowPictures", getSlideShows)
app.post("/addPicture",addPicture)
app.delete("/deletePicture/:id", deletePicture)

app.post("/test",testt)

function testt(req,res){
    res.cookie("token", "testing", {httpOnly: true})
    res.send({test:"testing"})
}


async function deletePicture(req,res){

    await client.query(`delete from slideshow_images where id=${req.params.id}`)
    res.send({"mes":"deleted"})

}

async function addPicture(req,res){
    let  {img} = req.files

    let imageName = img.name.split(".")
    let imgFile = "pictures/"+Date.now()+"."+imageName[imageName.length-1]
    console.log(imgFile)
    req.files.img.mv(imgFile)

    await client.query(`INSERT INTO slideshow_images (img) values($1)`,[imgFile])
    res.send({"mes":"SUCCESS"})
}

async function getSlideShows(req,res){
    res.send((await client.query(`SELECT *FROM slideshow_images`)).rows)
    
}

async function getInfo(req,res){
    try{
        res.send({"mes":"success","info":(await client.query("select *from infos")).rows})
    }
    catch(err){res.send({"err":err.message})}
    
}

async function updateAboutUs(req,res){
    try{
        let {address,phone,weekDays,saturday,sunday,email,aboutUs,bookTable,name, lunch_time} = req.body
        console.log(req.body)
        let infos = await client.query(`update infos set address=$1,weekdays=$2,saturday=$3,sunday=$4,email=$5,aboutus=$6,booktable=$7, phone=$8, name=$9, lunch_time=$10 where id=1 `,[JSON.stringify(address),weekDays,saturday,sunday,email,aboutUs,bookTable,phone,name,lunch_time])

        if(infos.rowCount==0){
            return res.send({"mes":"nothing updated"})
        }
        res.send({"mes":"updated","info":(await client.query("select *from infos")).rows})
    }
    catch(err){
        res.send({"mes":err.message})
    }
    
}
 

async function getDrinks(req,res){
    try{
        res.send((await client.query("select *from drinks")).rows)
    }
    catch(err){res.send({"mes":err.message})}
}

async function updateDrink(req,res){
    try{
        let {title,alcohol,price,volume, description,active} = req.body
        let drink = await client.query(`update drinks set title=$1, alcohol=$2, price=$3, active=$4, volume=$5, description=$6 where id=${req.params.id}`,[title,alcohol,price,active,volume, description,])
        if(drink.rowCount==0){
            return res.send({"mes":"nothing updated"})
        }
        res.send({"mes":"updated","drinks":(await client.query("select *from drinks")).rows})
    }
    catch(err){res.send({"mes":err.message})}
    
}

async function createDrink(req,res){
    let {title, alcohol,price, volume, description} = req.body
    let drinks = (await client.query("select *from drinks where title=$1",[title])).rows
    if(drinks.length!=0)res.send({"mes":`drink already named ${title}`})

    await client.query(`INSERT INTO drinks (title,alcohol,price,volume,description) values($1,$2,$3,$4, $5)`,[title,alcohol,price,volume, description])
    
    res.send((await client.query("select *from drinks")).rows)
}

async function deleteDrink(req,res){
    try{
        let deleted = await client.query(`DELETE FROM drinks where id=${req.params.id}`)
        if(deleted.rowCount==0){
            res.send({"mes":"nothing deleted"})
        }
        else res.send({"mes":"Deleted","drinks":(await client.query("select *from drinks")).rows})
    }catch(err){res.send(err.message)}
}


async function getCategories(req,res){
    res.send((await client.query("select *from categories")).rows)
}

async function updateCategory(req,res){
    try{
        let id = req.params.id
        let {title, active} = req.body;
        if(id==0){
            return res.send({"mes":"This category is not available for update"})
        }
        else if(id==1){
            await client.query(`Update categories set active=$1 where id=1`,[active])
            return res.send({"mes":"updated"})
        }
        else{
            let updated = await client.query(`Update categories set title=$1, active=$2 where id=$3`,[title,active,id])
            if(updated.rowCount==0){
                return res.send({"mes":"category not found"})
            }
            return res.send({"mes":"update successful","categories":(await client.query("select *from categories")).rows})
        }
        
    }
    catch(err){res.send(err.message)}
    

}

async function deleteCategory(req,res){
    try{
        let id = req.params.id
        if(id==0){return res.send({"mes":"This category is not available for deletion"})}
        await client.query(`Update dishes set category_id=0 where category_id=$1`,[req.params.id])
        let deleted = await client.query(`DELETE FROM categories where id=${req.params.id}`)
        if(deleted.rowCount==0){
            res.send({"mes":"nothing deleted"})
        }
        else res.send({"mes":"Deleted","categories":(await client.query("select *from categories")).rows})
    }catch(err){res.send(err.message)}
    
}

async function createCategory(req,res){
    console.log("KROPP",req.body)
    let {title} = req.body;
    
    await client.query(`INSERT INTO categories (title) values($1)`,[title])
    res.send((await client.query(`Select *from categories`)).rows)
}

async function updateDish(req,res){
    let {title,description,gluten,lactos,veg,active,price,category_id, number} = req.body
    let dish = await client.query(`update dishes set title=$1, description=$2,gluten=$3,lactos=$4,veg=$5,active=$6,price=$7, category_id=$8, number=$9 where id=${req.params.id}`,[title,description,gluten,lactos,veg,active,price,category_id, number])
    if(dish.rowCount==0){
        return res.send({"mes":"nothing updated"})
    }
    res.send({"mes":"updated","dishes":(await client.query("select *from dishes")).rows})
}

async function getDishes(req,res){
    res.send((await client.query("select *from dishes")).rows)
}

async function deleteDish(req,res){
    let deleted = await client.query(`DELETE FROM dishes where id=${req.params.id}`)
    if(deleted.rowCount==0){
        res.send({"mes":"nothing deleted"})
    }
    else res.send({"mes":"Deleted","dishes":await client.query("select *from dishes")})
    
}

async function createDish(req,res){
    let {title,description,gluten,lactos,veg,active,price,category_id, number} = req.body


    let categories = await client.query(`SELECT * FROM categories where id=$1`,[category_id])
    let dishes = await client.query(`SELECT * FROM dishes where title=$1`,[title])
    if(categories.rows.length==0){
        return res.send({"mes":"no category found"})
    }
    if(dishes.rows.length!=0){
        return res.send({"mes":`dish already named ${title}`})
    }
    let dish = await client.query(`INSERT INTO dishes (title,description,gluten,lactos,veg,active,price,category_id, number) values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[title,description,gluten,lactos,veg,active,price,category_id,number])
    console.log(dish)
    res.send((await client.query(`Select *from dishes`)).rows)
}

async function loginAdmin(req,res){
    try{
        console.log(req.body)
        let {username,password, email} = req.body
        
        let user = (await client.query(`Select * from admin where username=$1`,[username])).rows
        if(user.length!=0&&password==user[0].password&&email==user[0].email){
    
            
            let code = await sendVerification(email)
            let token = jwt.sign({
                user:username,
                hash:await bcrypt.hash(code, 12)
            }, process.env.secret, { expiresIn: '60s' });
            
            
            res.send({"mes":"SUCCESS", "token":token})
        }
        else res.send("DOOKIE")
    }
    catch(err){res.send(err.message)}
    
}
async function logout(req,res){
    await client.query(`delete from sessions`)
    res.send({"mes":"logged out"})
}

async function verifyCode(req,res){

    try {
        let {code,token}=req.body
        let verified = jwt.verify(token,process.env.secret)
        let checkCode = await bcrypt.compare(code,verified.hash)
        if(!checkCode) return res.send({"mes":"wrong code"})

        const ipAddress = IP.address();
        const hashedIpAddress = await bcrypt.hash(ipAddress,12)
    
        let session = await client.query("SELECT *FROM sessions")
    
        session.rows.forEach(element => {
            let ip = bcrypt.compare(ipAddress,element.ip_address)
            if(ip){
                client.query("DELETE FROM sessions where token=$1",[element.token])
            }
            
        });
        let user = (await client.query(`Select * from admin where username=$1`,[verified.user])).rows
        
        
        let newToken = jwt.sign({
            user:await bcrypt.hash(verified.user,12),
        }, process.env.secret, { expiresIn: '1h' });
        await client.query(`INSERT INTO sessions (token,user_id,ip_address) values($1,$2,$3)`, [newToken,user[0].id,hashedIpAddress])
        res.cookie("token", newToken, {httpOnly: true})
        res.send({"mes":"SUCCESS","token":newToken})
    } catch (error) {
        res.send({"mes":error.message})
    }
    

}


async function checkToken(req, res, next) {
    //console.log(req.headers);
    try {
      let token = req.headers.token ? req.headers.token : false;
      if (!token) return res.status(401).json({ mes: "No token provided" });
      const ipAddress = IP.address();
      let user = jwt.verify(token, process.env.secret);
      if(user.exp>user.iat){
        let session = (await client.query(`SELECT * FROM sessions where token=$1`,[token])).rows
        //console.log(session)
       
        
        let ip = await bcrypt.compare(ipAddress,session[0].ip_address)
        //console.log(ip)
        if(ip){
            //console.log(user)
            next();
        }
        else return res.send({"mes":"ip does not match"})
      }
      else return res.send({"mes":"token expired"})
      
    }
    catch (err) {
      res.status(400).json({ mes: err.message })
    }
  }
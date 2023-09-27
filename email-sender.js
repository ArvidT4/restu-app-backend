const nodemailer = require("nodemailer");
const crypto = require('crypto');

module.exports = {sendVerification}

async function sendVerification(email){
    let transporter = nodemailer.createTransport({
        service:'gmail',
        auth:{
            user:process.env.mail,
            pass:process.env.mailPW
        }
    });
    let code = getRandomCode()

    let send = await transporter.sendMail({
        to:email,
        subject:"Testing",
        html:`<h1>Funkar detta?</h1> ${code}`
    })
    return code;
}


function getRandomCode() {

    const code = crypto.randomBytes(3).toString("hex");
    console.log(code);
    return code;
  
  }
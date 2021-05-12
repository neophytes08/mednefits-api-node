require('dotenv').config();
const mailer = require('nodemailer');
const Email = require("email-templates");
const fs = require('fs');

const transporter = mailer.createTransport({
    // service: process.env.MAIL_SERVICE,
    host: process.env.OFFICE_HOST,
    port: process.env.OFFICE_PORT,
    secureConnection: false, 
    auth: {
        user: process.env.OFFICE_USERNAME,
        pass: process.env.OFFICE_PASSWORD
    }
})

const sendEMail = async (mailOptions) => {
    let constantKeys = ['from','to','subject']
    let mailKeys = Object.keys(mailOptions);
    
    if(!(mailKeys.indexOf("text") > -1) || !(mailKeys.indexOf("html") > -1) )
    {
        //invalidate email send
    }

    constantKeys.forEach(function(data){
        if(mailKeys.indexOf("text") <= -1)
        {
            console.warn('test error')
            //invalidate email send
        }
    })
    
    let result = await transporter.sendMail(mailOptions)
    return result;
}

const sendMail = async (data) => {
    console.log('data', data)
    const email = await new Email({
      views: {
        options: {
          extension: "ejs"
        }
      },
      juiceResources: {
        webResources: {
          images: false
        }
      }
    });

    let result = await email
      .render(data.email_page, data)
      .then(function (html, text) {
        // console.log(html);
        // return html;
        var mailOptions = {
          from: "Mednefits <info@medicloud.sg>",
          to: data.email,
          cc: 'info@medicloud.sg',
          subject: data.subject,
          html: html
        };

        if(data.attachments && data.attachments.length > 0) {
          mailOptions.attachments = data.attachments;
        }

        try {
          transporter.sendMail(mailOptions, function (error, info) {
            //will connect to the server and send the email.
            if (error) {
              console.log(error);
            } else {
              console.log("Email sent: " + info.response);
              // unlink file
              for(var x = 0; x < mailOptions.attachments.length; x++) {
                fs.unlink(mailOptions.attachments[x].path, (err) => {
                  if (err) throw err;
                  console.log('file was deleted');
                });
              }
              // res.json({ result: info.response });
            }
          });
        } catch(e) {
          console.log(e);
        }
      })
      .catch(console.error);
}

const sendErrorLogs = async (error) => 
{
    try {
        let result = await sendEMail({
            from: 'noreply@medicloud.sg',
            // from: 'testmednefits@yopmail.com',
            // to: 'testmednefits@yopmail.com',
            to: 'developer.mednefits@gmail.com',
            subject: error.emailSubject,
            text: error.logs
        })
        
        return result;
        
    } catch (err) {
        console.warn(err)
    }
} 
/*
var mailData = {
    from: 'sender@server.com',
    to: 'receiver@sender.com',
    subject: 'Message title',
    text: 'Plaintext version of the message',
    html: 'HTML version of the message'
};
*/
module.exports = {
    mailer: transporter,
    sendMail: sendMail,
    sendErrorLogs: sendErrorLogs
}
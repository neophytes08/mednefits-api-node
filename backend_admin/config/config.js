require('dotenv').config();
const cloudinary = require('cloudinary');
const mailer = require('nodemailer');
const aws = require('aws-sdk');
const fs = require('fs');
const APPPATH = require('app-root-path');

var multer  = require('multer')
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
      
    let arr = (file.originalname).split(".")
    
    if(typeof req.fileExtension != 'undefined')
    {
        if(!req.fileExtension.includes(arr[arr.length -1]))
        {
            req.fileIsAllowed = false;
            cb(null, `${APPPATH}/views/uploads/unauthorized`);
        }
        else
        {
            req.fileIsAllowed = true;
            cb(null, `${APPPATH}/views/uploads/tmp`);
        }
    }
    else
    {
        req.fileIsAllowed = true;
        cb(null, `${APPPATH}/views/uploads/tmp`);
    }
  },
  filename: function (req, file, cb) {
    let arr = (file.originalname).split(".");
    let fileName = file.fieldname + '-' + Date.now() + '.' + arr[arr.length -1];
    req.serverFileName = fileName
    cb(null, fileName );
  }
})

var upload = multer({ storage: storage });

require('dotenv');
// const mongoose = require('mongoose');
// const Promise = require('bluebird')
// var schemaGen = require('mongo-schema-gen');
// const {map} = require('p-iteration')

// let Models = new Object();

/** 
 * Cloudinary Configuration
*/
// cloudinary.v2.uploader.upload(fileElement.path)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * AWS Configuration
 */
aws.config.update({
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    accessKeyId: process.env.AWS_ACCESS_KEY,
    region: process.env.AWS_REGION
});

var photoBucket = new aws.S3({params: {Bucket: process.env.AWS_BUCKET}});

async function uploadToS3(file, subFolder) {
    
    subFolder = subFolder || "dummy/"

    return await photoBucket
        .upload({
            ACL: 'public-read', 
            Body: fs.createReadStream(file.path), 
            Key: subFolder + moment().format('hhmmssA') + "-" + file.originalname
        })

}

module.exports = {
    jwtSecret: process.env.USER_SECRET_KEY
    ,cloudinary: cloudinary.v2.uploader
    ,mailer: mailer.createTransport({
      service: process.env.MAIL_SERVICE,
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS
      }
    }),
    uploadToS3: uploadToS3,
    uploadTemp: multer({ storage: storage })
}

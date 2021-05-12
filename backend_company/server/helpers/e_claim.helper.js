const AWS = require('aws-sdk')
const s3 = new AWS.S3()
AWS.config.update({accessKeyId: process.env.AWS_ACCESS_KEY, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY})

const myBucket = 'mednefits/receipts';
const signedUrlExpireSeconds = 60 * 5;

const getPresignedUrl = async (data) => {
    const url = s3.getSignedUrl('getObject', {
	    Bucket: myBucket,
	    Key: data,
	    Expires: signedUrlExpireSeconds
	})
	return url;
}

module.exports = {
    getPresignedUrl
}

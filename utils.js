const aws = require('aws-sdk');

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const async = require('async');


const BACKUP_DIR = './backups';
const DATABASE_BASE = process.env.DATABASE_BASE

const bucketName = process.env.S3_BUCKET_NAME;
const userKey = process.env.S3_USER_KEY;
const userSecret = process.env.S3_USER_SECRET;

const s3Bucket = new aws.S3({
  accessKeyId: userKey,
  secretAccessKey: userSecret,
  Bucket: bucketName,
});

const uploadToS3 = function uploadToS3(file, fileName, callback) {
  s3Bucket.upload({
    Bucket: bucketName,
    Key: fileName,
    Body: file
  }, (err, data) => {
    if (err) {
      return callback(err);
    }
    return callback(null, data);
  })
}

module.exports = {
  backupDatabases(langs, callback) {
    const backupFuncArray = [];
    langs.forEach(lang => {
      function backupDB(cb) {
        // First we dump the current database
        // Upload to s3 
        const today = new Date();
        const backupName = `videowiki-${lang}__${today.getMonth() + 1}-${today.getDate()}-${today.getFullYear()}-${Date.now()}__gzipped_compressed`;
        const outPath = path.resolve(__dirname, BACKUP_DIR, lang, backupName);
        const command = `mongodump --uri ${DATABASE_BASE}-${lang} --archive=${outPath}`
        console.log('backing up database ', command);
        exec(command, (err, stdout, stderr) => {
          if (err || !fs.existsSync(outPath)) {
            return cb();
          }
          console.log('backup succesfull, uploading to s3')
          uploadToS3(fs.createReadStream(outPath), `${lang}/${backupName}`, (err, data) => {
            console.log('Uploaded to s3', data);
            fs.unlink(outPath, () => {});
            cb();
          })
        })

      }
      backupFuncArray.push(backupDB);
    })

    async.series(backupFuncArray, (err, result) => {
      return callback(err, result);
    })
  },

  cleanupBucket(callback) {
    s3Bucket.listObjects({
      Bucket: bucketName,
    }, (err, objects) => {
      const lastWeekDate = new Date();
      const toBeDeletedKeys = [];
      lastWeekDate.setDate(lastWeekDate.getDate() - 7);
      objects.Contents.forEach(element => {
        if (new Date(element.LastModified).getTime() < lastWeekDate.getTime()) {
          toBeDeletedKeys.push({
            Key: element.Key
          });
        }
      });

      if (toBeDeletedKeys.length > 0) {
        s3Bucket.deleteObjects({
          Bucket: bucketName,
          Delete: {
            Objects: toBeDeletedKeys,
            Quiet: false,
          },
        }, (err, data) => {
          if (err) return callback(err);
          return callback(null, data);
        })
      } else {
        return callback(null);
      }
    })

  }
}
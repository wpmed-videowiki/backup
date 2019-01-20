

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
        const command = `mongodump --uri ${DATABASE_BASE}-${lang} --gzip --archive=${outPath}`
        // console.log(command)
        exec(command, (err, stdout, stderr) => {
          if (err || !fs.existsSync(outPath)) {
            console.log('error creating a backup', err, stderr)
            return cb();
          }

          utils.uploadToS3(fs.createReadStream(outPath), `${lang}/${backupName}`, (err, data) => {
            console.log(err, data);
            cb();
          })
        })

      }
      backupFuncArray.push(backupDB);
    })
    async.series(backupFuncArray, (err, result) => {

    })
  },

  cleanupBucket(callback) {
    s3Bucket.listObjects({
      Bucket: bucketName,
    }, (err, objects) => {
      // console.log(err, objects)
      const lastWeekDate = new Date();
      const toBeDeletedKeys = [];
      lastWeekDate.setDate(lastWeekDate.getDate() - 7);

      objects.Contents.forEach(element => {
        if (new Date(element.LastModified).getTime() < lastWeekDate.getTime()) {
          toBeDeletedKeys.push({
            Key: element.Key
          });
        }
        console.log(new Date(element.LastModified).getTime());
      });

      if (toBeDeletedKeys.length > 0) {
        console.log('deleting old backups', toBeDeletedKeys);
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
const {
  exec
} = require('child_process');
const fs = require('fs');
const path = require('path');
const async = require('async');

const BACKUP_DIR = './backups';
const langs = ['en', 'hi', 'es', 'fr'];
require('dotenv').config({ path: '.env' })
const DATABASE_BASE = process.env.DATABASE_BASE

// Create necessary directories
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR);
}

langs.forEach(lang => {
  if (!fs.existsSync(path.resolve(__dirname, BACKUP_DIR, lang))) {
    fs.mkdirSync(path.resolve(__dirname, BACKUP_DIR, lang));
  }
})


const backupFuncArray = [];

langs.forEach(lang => {

  function backupDB(cb) {
    // First we dump the current database
    // Upload to s3 
    const today = new Date();
    const backupName = `videowiki-${lang}__${today.getMonth() + 1}-${today.getDate()}-${today.getFullYear()}-${Date.now()}`;
    const outPath = path.resolve(__dirname, BACKUP_DIR, lang, backupName  );
    const command = `mongodump --uri ${DATABASE_BASE}-${lang} --gzip --archive=${outPath}__compressed`
    console.log(command)
    exec(command, (err, stdout, stderr) => {
      if (err || stderr) {
        console.log('error creating a backup', err, stderr)
        return cb();
      }

      cb();

    })

  }
  backupFuncArray.push(backupDB);
})

async.series(backupFuncArray, (err, result) => {

})
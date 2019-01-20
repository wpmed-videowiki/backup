require('dotenv').config({
  path: '.env'
})
const fs = require('fs');
const path = require('path');
const { CronJob } = require('cron');
const utils = require('./utils');

const BACKUP_DIR = './backups';
const langs = ['en', 'hi', 'es', 'fr'];

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

const job = new CronJob({
  cronTime: '00 12 * * *',
  onTick: function() {
        
    utils.backupDatabases(langs, (err, result) => {
      console.log('backup results', err, result);
      utils.cleanupBucket((err, data) => {
        console.log('cleanup results', err, data);
      })
    });
  },
  timeZone: 'Asia/Kolkata'
});

job.start();
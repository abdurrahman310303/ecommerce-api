const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const crypto = require('crypto');
const BackupLog = require('../models/BackupLog');

const execAsync = promisify(exec);

const createDatabaseBackup = async (userId = null) => {
  const backupLog = new BackupLog({
    type: 'database',
    triggeredBy: userId ? 'manual' : 'scheduled',
    userId
  });

  try {
    await backupLog.save();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');
    const backupPath = path.join(backupDir, `db-backup-${timestamp}.gz`);

    await fs.mkdir(backupDir, { recursive: true });

    const mongoUri = process.env.MONGO_URI;
    const dbName = mongoUri.split('/').pop();

    backupLog.status = 'in_progress';
    backupLog.filePath = backupPath;
    await backupLog.save();

    const command = `mongodump --uri="${mongoUri}" --gzip --archive="${backupPath}"`;
    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stderr.includes('writing')) {
      throw new Error(`Backup failed: ${stderr}`);
    }

    const stats = await fs.stat(backupPath);
    const fileBuffer = await fs.readFile(backupPath);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    backupLog.status = 'completed';
    backupLog.endTime = new Date();
    backupLog.duration = backupLog.endTime - backupLog.startTime;
    backupLog.fileSize = stats.size;
    backupLog.metadata = {
      checksumHash: checksum
    };

    await backupLog.save();

    console.log(`Database backup completed: ${backupPath}`);
    return backupLog;

  } catch (error) {
    backupLog.status = 'failed';
    backupLog.errorMessage = error.message;
    backupLog.endTime = new Date();
    await backupLog.save();

    console.error('Database backup failed:', error);
    throw error;
  }
};

const restoreDatabase = async (backupPath, userId = null) => {
  try {
    const exists = await fs.access(backupPath).then(() => true).catch(() => false);
    if (!exists) {
      throw new Error('Backup file not found');
    }

    const mongoUri = process.env.MONGO_URI;
    const command = `mongorestore --uri="${mongoUri}" --gzip --archive="${backupPath}" --drop`;
    
    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stderr.includes('successfully restored')) {
      throw new Error(`Restore failed: ${stderr}`);
    }

    console.log('Database restore completed successfully');
    return { success: true, message: 'Database restored successfully' };

  } catch (error) {
    console.error('Database restore failed:', error);
    throw error;
  }
};

const createFilesBackup = async (userId = null) => {
  const backupLog = new BackupLog({
    type: 'files',
    triggeredBy: userId ? 'manual' : 'scheduled',
    userId
  });

  try {
    await backupLog.save();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');
    const backupPath = path.join(backupDir, `files-backup-${timestamp}.tar.gz`);

    await fs.mkdir(backupDir, { recursive: true });

    backupLog.status = 'in_progress';
    backupLog.filePath = backupPath;
    await backupLog.save();

    const uploadsDir = path.join(process.cwd(), 'uploads');
    const command = `tar -czf "${backupPath}" -C "${uploadsDir}" . 2>/dev/null || true`;
    
    await execAsync(command);

    const stats = await fs.stat(backupPath);
    
    if (stats.size === 0) {
      await fs.unlink(backupPath);
      throw new Error('No files to backup');
    }

    const fileBuffer = await fs.readFile(backupPath);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    backupLog.status = 'completed';
    backupLog.endTime = new Date();
    backupLog.duration = backupLog.endTime - backupLog.startTime;
    backupLog.fileSize = stats.size;
    backupLog.metadata = {
      checksumHash: checksum
    };

    await backupLog.save();

    console.log(`Files backup completed: ${backupPath}`);
    return backupLog;

  } catch (error) {
    backupLog.status = 'failed';
    backupLog.errorMessage = error.message;
    backupLog.endTime = new Date();
    await backupLog.save();

    console.error('Files backup failed:', error);
    throw error;
  }
};

const listBackups = async (type = null) => {
  try {
    const filter = {};
    if (type) filter.type = type;

    const backups = await BackupLog.find(filter)
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(50);

    return backups;
  } catch (error) {
    throw error;
  }
};

const deleteBackup = async (backupId) => {
  try {
    const backup = await BackupLog.findById(backupId);
    if (!backup) {
      throw new Error('Backup not found');
    }

    if (backup.filePath) {
      try {
        await fs.unlink(backup.filePath);
      } catch (error) {
        console.warn('Could not delete backup file:', error.message);
      }
    }

    await BackupLog.findByIdAndDelete(backupId);
    return { success: true, message: 'Backup deleted successfully' };
  } catch (error) {
    throw error;
  }
};

const cleanupOldBackups = async (daysToKeep = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const oldBackups = await BackupLog.find({
      createdAt: { $lt: cutoffDate }
    });

    let deletedCount = 0;
    let freedSpace = 0;

    for (const backup of oldBackups) {
      try {
        if (backup.filePath) {
          const stats = await fs.stat(backup.filePath).catch(() => null);
          if (stats) {
            freedSpace += stats.size;
            await fs.unlink(backup.filePath);
          }
        }
        
        await BackupLog.findByIdAndDelete(backup._id);
        deletedCount++;
      } catch (error) {
        console.warn(`Failed to delete backup ${backup._id}:`, error.message);
      }
    }

    console.log(`Cleaned up ${deletedCount} old backups, freed ${(freedSpace / 1024 / 1024).toFixed(2)} MB`);
    
    return {
      deletedCount,
      freedSpace
    };
  } catch (error) {
    throw error;
  }
};

const scheduleBackups = () => {
  const cron = require('node-cron');

  cron.schedule('0 2 * * *', async () => {
    console.log('Running scheduled database backup...');
    try {
      await createDatabaseBackup();
    } catch (error) {
      console.error('Scheduled database backup failed:', error);
    }
  });

  cron.schedule('0 3 * * 0', async () => {
    console.log('Running scheduled files backup...');
    try {
      await createFilesBackup();
    } catch (error) {
      console.error('Scheduled files backup failed:', error);
    }
  });

  cron.schedule('0 4 * * 0', async () => {
    console.log('Running backup cleanup...');
    try {
      await cleanupOldBackups();
    } catch (error) {
      console.error('Backup cleanup failed:', error);
    }
  });

  console.log('Backup schedules initialized');
};

module.exports = {
  createDatabaseBackup,
  restoreDatabase,
  createFilesBackup,
  listBackups,
  deleteBackup,
  cleanupOldBackups,
  scheduleBackups
};

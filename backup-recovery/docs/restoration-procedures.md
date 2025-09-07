# 🔄 QoderResume Database & File Restoration Procedures

## 📋 **Quick Reference**

### **Emergency Contacts**
- **Lead DevOps**: [Contact Details]
- **Database Admin**: [Contact Details]  
- **System Admin**: [Contact Details]
- **Security Team**: [Contact Details]

### **Critical Information**
- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour
- **Backup Location**: `/var/backups/qoder-resume`
- **Cloud Storage**: `s3://qoder-resume-backups`

---

## 🚨 **Emergency Response Checklist**

### **Immediate Actions (0-15 minutes)**
- [ ] **Assess the situation** - Determine scope and impact
- [ ] **Notify stakeholders** - Alert team and management
- [ ] **Stop further damage** - Isolate affected systems if needed
- [ ] **Document the incident** - Start incident log
- [ ] **Activate recovery team** - Contact key personnel

### **Damage Assessment (15-30 minutes)**
- [ ] **Identify affected systems** - Database, files, application
- [ ] **Determine data loss extent** - Last known good state
- [ ] **Check backup availability** - Verify recent backups
- [ ] **Estimate recovery time** - Plan restoration approach
- [ ] **Communicate status** - Update stakeholders

---

## 🗄️ **Database Restoration Procedures**

### **Scenario 1: Complete Database Loss**

#### **Prerequisites**
- Backup files available (local or cloud)
- Database server running and accessible
- Appropriate permissions and credentials
- Network connectivity to backup storage

#### **Step-by-Step Process**

**Step 1: Prepare Environment**
```bash
# 1. Stop application services
sudo systemctl stop qoder-resume

# 2. Verify database server is running
sudo systemctl status postgresql

# 3. Create restoration workspace
sudo mkdir -p /tmp/qoder-restore
cd /tmp/qoder-restore
```

**Step 2: Locate and Download Backup**
```bash
# Find latest backup locally
LATEST_BACKUP=$(find /var/backups/qoder-resume/database -name "*.backup" | sort -r | head -n 1)

# If not available locally, download from cloud
if [[ -z "$LATEST_BACKUP" ]]; then
    aws s3 sync s3://qoder-resume-backups/database/latest/ ./
    LATEST_BACKUP=$(find . -name "*.backup" | head -n 1)
fi

echo "Using backup: $LATEST_BACKUP"
```

**Step 3: Restore Database**
```bash
# Set database password
export PGPASSWORD="your_db_password"

# Drop existing database (if exists)
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS qoder_resume;"

# Create new database
psql -h localhost -U postgres -c "CREATE DATABASE qoder_resume OWNER postgres;"

# Restore from backup
pg_restore -h localhost -U postgres -d qoder_resume --verbose --jobs=4 "$LATEST_BACKUP"

# Verify restoration
psql -h localhost -U postgres -d qoder_resume -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
```

**Step 4: Post-Restoration Validation**
```bash
# Update database statistics
psql -h localhost -U postgres -d qoder_resume -c "ANALYZE;"

# Check critical tables
psql -h localhost -U postgres -d qoder_resume -c "
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables
ORDER BY schemaname, tablename;
"

# Restart application services
sudo systemctl start qoder-resume

# Test application connectivity
curl -f http://localhost:3001/api/health
```

### **Scenario 2: Point-in-Time Recovery (PITR)**

#### **When to Use PITR**
- Accidental data deletion or corruption
- Need to restore to specific time before incident
- Transaction log backups available

#### **PITR Process**
```bash
# 1. Stop PostgreSQL
sudo systemctl stop postgresql

# 2. Backup current data directory
sudo mv /var/lib/postgresql/data /var/lib/postgresql/data.backup

# 3. Restore base backup
sudo mkdir /var/lib/postgresql/data
sudo tar -xzf /var/backups/qoder-resume/base_backup/base.tar.gz -C /var/lib/postgresql/data

# 4. Configure recovery
sudo tee /var/lib/postgresql/data/recovery.conf << EOF
restore_command = 'cp /var/backups/qoder-resume/wal/%f %p'
recovery_target_time = '2024-12-01 14:30:00'
recovery_target_action = 'promote'
EOF

# 5. Set permissions and start PostgreSQL
sudo chown -R postgres:postgres /var/lib/postgresql/data
sudo chmod 700 /var/lib/postgresql/data
sudo systemctl start postgresql

# 6. Monitor recovery progress
sudo tail -f /var/log/postgresql/postgresql.log
```

### **Scenario 3: Partial Data Recovery**

#### **Single Table Restoration**
```bash
# 1. Create temporary database
psql -h localhost -U postgres -c "CREATE DATABASE temp_restore;"

# 2. Restore backup to temporary database
pg_restore -h localhost -U postgres -d temp_restore "$LATEST_BACKUP"

# 3. Extract specific table data
pg_dump -h localhost -U postgres -d temp_restore -t specific_table --data-only > table_data.sql

# 4. Restore to main database
psql -h localhost -U postgres -d qoder_resume -f table_data.sql

# 5. Cleanup
psql -h localhost -U postgres -c "DROP DATABASE temp_restore;"
```

---

## 📁 **File Storage Restoration**

### **Scenario 1: Complete File Loss**

#### **Step-by-Step Process**

**Step 1: Prepare Environment**
```bash
# 1. Stop application
sudo systemctl stop qoder-resume

# 2. Create restoration directory
sudo mkdir -p /restore/files
cd /restore/files
```

**Step 2: Download File Backup**
```bash
# Find latest file backup
LATEST_FILE_BACKUP=$(find /var/backups/qoder-resume/files -name "*.tar.gz" | sort -r | head -n 1)

# If not available locally, download from cloud
if [[ -z "$LATEST_FILE_BACKUP" ]]; then
    aws s3 sync s3://qoder-resume-backups/files/latest/ ./
    LATEST_FILE_BACKUP=$(find . -name "*.tar.gz" | head -n 1)
fi

echo "Using file backup: $LATEST_FILE_BACKUP"
```

**Step 3: Extract and Restore Files**
```bash
# Extract backup
tar -xzf "$LATEST_FILE_BACKUP"

# Verify extraction
find . -type f | head -20

# Restore to application directory
sudo rsync -av ./uploads/ /app/uploads/
sudo rsync -av ./storage/ /app/storage/

# Set proper permissions
sudo chown -R qoder-app:qoder-app /app/uploads /app/storage
sudo chmod -R 755 /app/uploads /app/storage
```

**Step 4: Validation**
```bash
# Check file counts
echo "Upload files: $(find /app/uploads -type f | wc -l)"
echo "Storage files: $(find /app/storage -type f | wc -l)"

# Verify checksums if available
if [[ -f checksums.sha256 ]]; then
    cd /app && sha256sum -c /restore/files/checksums.sha256
fi

# Restart application
sudo systemctl start qoder-resume
```

### **Scenario 2: Selective File Recovery**

#### **Single Directory Restoration**
```bash
# 1. Extract specific directory from backup
tar -xzf "$LATEST_FILE_BACKUP" uploads/user_123/

# 2. Restore specific user's files
sudo rsync -av uploads/user_123/ /app/uploads/user_123/

# 3. Set permissions
sudo chown -R qoder-app:qoder-app /app/uploads/user_123/
```

---

## ⚙️ **Redis Cache Restoration**

### **Scenario 1: Redis Data Loss**

#### **Step-by-Step Process**
```bash
# 1. Stop Redis
sudo systemctl stop redis

# 2. Find latest Redis backup
LATEST_REDIS_BACKUP=$(find /var/backups/qoder-resume/redis -name "*.rdb" | sort -r | head -n 1)

# 3. Copy backup to Redis data directory
sudo cp "$LATEST_REDIS_BACKUP" /var/lib/redis/dump.rdb

# 4. Set proper permissions
sudo chown redis:redis /var/lib/redis/dump.rdb
sudo chmod 660 /var/lib/redis/dump.rdb

# 5. Start Redis
sudo systemctl start redis

# 6. Verify data restoration
redis-cli info keyspace
```

---

## 🔧 **Configuration Restoration**

### **Application Configuration Recovery**

#### **Environment Variables**
```bash
# 1. Restore .env file from backup
cp /var/backups/qoder-resume/config/latest/.env /app/.env

# 2. Restore Docker configurations
cp /var/backups/qoder-resume/config/latest/docker-compose.yml /app/

# 3. Restore SSL certificates
sudo cp -r /var/backups/qoder-resume/config/latest/ssl/ /etc/nginx/ssl/

# 4. Restart services
sudo systemctl restart nginx
sudo systemctl restart qoder-resume
```

---

## 🧪 **Testing Restored Systems**

### **Database Testing**
```bash
# 1. Connection test
psql -h localhost -U postgres -d qoder_resume -c "SELECT version();"

# 2. Data integrity check
psql -h localhost -U postgres -d qoder_resume -c "
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_users
FROM users;
"

# 3. Application-specific tests
psql -h localhost -U postgres -d qoder_resume -c "
SELECT COUNT(*) FROM resumes;
SELECT COUNT(*) FROM job_applications;
SELECT COUNT(*) FROM users WHERE is_active = true;
"
```

### **Application Testing**
```bash
# 1. Health check
curl -f http://localhost:3001/api/health

# 2. Authentication test
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"testpass"}'

# 3. File upload test
curl -X POST http://localhost:3001/api/resume/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_resume.pdf"

# 4. Database connectivity test
curl -f http://localhost:3001/api/resume/list \
  -H "Authorization: Bearer $TOKEN"
```

### **Performance Testing**
```bash
# 1. Response time test
for i in {1..10}; do
    curl -w "%{time_total}\n" -o /dev/null -s http://localhost:3001/api/health
done

# 2. Database query performance
psql -h localhost -U postgres -d qoder_resume -c "
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
"

# 3. File access test
ls -la /app/uploads/ | head -10
```

---

## 📊 **Recovery Validation Checklist**

### **Critical Systems Check**
- [ ] **Database connectivity** - Application can connect
- [ ] **User authentication** - Login/logout works
- [ ] **File uploads** - Resume upload functional
- [ ] **AI processing** - Resume analysis works
- [ ] **Job tracking** - Job application CRUD operations
- [ ] **Admin dashboard** - Administrative functions
- [ ] **Email notifications** - System emails working
- [ ] **Background jobs** - Queue processing active

### **Data Integrity Check**
- [ ] **User count matches** - No missing user accounts
- [ ] **Resume files accessible** - All uploads available
- [ ] **Job applications intact** - Application history preserved
- [ ] **System logs present** - Recent activity logged
- [ ] **Configuration correct** - Environment variables set
- [ ] **Permissions proper** - File/directory permissions
- [ ] **SSL certificates valid** - HTTPS working
- [ ] **Database constraints** - Referential integrity maintained

### **Performance Validation**
- [ ] **Response times normal** - API endpoints responsive
- [ ] **Database queries fast** - No performance degradation
- [ ] **File access quick** - Upload/download speeds normal
- [ ] **Memory usage stable** - No memory leaks
- [ ] **CPU usage normal** - System not overloaded
- [ ] **Disk space adequate** - Sufficient storage available
- [ ] **Network connectivity** - External services accessible
- [ ] **Cache performance** - Redis responding normally

---

## 🚨 **Rollback Procedures**

### **When to Rollback**
- Restoration causes data corruption
- Application functionality severely impacted
- Performance significantly degraded
- Critical security vulnerabilities introduced

### **Rollback Steps**
```bash
# 1. Stop application immediately
sudo systemctl stop qoder-resume

# 2. Restore from pre-restoration backup
psql -h localhost -U postgres -c "DROP DATABASE qoder_resume;"
psql -h localhost -U postgres -c "CREATE DATABASE qoder_resume;"
pg_restore -h localhost -U postgres -d qoder_resume /tmp/pre_restore_backup.sql

# 3. Restore previous file state
sudo rm -rf /app/uploads /app/storage
sudo mv /app/uploads.backup /app/uploads
sudo mv /app/storage.backup /app/storage

# 4. Restore previous configuration
sudo cp /app/.env.backup /app/.env

# 5. Restart services
sudo systemctl start qoder-resume

# 6. Verify rollback success
curl -f http://localhost:3001/api/health
```

---

## 📝 **Documentation Requirements**

### **Incident Documentation**
1. **Incident Details**
   - Time of discovery
   - Root cause analysis
   - Impact assessment
   - Systems affected

2. **Recovery Actions**
   - Steps taken
   - Time to restore
   - Data loss (if any)
   - Lessons learned

3. **Validation Results**
   - Test results
   - Performance metrics
   - User feedback
   - System monitoring

### **Post-Incident Report**
- Executive summary
- Technical details
- Preventive measures
- Process improvements
- Team training needs

---

## 🔄 **Continuous Improvement**

### **Regular Reviews**
- Monthly restoration drills
- Quarterly procedure updates
- Annual disaster recovery testing
- Ongoing staff training

### **Process Optimization**
- Automation opportunities
- Recovery time improvements
- Documentation updates
- Tool upgrades

---

**Document Version**: 1.0  
**Last Updated**: 2025-09-07  
**Next Review**: 2025-12-07  
**Approved By**: Infrastructure Team Lead
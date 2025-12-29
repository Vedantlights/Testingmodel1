# Google Cloud Vision API Credentials - Setup Complete ✅

## ✅ **Credentials Path Configured**

### **Production Path** (Hostinger Shared Hosting):
```
/home/u123456789/domains/demo1.indiapropertys.com/secure/indiapropertys-8fab286d41e4.json
```

### **Configuration Updated**:
- **File**: `backend/config/config.php`
- **Status**: ✅ **Configured to use production path**

---

## 🔧 **How It Works**

### **Path Resolution Order**:
1. **First**: Checks `GOOGLE_APPLICATION_CREDENTIALS` environment variable
2. **Second**: Uses production path: `/home/u123456789/domains/demo1.indiapropertys.com/secure/indiapropertys-8fab286d41e4.json`
3. **Fallback**: Uses local development path: `backend/config/google-cloud-credentials.json`

### **Code Logic**:
```php
// 1. Check environment variable first
$googleCredentialsPath = getenv('GOOGLE_APPLICATION_CREDENTIALS');

// 2. If not set, use production path
if (empty($googleCredentialsPath)) {
    $googleCredentialsPath = '/home/u123456789/domains/demo1.indiapropertys.com/secure/indiapropertys-8fab286d41e4.json';
    
    // 3. Fallback to local if production path doesn't exist
    if (!file_exists($googleCredentialsPath)) {
        $googleCredentialsPath = __DIR__ . '/../config/google-cloud-credentials.json';
    }
}
```

---

## ✅ **Verification**

### **On Production Server**:
The code will automatically use:
```
/home/u123456789/domains/demo1.indiapropertys.com/secure/indiapropertys-8fab286d41e4.json
```

### **On Local Development**:
If the production path doesn't exist, it will fallback to:
```
backend/config/google-cloud-credentials.json
```

---

## 🔒 **Security Notes**

1. ✅ **Credentials file is in secure directory**: `/secure/` folder
2. ✅ **File is NOT in web-accessible directory**
3. ✅ **Path is hardcoded for production** (safe for shared hosting)
4. ⚠️ **File permissions**: Ensure file is readable by PHP process
   ```bash
   chmod 600 /home/u123456789/domains/demo1.indiapropertys.com/secure/indiapropertys-8fab286d41e4.json
   ```

---

## 🧪 **Testing**

### **Test if credentials are working**:
```php
// Create test file: backend/test-vision-api.php
<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/services/GoogleVisionService.php';

try {
    $vision = new GoogleVisionService();
    echo "✅ Google Vision API credentials are valid!\n";
    echo "✅ Credentials path: " . GOOGLE_APPLICATION_CREDENTIALS . "\n";
    echo "✅ File exists: " . (file_exists(GOOGLE_APPLICATION_CREDENTIALS) ? 'YES' : 'NO') . "\n";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
```

### **Check file permissions**:
```bash
# On production server
ls -la /home/u123456789/domains/demo1.indiapropertys.com/secure/indiapropertys-8fab286d41e4.json
```

---

## 📋 **Status**

- ✅ **Production path configured**: `/home/u123456789/domains/demo1.indiapropertys.com/secure/indiapropertys-8fab286d41e4.json`
- ✅ **Local fallback configured**: `backend/config/google-cloud-credentials.json`
- ✅ **Environment variable support**: Can override via `GOOGLE_APPLICATION_CREDENTIALS` env var
- ✅ **Google Vision API**: Should now work on production server

---

## 🚀 **Next Steps**

1. ✅ **Verify file exists** on production server
2. ✅ **Check file permissions** (should be readable by PHP)
3. ✅ **Test image upload** with moderation
4. ✅ **Monitor logs** for any credential errors

---

## ⚠️ **Troubleshooting**

### **If Google Vision API doesn't work**:

1. **Check file exists**:
   ```bash
   test -f /home/u123456789/domains/demo1.indiapropertys.com/secure/indiapropertys-8fab286d41e4.json && echo "File exists" || echo "File missing"
   ```

2. **Check file permissions**:
   ```bash
   ls -la /home/u123456789/domains/demo1.indiapropertys.com/secure/indiapropertys-8fab286d41e4.json
   ```

3. **Check PHP can read file**:
   ```php
   <?php
   $path = '/home/u123456789/domains/demo1.indiapropertys.com/secure/indiapropertys-8fab286d41e4.json';
   echo "File exists: " . (file_exists($path) ? 'YES' : 'NO') . "\n";
   echo "File readable: " . (is_readable($path) ? 'YES' : 'NO') . "\n";
   ```

4. **Check error logs**:
   - Look for "Google Cloud credentials file not found" errors
   - Check PHP error logs in Hostinger panel

---

## ✅ **Configuration Complete**

The Google Vision API is now configured to use your production credentials file. Image moderation should work on your production server!


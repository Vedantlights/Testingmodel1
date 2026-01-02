<?php
/**
 * Welcome Email Helper - MSG91 SMTP Implementation
 * Sends welcome emails using PHPMailer with MSG91 SMTP
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/welcome_email_template.php';

// Check if PHPMailer is available
// Using root vendor folder
$phpmailerPath = __DIR__ . '/../../vendor/autoload.php';
if (file_exists($phpmailerPath)) {
    require_once $phpmailerPath;
}

/**
 * Send welcome email using MSG91 SMTP (PHPMailer)
 * 
 * @param int $userId User ID
 * @param string $name User's full name
 * @param string $email User's email address
 * @return bool True if email sent successfully, false otherwise
 */
function sendWelcomeEmailViaSMTP($userId, $name, $email) {
    // Validate inputs
    if (empty($userId) || !is_numeric($userId)) {
        error_log("sendWelcomeEmailViaSMTP: Invalid user ID provided: " . $userId);
        return false;
    }
    
    if (empty($name) || empty($email)) {
        error_log("sendWelcomeEmailViaSMTP: Missing name or email for user ID: " . $userId);
        return false;
    }
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        error_log("sendWelcomeEmailViaSMTP: Invalid email format for user ID: " . $userId . ", Email: " . $email);
        return false;
    }
    
    // Check if PHPMailer is available
    if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        error_log("sendWelcomeEmailViaSMTP: PHPMailer class not found. Please install PHPMailer via Composer.");
        return false;
    }
    
    try {
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        
        // MSG91 SMTP Server settings
        $mail->isSMTP();
        $mail->Host = MSG91_SMTP_HOST;
        $mail->SMTPAuth = true;
        $mail->Username = MSG91_SMTP_USER;
        $mail->Password = MSG91_SMTP_PASS;
        $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = MSG91_SMTP_PORT;
        $mail->CharSet = 'UTF-8';
        $mail->SMTPDebug = 0; // Set to 2 for debugging (logs to error_log)
        $mail->SMTPOptions = array(
            'ssl' => array(
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            )
        );
        
        // Recipients
        $mail->setFrom(MSG91_SMTP_FROM_EMAIL, MSG91_SMTP_FROM_NAME);
        $mail->addAddress($email, $name);
        
        // Content
        $mail->isHTML(true);
        $mail->Subject = 'Welcome to India Propertys! 🏡';
        $mail->Body = generateWelcomeEmailTemplate($name, $email);
        $mail->AltBody = generateWelcomeEmailPlainText($name, $email);
        
        // Send email
        $mail->send();
        
        // Log success
        error_log("sendWelcomeEmailViaSMTP: Welcome email sent successfully to: $email (User ID: $userId)");
        
        // Update database status
        try {
            $db = getDB();
            if (!$db) {
                error_log("sendWelcomeEmailViaSMTP: Database connection failed for user ID: $userId");
                // Email was sent successfully, so return true even if DB update fails
                return true;
            }
            
            $stmt = $db->prepare("UPDATE users SET email_status = 'SENT', email_sent_at = NOW() WHERE id = ?");
            $stmt->execute([$userId]);
            
            // Log to email_logs (table may not exist in some setups, so catch errors)
            try {
                $stmt = $db->prepare("INSERT INTO email_logs (user_id, email_type, status, msg91_response) VALUES (?, 'welcome', 'SUCCESS', ?)");
                $stmt->execute([$userId, json_encode(['method' => 'SMTP', 'sent_at' => date('Y-m-d H:i:s')])]);
            } catch (Exception $logError) {
                // email_logs table might not exist - log but don't fail
                error_log("sendWelcomeEmailViaSMTP: Failed to log to email_logs table (table may not exist): " . $logError->getMessage());
            }
        } catch (Exception $dbError) {
            error_log("sendWelcomeEmailViaSMTP: Database update error for user ID $userId: " . $dbError->getMessage());
            // Don't fail if DB update fails - email was sent successfully
        }
        
        return true;
        
    } catch (\PHPMailer\PHPMailer\Exception $e) {
        // Email sending failed - capture detailed error
        $errorInfo = isset($mail) ? $mail->ErrorInfo : 'PHPMailer error info not available';
        $exceptionMessage = $e->getMessage();
        $errorMessage = "PHPMailer Error: $errorInfo | Exception: $exceptionMessage";
        
        error_log("sendWelcomeEmailViaSMTP: Failed to send welcome email to: $email (User ID: $userId)");
        error_log("sendWelcomeEmailViaSMTP: Error Details - $errorMessage");
        
        // Update database status
        try {
            $db = getDB();
            if ($db) {
                $stmt = $db->prepare("UPDATE users SET email_status = 'FAILED' WHERE id = ?");
                $stmt->execute([$userId]);
                
                // Log to email_logs with full error details (table may not exist)
                try {
                    $stmt = $db->prepare("INSERT INTO email_logs (user_id, email_type, status, error_message) VALUES (?, 'welcome', 'FAILED', ?)");
                    $stmt->execute([$userId, $errorMessage]);
                } catch (Exception $logError) {
                    error_log("sendWelcomeEmailViaSMTP: Failed to log to email_logs table: " . $logError->getMessage());
                }
            }
        } catch (Exception $dbError) {
            error_log("sendWelcomeEmailViaSMTP: Database update error for user ID $userId: " . $dbError->getMessage());
        }
        
        return false;
    } catch (Exception $e) {
        // General exception
        $errorMessage = "Exception: " . $e->getMessage() . " | File: " . $e->getFile() . " | Line: " . $e->getLine();
        error_log("sendWelcomeEmailViaSMTP: Exception - Failed to send welcome email to: $email (User ID: $userId) - " . $errorMessage);
        
        // Update database status
        try {
            $db = getDB();
            if ($db) {
                $stmt = $db->prepare("UPDATE users SET email_status = 'FAILED' WHERE id = ?");
                $stmt->execute([$userId]);
                
                // Log to email_logs (table may not exist)
                try {
                    $stmt = $db->prepare("INSERT INTO email_logs (user_id, email_type, status, error_message) VALUES (?, 'welcome', 'FAILED', ?)");
                    $stmt->execute([$userId, $errorMessage]);
                } catch (Exception $logError) {
                    error_log("sendWelcomeEmailViaSMTP: Failed to log to email_logs table: " . $logError->getMessage());
                }
            }
        } catch (Exception $dbError) {
            error_log("sendWelcomeEmailViaSMTP: Database update error for user ID $userId: " . $dbError->getMessage());
        }
        
        return false;
    }
}


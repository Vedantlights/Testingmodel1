<?php
// test-welcome-email-direct.php
// Purpose: Verify MSG91 Email API v5 with a minimal static template payload

require_once __DIR__ . '/../config/admin-config.php';

// ---- TEST VALUES ----
$testEmail = "sneha@vedantlights.com";
$testName  = "Sneha Test";

// ---- MSG91 API ENDPOINT ----
$url = "https://control.msg91.com/api/v5/email/send";

// ---- MINIMAL PAYLOAD (NO VARIABLES) ----
$payload = [
    "recipients" => [
        [
            "to" => [
                [
                    "email" => $testEmail,
                    "name"  => $testName
                ]
            ]
        ]
    ],
    "from" => [
        "email" => MSG91_EMAIL_FROM_EMAIL,
        "name"  => "IndiaPropertys"
    ],
    "domain" => MSG91_EMAIL_DOMAIN,
    "template_id" => MSG91_WELCOME_TEMPLATE_ID
];

// ---- CURL SETUP ----
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'authkey: ' . MSG91_EMAIL_AUTH_KEY  // Correct constant for Email API
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($response === false) {
    echo "CURL ERROR: " . curl_error($ch);
    curl_close($ch);
    exit;
}

curl_close($ch);

// ---- OUTPUT ----
echo "HTTP CODE: " . $httpCode . PHP_EOL;
echo "RAW RESPONSE:" . PHP_EOL;
echo $response . PHP_EOL;

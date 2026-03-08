<?php
$json = json_decode(file_get_contents('firebase-service-account.json'), true);
if (!is_array($json) || empty($json['client_email'])) {
    echo "ERROR: Firebase credentials file is missing or invalid (no client_email)\n";
    exit(1);
}
echo "OK: client_email = " . $json['client_email'] . "\n";

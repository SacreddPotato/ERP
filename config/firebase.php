<?php

return [
    'credentials' => base_path(env('FIREBASE_CREDENTIALS', 'firebase-service-account.json')),
    'project_id' => env('FIREBASE_PROJECT_ID', 'warehousestocklogger'),
];

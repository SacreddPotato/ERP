<?php

return [
    'version' => env('APP_VERSION', '2.0'),
    'delete_password' => env('DELETE_PASSWORD', '2048'),

    'factories' => [
        'bahbit',
        'old_factory',
        'station',
        'thaabaneya',
    ],

    'default_factory' => 'bahbit',
];

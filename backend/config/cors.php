<?php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter([
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'https://localhost:3000',
        'https://127.0.0.1:3000',
        'https://localhost:5173',
        env('FRONTEND_URL'),
        env('APP_URL'),
    ])),

    'allowed_origins_patterns' => [
        '#^https://.*\.vercel\.app$#',
        '#^https://.*\.vercel\.app/.*$#',
        '#^https://.*\.netlify\.app$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['Authorization', 'Content-Type', 'Accept'],

    'max_age' => 600,

    'supports_credentials' => true,

];


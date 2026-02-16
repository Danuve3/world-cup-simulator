<?php
/**
 * Cache endpoint — receives computed tournament history and saves it.
 * Optional optimization for shared hosting (cPanel).
 *
 * POST /api/cache-history.php
 * Body: JSON array of tournament summaries
 *
 * GET /api/cache-history.php
 * Returns cached JSON or empty array
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$cacheDir = __DIR__ . '/cache';
$cacheFile = $cacheDir . '/history.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($cacheFile)) {
        readfile($cacheFile);
    } else {
        echo '[]';
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if ($data === null) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        exit;
    }

    if (!is_dir($cacheDir)) {
        mkdir($cacheDir, 0755, true);
    }

    file_put_contents($cacheFile, json_encode($data));
    echo json_encode(['ok' => true, 'cached' => count($data)]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);

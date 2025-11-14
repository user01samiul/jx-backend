<?php
/**
 * Server.php - Bridge to Node.js Game Server
 *
 * This file replaces the VanguardLTE Server.php and forwards all requests
 * to the new Node.js game logic server at /api/jxoriginals/game
 */

// Log incoming request for debugging
error_log('[SERVER.PHP] Incoming request - Method: ' . $_SERVER['REQUEST_METHOD']);
error_log('[SERVER.PHP] GET: ' . json_encode($_GET));
error_log('[SERVER.PHP] POST: ' . json_encode($_POST));

// Get POST data - try multiple methods to capture body
$postData = $_POST;

// If POST is empty, try to read raw input
if (empty($postData)) {
    $rawInput = file_get_contents('php://input');
    error_log('[SERVER.PHP] Raw input: ' . $rawInput);

    // Try to parse as JSON
    if (!empty($rawInput)) {
        $jsonData = json_decode($rawInput, true);
        if ($jsonData !== null) {
            $postData = $jsonData;
        } else {
            // Try to parse as form data
            parse_str($rawInput, $postData);
        }
    }
}

// Get token from query string or POST
$token = isset($_GET['token']) ? $_GET['token'] : (isset($postData['token']) ? $postData['token'] : '');

// Get game code from query string
$game = isset($_GET['game']) ? $_GET['game'] : 'aztec_gold_megaways';

// Get session_id from query string (for debugging)
$sessionId = isset($_GET['session_id']) ? $_GET['session_id'] : '';

error_log('[SERVER.PHP] Parsed data - Token: ' . substr($token, 0, 20) . '... Game: ' . $game);
error_log('[SERVER.PHP] POST data to forward: ' . json_encode($postData));

// Forward request to Node.js server
$nodeUrl = 'https://backend.jackpotx.net/api/jxoriginals/game?game=' . urlencode($game);

// Prepare curl request
$ch = curl_init($nodeUrl);

// Determine content type and format
$contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : 'application/x-www-form-urlencoded';

// Set options
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);

// Send as JSON if original request was JSON
if (strpos($contentType, 'application/json') !== false) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $token
    ]);
} else {
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/x-www-form-urlencoded',
        'Authorization: Bearer ' . $token
    ]);
}

curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For development

// Execute request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);

error_log('[SERVER.PHP] Node.js response code: ' . $httpCode);
error_log('[SERVER.PHP] Node.js response body: ' . substr($response, 0, 500));
if ($error) {
    error_log('[SERVER.PHP] CURL error: ' . $error);
}

curl_close($ch);

// Handle errors
if ($error) {
    http_response_code(500);
    echo json_encode([
        'responseEvent' => 'error',
        'responseType' => '',
        'serverResponse' => 'Server communication error: ' . $error
    ]);
    exit;
}

// Forward response
http_response_code($httpCode);
header('Content-Type: application/json');
echo $response;

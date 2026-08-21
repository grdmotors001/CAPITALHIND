<?php
require_once __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function reply($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

$raw = json_decode(file_get_contents('php://input'), true);
if (!is_array($raw)) $raw = $_POST;
$identifier = trim((string)($raw['identifier'] ?? ''));
$password = (string)($raw['password'] ?? '');

if ($identifier === '' || $password === '') reply(['success' => false, 'error' => 'Username/mobile and password are required.'], 422);

try {
    $pdo = get_db();
    $stmt = $pdo->prepare('SELECT id, username, role, contact_mobile, email, password_hash FROM admin_users WHERE username = :u OR contact_mobile = :m LIMIT 1');
    $stmt->execute([':u' => $identifier, ':m' => $identifier]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        reply(['success' => false, 'error' => 'Invalid admin/staff credentials.'], 401);
    }

    session_regenerate_id(true);
    $_SESSION['admin_id'] = (int)$user['id'];
    $_SESSION['admin_username'] = $user['username'];
    $_SESSION['admin_role'] = $user['role'];
    csrf_token();

    reply(['success' => true, 'user' => [
        'id' => (int)$user['id'],
        'name' => $user['username'],
        'username' => $user['username'],
        'phone' => $user['contact_mobile'],
        'email' => $user['email'],
        'role' => $user['role'],
    ]]);
} catch (Throwable $e) {
    reply(['success' => false, 'error' => 'Login service is unavailable.'], 500);
}

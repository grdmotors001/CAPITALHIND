<?php
// JSON API used by the React Admin > Manage Staff screen.
require_once __DIR__ . '/auth.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function json_out($payload, $status = 200) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

if (empty($_SESSION['admin_id']) || ($_SESSION['admin_role'] ?? '') !== 'admin') {
    json_out(['success' => false, 'error' => 'Admin login required.'], 401);
}

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) $input = $_POST;

$action = $input['action'] ?? '';
$pdo = get_db();

try {
    if ($action === 'list') {
        $users = $pdo->query('SELECT id, username, role, contact_mobile, email, created_at FROM admin_users ORDER BY created_at ASC')->fetchAll();
        foreach ($users as &$u) {
            $u['is_current'] = ((int)$u['id'] === (int)$_SESSION['admin_id']);
        }
        json_out(['success' => true, 'users' => $users]);
    }

    if ($action === 'create') {
        $username = trim($input['username'] ?? '');
        $password = (string)($input['password'] ?? '');
        $role = (($input['role'] ?? 'staff') === 'admin') ? 'admin' : 'staff';
        $mobile = trim($input['contact_mobile'] ?? '');
        $email = trim($input['email'] ?? '');

        if ($username === '' || strlen($password) < 8) {
            json_out(['success' => false, 'error' => 'Username is required and password must be at least 8 characters.'], 422);
        }
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_out(['success' => false, 'error' => 'Please enter a valid email address.'], 422);
        }

        $stmt = $pdo->prepare('INSERT INTO admin_users (username, password_hash, role, contact_mobile, email) VALUES (:u, :p, :r, :m, :e)');
        $stmt->execute([
            ':u' => $username,
            ':p' => password_hash($password, PASSWORD_DEFAULT),
            ':r' => $role,
            ':m' => $mobile !== '' ? $mobile : null,
            ':e' => $email !== '' ? strtolower($email) : null,
        ]);
        json_out(['success' => true, 'message' => 'Account "' . $username . '" created as ' . $role . '.']);
    }

    if ($action === 'update_contact') {
        $id = (int)($input['id'] ?? 0);
        $mobile = trim($input['contact_mobile'] ?? '');
        $email = trim($input['email'] ?? '');
        if (!$id) json_out(['success' => false, 'error' => 'Invalid account ID.'], 422);
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_out(['success' => false, 'error' => 'Please enter a valid email address.'], 422);
        }
        $stmt = $pdo->prepare('UPDATE admin_users SET contact_mobile = :m, email = :e WHERE id = :id');
        $stmt->execute([':m' => $mobile !== '' ? $mobile : null, ':e' => $email !== '' ? strtolower($email) : null, ':id' => $id]);
        json_out(['success' => true, 'message' => 'Contact details updated. OTP / Google login will now match these.']);
    }

    if ($action === 'delete') {
        $id = (int)($input['id'] ?? 0);
        if (!$id || $id === (int)$_SESSION['admin_id']) {
            json_out(['success' => false, 'error' => 'You cannot remove your own account while logged in as it.'], 422);
        }
        $stmt = $pdo->prepare('DELETE FROM admin_users WHERE id = :id');
        $stmt->execute([':id' => $id]);
        json_out(['success' => true, 'message' => 'Account removed.']);
    }

    json_out(['success' => false, 'error' => 'Unknown action.'], 400);
} catch (Throwable $e) {
    // Do not expose database errors or SQL details to the browser.
    json_out(['success' => false, 'error' => 'Could not complete the request. Username, mobile, or email may already be taken.'], 409);
}

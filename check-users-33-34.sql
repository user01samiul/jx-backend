-- Check if users 33 and 34 exist in the database
SELECT 
    u.id,
    u.username,
    u.email,
    u.password,
    u.auth_secret,
    u.is_2fa_enabled,
    u.created_at,
    s.name as status,
    s.id as status_id
FROM users u
LEFT JOIN statuses s ON u.status_id = s.id
WHERE u.id IN (33, 34) OR u.username IN ('33', '34');

-- Check all users to see the pattern
SELECT 
    u.id,
    u.username,
    u.email,
    u.status_id,
    s.name as status,
    u.created_at
FROM users u
LEFT JOIN statuses s ON u.status_id = s.id
ORDER BY u.id;

-- Check if there are any users with numeric usernames
SELECT 
    u.id,
    u.username,
    u.email,
    u.status_id,
    s.name as status
FROM users u
LEFT JOIN statuses s ON u.status_id = s.id
WHERE u.username ~ '^[0-9]+$'
ORDER BY u.id;

-- Check user roles for users 33 and 34
SELECT 
    u.id,
    u.username,
    r.name as role_name,
    r.description as role_description
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.id IN (33, 34) OR u.username IN ('33', '34');

-- Check if users have balances
SELECT 
    u.id,
    u.username,
    ub.balance,
    ub.bonus_balance,
    ub.locked_balance
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id
WHERE u.id IN (33, 34) OR u.username IN ('33', '34'); 
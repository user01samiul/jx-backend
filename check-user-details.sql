-- Check detailed user information for users 33 and 34
SELECT 
    u.id,
    u.username,
    u.email,
    u.password,
    u.auth_secret,
    u.is_2fa_enabled,
    u.created_at,
    s.name as status,
    s.id as status_id,
    CASE 
        WHEN u.password = '$2b$10$YQRnR/9U2NCOUFPnMT.JJ.SVi/Di4S5hzAgt0/4f3neMfmULWUKYq' THEN 'CORRECT_HASH'
        ELSE 'DIFFERENT_HASH'
    END as password_hash_status
FROM users u
LEFT JOIN statuses s ON u.status_id = s.id
WHERE u.username IN ('samiul', 'samiiiii') OR u.id IN (33, 34);

-- Check user roles
SELECT 
    u.id,
    u.username,
    r.name as role_name,
    r.description as role_description,
    ur.created_at as role_assigned_at
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.username IN ('samiul', 'samiiiii') OR u.id IN (33, 34);

-- Check if users have balances
SELECT 
    u.id,
    u.username,
    ub.balance,
    ub.bonus_balance,
    ub.locked_balance,
    ub.created_at as balance_created_at
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id
WHERE u.username IN ('samiul', 'samiiiii') OR u.id IN (33, 34);

-- Check user profiles
SELECT 
    u.id,
    u.username,
    up.first_name,
    up.last_name,
    up.phone_number,
    up.nationality,
    up.country,
    up.is_verified,
    up.verification_level
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.username IN ('samiul', 'samiiiii') OR u.id IN (33, 34);

-- Check recent login attempts (if you have a login log table)
-- SELECT * FROM user_activity_logs WHERE user_id IN (33, 34) AND action = 'login' ORDER BY created_at DESC LIMIT 10;

-- Test password hash manually (you can run this in your application)
-- SELECT 
--     username,
--     password,
--     CASE 
--         WHEN password = crypt('secret123', password) THEN 'MATCH'
--         ELSE 'NO_MATCH'
--     END as password_test
-- FROM users 
-- WHERE username IN ('samiul', 'samiiiii'); 
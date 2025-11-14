export const Query = {
    REGISTER_USER: `INSERT INTO users (username, email, password, auth_secret, qr_code, status_id)
        SELECT $1, $2, $3, $4, $5, id
        FROM statuses
        WHERE name = 'Active'
        RETURNING id`
} as const;


export type Query = typeof Query[keyof typeof Query];
export const UserQuery = {
    GET_USER_WITH_BALANCE: `
      SELECT 
        u.id, u.username, u.email, ub.balance
      FROM 
        users u
      JOIN 
        user_balances ub ON u.id = ub.user_id
      WHERE 
        u.id = $1
    `
  } as const;
  
  export type UserQueryType = typeof UserQuery[keyof typeof UserQuery];
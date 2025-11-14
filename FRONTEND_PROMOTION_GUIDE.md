# Frontend Promotion & Notification Guide

## Quick Endpoints Reference

### Promotions
```
GET    /api/promotions              # Get available promotions
POST   /api/promotions/claim        # Claim promotion
GET    /api/promotions/my           # Get user's claimed promotions
GET    /api/promotions/daily-spin   # Check daily spin availability
POST   /api/promotions/daily-spin   # Perform daily spin
GET    /api/promotions/wagering-progress  # Get wagering progress
GET    /api/promotions/bonus-summary      # Get bonus balance
POST   /api/promotions/transfer-bonus     # Transfer bonus to main
GET    /api/promotions/{id}/eligibility   # Check eligibility
```

### Notifications
```
GET    /api/notifications           # Get user notifications
POST   /api/notifications/read      # Mark as read
DELETE /api/notifications/{id}      # Delete notification
POST   /api/notifications/read-all  # Mark all as read
```

## Promotion Usage Examples

### 1. Display Available Promotions
```javascript
const getPromotions = async () => {
  const response = await fetch('/api/promotions', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  return data.data; // Array of promotions
};
```

### 2. Claim Promotion
```javascript
const claimPromotion = async (promotionId) => {
  const response = await fetch('/api/promotions/claim', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ promotion_id: promotionId })
  });
  return response.json();
};
```

### 3. Daily Spin
```javascript
const performDailySpin = async () => {
  const response = await fetch('/api/promotions/daily-spin', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

### 4. Wagering Progress
```javascript
const getWageringProgress = async () => {
  const response = await fetch('/api/promotions/wagering-progress', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

## Notification Usage Examples

### 1. Get Notifications
```javascript
const getNotifications = async () => {
  const response = await fetch('/api/notifications', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

### 2. Mark as Read
```javascript
const markAsRead = async (notificationId) => {
  const response = await fetch('/api/notifications/read', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ notification_id: notificationId })
  });
  return response.json();
};
```

## UI Components Guidelines

### Promotion Card
```javascript
const PromotionCard = ({ promotion }) => (
  <div className="promotion-card">
    <h3>{promotion.name}</h3>
    <p>{promotion.description}</p>
    <div className="bonus-info">
      <span>{promotion.bonus_percentage}% Bonus</span>
      <span>Max: ${promotion.max_bonus_amount}</span>
    </div>
    <button 
      onClick={() => claimPromotion(promotion.id)}
      disabled={!promotion.can_claim}
    >
      {promotion.is_claimed ? 'Claimed' : 'Claim Now'}
    </button>
  </div>
);
```

### Wagering Progress Bar
```javascript
const WageringProgress = ({ progress }) => (
  <div className="wagering-progress">
    <div className="progress-bar">
      <div 
        className="progress-fill" 
        style={{ width: `${progress.progress_percentage}%` }}
      />
    </div>
    <span>{progress.progress_percentage}% Complete</span>
    <span>${progress.wagering_completed} / ${progress.wagering_requirement}</span>
  </div>
);
```

### Daily Spin Wheel
```javascript
const DailySpinWheel = () => {
  const [canSpin, setCanSpin] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const handleSpin = async () => {
    setSpinning(true);
    try {
      const result = await performDailySpin();
      // Show result modal
      showRewardModal(result.data.spin_result);
    } catch (error) {
      // Handle error
    } finally {
      setSpinning(false);
    }
  };

  return (
    <div className="daily-spin">
      <button 
        onClick={handleSpin} 
        disabled={!canSpin || spinning}
      >
        {spinning ? 'Spinning...' : 'Spin Daily Wheel'}
      </button>
    </div>
  );
};
```

## Notification Display

### Notification List
```javascript
const NotificationList = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    getNotifications().then(data => setNotifications(data.data));
  }, []);

  return (
    <div className="notifications">
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          className={`notification ${notification.is_read ? 'read' : 'unread'}`}
        >
          <p>{notification.message}</p>
          <span>{formatDate(notification.created_at)}</span>
          <button onClick={() => markAsRead(notification.id)}>
            Mark Read
          </button>
        </div>
      ))}
    </div>
  );
};
```

## Key Data Structures

### Promotion Object
```javascript
{
  id: 1,
  name: "Welcome Bonus",
  description: "Get 100% bonus on your first deposit",
  type: "welcome_bonus",
  bonus_percentage: 100.00,
  max_bonus_amount: 500.00,
  min_deposit_amount: 20.00,
  wagering_requirement: 35.00,
  free_spins_count: 50,
  is_claimed: false,
  can_claim: true
}
```

### Wagering Progress Object
```javascript
{
  promotion_id: 1,
  wagering_requirement: 1000.00,
  wagering_completed: 500.00,
  remaining_wagering: 500.00,
  progress_percentage: 50.00,
  is_completed: false
}
```

### Notification Object
```javascript
{
  id: 1,
  type: "promotion",
  title: "New Bonus Available",
  message: "Claim your welcome bonus now!",
  is_read: false,
  created_at: "2025-01-05T10:00:00.000Z"
}
```

## Error Handling

```javascript
const handleApiError = (error) => {
  if (error.status === 400) {
    showToast(error.message, 'error');
  } else if (error.status === 401) {
    // Redirect to login
    redirectToLogin();
  } else {
    showToast('Something went wrong', 'error');
  }
};
```

## Real-time Updates

### WebSocket Events
```javascript
// Listen for real-time updates
socket.on('promotion_claimed', (data) => {
  // Update promotion list
  refreshPromotions();
});

socket.on('wagering_updated', (data) => {
  // Update wagering progress
  refreshWageringProgress();
});

socket.on('new_notification', (data) => {
  // Add new notification
  addNotification(data);
});
```

## CSS Classes Reference

```css
/* Promotion styles */
.promotion-card { /* Card container */ }
.promotion-card.claimed { /* Claimed state */ }
.promotion-card.disabled { /* Disabled state */ }

/* Progress styles */
.wagering-progress { /* Progress container */ }
.progress-bar { /* Progress bar background */ }
.progress-fill { /* Progress bar fill */ }

/* Notification styles */
.notification { /* Notification item */ }
.notification.unread { /* Unread state */ }
.notification.read { /* Read state */ }

/* Daily spin styles */
.daily-spin { /* Spin container */ }
.spin-wheel { /* Wheel component */ }
.spin-result { /* Result modal */ }
``` 
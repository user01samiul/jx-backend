# 🎨 Admin Modules Frontend Implementation Guide

## 📋 API Integration

### Authentication Setup
```typescript
// services/auth.ts
export class AuthService {
  static getAuthHeaders() {
    const token = localStorage.getItem('adminToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
}
```

### API Service
```typescript
// services/admin-modules.ts
export class AdminModulesService {
  private static baseUrl = '/api/admin-modules';

  static async getMyModules(): Promise<AdminModule[]> {
    const response = await fetch(`${this.baseUrl}/my-modules`, {
      headers: AuthService.getAuthHeaders()
    });
    const data = await response.json();
    return data.data;
  }

  static async getAllModules(): Promise<AdminModule[]> {
    const response = await fetch(`${this.baseUrl}/all`, {
      headers: AuthService.getAuthHeaders()
    });
    const data = await response.json();
    return data.data;
  }

  static async createModule(module: CreateModuleRequest): Promise<AdminModule> {
    const response = await fetch(`${this.baseUrl}/`, {
      method: 'POST',
      headers: AuthService.getAuthHeaders(),
      body: JSON.stringify(module)
    });
    const data = await response.json();
    return data.data;
  }

  static async updateModule(id: number, module: UpdateModuleRequest): Promise<AdminModule> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: AuthService.getAuthHeaders(),
      body: JSON.stringify(module)
    });
    const data = await response.json();
    return data.data;
  }

  static async deleteModule(id: number): Promise<{ deletedCount: number }> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: AuthService.getAuthHeaders()
    });
    const data = await response.json();
    return data.data;
  }
}
```

## 🧩 Core Components

### 1. Navigation Sidebar
```typescript
// components/NavigationSidebar.tsx
export const NavigationSidebar: React.FC = () => {
  const [modules, setModules] = useState<AdminModule[]>([]);

  useEffect(() => {
    AdminModulesService.getMyModules().then(setModules);
  }, []);

  return (
    <nav className="sidebar">
      {modules.map(module => (
        <div key={module.id} className="nav-item">
          <i className={module.icon} />
          <span>{module.title}</span>
        </div>
      ))}
    </nav>
  );
};
```

### 2. Module Management
```typescript
// components/ModuleManagement.tsx
export const ModuleManagement: React.FC = () => {
  const [modules, setModules] = useState<AdminModule[]>([]);
  const [showForm, setShowForm] = useState(false);

  const handleCreate = async (data: CreateModuleRequest) => {
    await AdminModulesService.createModule(data);
    setShowForm(false);
    loadModules();
  };

  return (
    <div className="module-management">
      <button onClick={() => setShowForm(true)}>Create Module</button>
      {showForm && <ModuleForm onSubmit={handleCreate} />}
      <div className="modules-grid">
        {modules.map(module => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </div>
    </div>
  );
};
```

## 📊 Request/Response Examples

### Get User Modules
```typescript
// Request
GET /api/admin-modules/my-modules
Headers: Authorization: Bearer <token>

// Response
{
  "status": "success",
  "message": "Modules retrieved successfully",
  "data": [
    {
      "id": 1,
      "title": "Dashboard",
      "path": "/dashboard",
      "icon": "dashboard-icon",
      "role_id": [1, 3, 5],
      "children": []
    }
  ]
}
```

### Create Module
```typescript
// Request
POST /api/admin-modules
Headers: Authorization: Bearer <token>
Body: {
  "title": "New Module",
  "path": "/new-module",
  "icon": "new-icon",
  "role_id": [1, 2, 3]
}

// Response
{
  "status": "success",
  "message": "Module created successfully",
  "data": {
    "id": 70,
    "title": "New Module",
    "path": "/new-module",
    "icon": "new-icon",
    "role_id": [1, 2, 3]
  }
}
```

### Update Module
```typescript
// Request
PUT /api/admin-modules/1
Headers: Authorization: Bearer <token>
Body: {
  "title": "Updated Module",
  "role_id": [1, 2, 3, 4]
}

// Response
{
  "status": "success",
  "message": "Module updated successfully",
  "data": {
    "id": 1,
    "title": "Updated Module",
    "role_id": [1, 2, 3, 4]
  }
}
```

### Delete Module
```typescript
// Request
DELETE /api/admin-modules/1
Headers: Authorization: Bearer <token>

// Response
{
  "status": "success",
  "message": "Module deleted successfully",
  "data": {
    "deletedCount": 3
  }
}
```

## 🎨 CSS Styling

```css
/* Navigation Sidebar */
.sidebar {
  width: 280px;
  background: #1a1a1a;
  color: white;
  padding: 20px;
}

.nav-item {
  padding: 12px;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 8px;
  transition: background 0.2s;
}

.nav-item:hover {
  background: #333;
}

/* Module Management */
.module-management {
  padding: 20px;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.module-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Forms */
.module-form {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
```

## 🚨 Error Handling

```typescript
// Error handling example
try {
  const modules = await AdminModulesService.getMyModules();
  setModules(modules);
} catch (error) {
  if (error.response?.status === 401) {
    // Redirect to login
    router.push('/login');
  } else if (error.response?.status === 403) {
    // Show access denied
    setError('Access denied');
  } else {
    // Show generic error
    setError('Failed to load modules');
  }
}
```

## 📱 Responsive Design

```css
/* Mobile */
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    height: auto;
  }
  
  .modules-grid {
    grid-template-columns: 1fr;
  }
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  .sidebar {
    width: 240px;
  }
}
```

## 🧪 Testing

```typescript
// Test example
describe('NavigationSidebar', () => {
  it('renders modules correctly', async () => {
    const mockModules = [
      { id: 1, title: 'Dashboard', path: '/dashboard' }
    ];
    
    jest.spyOn(AdminModulesService, 'getMyModules')
      .mockResolvedValue(mockModules);
    
    render(<NavigationSidebar />);
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
```

## 🚀 Implementation Steps

1. **Setup Authentication**
   - Implement JWT token storage
   - Add auth headers to API calls

2. **Create API Service**
   - Implement all CRUD operations
   - Add error handling

3. **Build UI Components**
   - Navigation sidebar
   - Module management interface
   - Forms for create/edit

4. **Add State Management**
   - Use React state or Redux
   - Handle loading and error states

5. **Implement Routing**
   - Dynamic routes based on modules
   - Role-based access control

6. **Add Styling**
   - Responsive design
   - Consistent UI/UX

7. **Testing**
   - Unit tests for components
   - Integration tests for API

## 📋 Key Features

- ✅ **Dynamic Navigation** based on user roles
- ✅ **CRUD Operations** for module management
- ✅ **Role-based Access Control**
- ✅ **Responsive Design**
- ✅ **Error Handling**
- ✅ **Loading States**
- ✅ **Form Validation**

This specification provides everything needed to implement the admin modules system in the frontend! 🎉 
# How to Create the First Admin User

Because Firebase Authentication does not allow creating users without signing in as them on the client side, follow these steps to create your first Administrator account.

---

## Step-by-Step

### 1. Create the Auth User in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** → **Users**
4. Click **Add user**
5. Enter:
   - **Email**: e.g. `admin@cffood.com`
   - **Password**: choose a strong password (min 6 characters)
6. Click **Add user**
7. **Copy the User UID** that is generated (you will need it)

### 2. Create the User Profile in Firestore

1. Go to **Firestore Database**
2. Click **Start collection** (if no collections exist yet)
3. Collection ID: `users`
4. Document ID: **paste the UID** you copied earlier (important!)
5. Add the following fields:

| Field        | Type      | Value                          |
|--------------|-----------|--------------------------------|
| `uid`        | string    | *(same as Document ID)*        |
| `email`      | string    | `admin@cffood.com`             |
| `displayName`| string    | `System Admin`                 |
| `role`       | string    | `admin`                        |
| `phone`      | string    | `08062686710`                  |
| `status`     | string    | `active`                       |
| `createdAt`  | timestamp | *(click the timestamp button)* |
| `updatedAt`  | timestamp | *(click the timestamp button)* |

6. Click **Save**

### 3. Log In

1. Open your app → `login.html`
2. Sign in with the email and password you created
3. You should land on the Dashboard as **ADMIN**

---

## After First Admin Exists

Once you are logged in as Admin, you can create additional users (Manager, Cashier) from the **Users** page inside the application.

**Note:** Creating a user from the app will temporarily sign you out (Firebase client SDK limitation). Simply log back in with your admin account afterwards.

---

## Roles Reference

| Role     | Access Level                                      |
|----------|---------------------------------------------------|
| `admin`  | Full access (users, settings, all modules)        |
| `manager`| Products, inventory, purchases, reports, returns  |
| `cashier`| POS, view products, basic sales, customers        |

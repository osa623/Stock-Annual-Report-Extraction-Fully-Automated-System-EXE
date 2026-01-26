# API Endpoints

Base URL: `http://localhost:<PORT>` (Default PORT is usually 5000)

## Admin Routes
Base Path: `/api/admin`

| Method | Endpoint | Description | Request Body |
| :--- | :--- | :--- | :--- |
| POST | `/register` | Register a new admin | `{ email, password, ... }` |
| POST | `/login` | Admin login | `{ email, password }` |

## Auth Routes (User/MFA)
Base Path: `/api/auth`

| Method | Endpoint | Description | Request Body |
| :--- | :--- | :--- | :--- |
| POST | `/setup` | Setup MFA | `{ email, ... }` |
| POST | `/login` | Login with MFA | `{ email, token }` |

## General Routes

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/` | Health check (Returns "API is running...") |

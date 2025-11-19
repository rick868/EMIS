# Password Recovery Implementation TODO

## Backend Changes

- [ ] Update Prisma schema: Add resetToken and resetTokenExpiry to User model
- [ ] Install nodemailer dependency
- [ ] Run Prisma migration and generate client
- [ ] Add POST /api/auth/forgot-password endpoint in server.js
- [ ] Add POST /api/auth/reset-password endpoint in server.js
- [ ] Configure SMTP environment variables

## Frontend Changes

- [ ] Create ForgotPasswordModal component
- [ ] Create ResetPassword page/component
- [ ] Update Login.jsx to use ForgotPasswordModal
- [ ] Add routing for ResetPassword page

## Testing

- [ ] Test forgot password flow
- [ ] Test reset password flow
- [ ] Verify email sending
- [ ] Check security measures (token expiry, rate limiting)

# Constant Contact Integration Setup

This document explains how to set up Constant Contact integration for the membership database using OAuth2 with refresh tokens.

## Overview

The Constant Contact integration automatically adds new members to your email list when they register, and provides a manual sync button to reconcile your membership database with your Constant Contact list. The integration uses OAuth2 with long-lived refresh tokens for secure, automated operation.

## Setup Steps

### 1. Create Constant Contact Application

1. Go to the [Constant Contact Developer Portal](https://v3.developer.constantcontact.com/api_guide/apps_create.html)
2. Create a new V3 API application
3. Note down your **API Key** and **Client Secret**
4. Set your **Redirect URI** to `http://localhost:3000/oauth/callback` (for setup purposes)

### 2. Run the Setup Script

We've created an automated setup script that handles the OAuth2 flow for you:

```bash
# Install dependencies if needed
npm install node-fetch

# Run the setup script
node scripts/setup-constant-contact.js
```

The script will:
1. Prompt you for your API Key and Client Secret
2. Open a browser window for authorization
3. Automatically capture the authorization code
4. Exchange it for access and refresh tokens
5. Display the environment variables you need

### 3. Get Your List ID

1. Go to **Contacts** > **Lists** in Constant Contact
2. Select the list you want to sync with
3. Copy the list ID from the URL (it will look like a UUID)

### 4. Configure Environment Variables

Add the following environment variables to your `.env` file:

```env
VITE_CONSTANT_CONTACT_API_KEY=your_api_key_here
VITE_CONSTANT_CONTACT_CLIENT_SECRET=your_client_secret_here
VITE_CONSTANT_CONTACT_REFRESH_TOKEN=your_refresh_token_here
VITE_CONSTANT_CONTACT_LIST_ID=your_list_id_here
```

### 5. Deploy Configuration

If you're using Vercel or another hosting platform, add these environment variables to your deployment settings.

## Features

### Automatic Member Addition

When a new member registers through:
- The public registration form
- Admin member creation
- ActBlue import processing

They will automatically be added to your Constant Contact list.

### Manual Sync

Use the **Constant Contact** admin page (`/admin/constant-contact`) to:
- Test your connection
- View current list members
- Manually sync all active members
- View sync results and errors

### Data Mapping

The following member data is synced to Constant Contact:
- **Email Address** (required)
- **First Name**
- **Last Name**
- **Phone Number** (formatted as +1XXXXXXXXXX)
- **Address** (street, city, state, zip)
- **Custom Fields**:
  - Membership Type
  - Member Status
  - Join Date

## Troubleshooting

### Connection Issues

1. Verify your API key, client secret, refresh token, and list ID are correct
2. Check that your Constant Contact account has API access enabled
3. Ensure your refresh token is valid (they typically don't expire unless revoked)
4. Check that your application has the correct scopes (`contact_data offline_access`)

### Sync Errors

1. Check the error messages in the admin interface
2. Verify member email addresses are valid
3. Ensure the Constant Contact list exists and is accessible

### Missing Members

1. Run a manual sync to add missing members
2. Check that members have valid email addresses
3. Verify members have 'active' status in the database

## Security Notes

- Never commit your API credentials to version control
- Use environment variables for all sensitive configuration
- Refresh tokens are long-lived but can be revoked if compromised
- Monitor API usage to stay within rate limits
- The system automatically refreshes access tokens in the background

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Constant Contact account settings
3. Contact your system administrator 
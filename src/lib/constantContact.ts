interface ConstantContactConfig {
  apiKey: string;
  clientSecret: string;
  refreshToken: string;
  listId: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

interface ContactData {
  email_address: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
  custom_fields?: Array<{
    custom_field_id: string;
    value: string;
  }>;
}

interface ContactResponse {
  contact_id: string;
  email_address: string;
  status: string;
}

interface ListMember {
  contact_id: string;
  email_address: string;
  first_name?: string;
  last_name?: string;
  status: string;
}

class ConstantContactAPI {
  private config: ConstantContactConfig;
  private baseUrl = 'https://api.cc.email/v3';
  private tokenUrl = 'https://authz.constantcontact.com/oauth2/default/v1/token';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: ConstantContactConfig) {
    this.config = config;
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Generate new token using refresh token via Vercel API
    try {
      const response = await fetch('/api/constant-contact-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.config.refreshToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Token refresh response:', response.status, response.statusText, errorData);
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText} - ${errorData.error || errorData.details || 'Unknown error'}`);
      }

      const tokenData: TokenResponse = await response.json();
      
      this.accessToken = tokenData.access_token;
      // Set expiry to 50 minutes from now (tokens typically last 1 hour)
      this.tokenExpiry = Date.now() + (tokenData.expires_in - 600) * 1000;
      
      return this.accessToken;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error('Failed to obtain access token from Constant Contact');
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const accessToken = await this.getAccessToken();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Constant Contact API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  async addOrUpdateContactWithList(contactData: ContactData): Promise<ContactResponse> {
    try {
      // Always use email_address as object and include list_memberships
      const upsertData: any = {
        ...contactData,
        email_address: {
          address: contactData.email_address,
          permission_to_send: 'implicit',
        },
        list_memberships: [this.config.listId],
      };
      // Remove old string email_address if present
      delete upsertData.email_address_string;

      // Upsert contact (POST to /contacts is upsert in v3)
      const response = await this.makeRequest('/contacts', {
        method: 'POST',
        body: JSON.stringify(upsertData),
      });
      return {
        contact_id: response.contact_id,
        email_address: response.email_address?.address || '',
        status: response.status || 'subscribed',
      };
    } catch (error) {
      console.error('Error upserting contact to Constant Contact:', error);
      throw error;
    }
  }

  async getListMembers(): Promise<ListMember[]> {
    try {
      // Use the v3 pattern: /contacts?list_id=...
      const response = await this.makeRequest(`/contacts?list_id=${this.config.listId}`);
      // Map to ListMember[]
      return (response.contacts || []).map((c: any) => ({
        contact_id: c.contact_id,
        email_address: c.email_address?.address || '',
        first_name: c.first_name,
        last_name: c.last_name,
        status: c.status || c.email_address?.permission_to_send || '',
      }));
    } catch (error) {
      console.error('Error fetching list members:', error);
      throw error;
    }
  }

  async removeContactFromList(contactId: string): Promise<void> {
    try {
      await this.makeRequest(`/contact_lists/${this.config.listId}/contacts/${contactId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error removing contact from list:', error);
      throw error;
    }
  }

  async updateContact(contactId: string, contactData: Partial<ContactData>): Promise<ContactResponse> {
    try {
      // Always include list_memberships
      const updateData: any = {
        ...contactData,
        email_address: contactData.email_address
          ? { address: contactData.email_address, permission_to_send: 'implicit' }
          : undefined,
        list_memberships: [this.config.listId],
      };
      const response = await this.makeRequest(`/contacts/${contactId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
      return {
        contact_id: contactId,
        email_address: response.email_address?.address || '',
        status: 'updated',
      };
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }
}

// Factory function to create API instance
export const createConstantContactAPI = (config: ConstantContactConfig): ConstantContactAPI => {
  return new ConstantContactAPI(config);
};

// Helper function to convert member data to Constant Contact format
export const convertMemberToContact = (member: any): ContactData => {
  return {
    email_address: member.email,
    first_name: member.first_name,
    last_name: member.last_name,
    phone_number: member.phone ? `+1${member.phone}` : undefined,
    address: {
      line1: member.address,
      city: member.city,
      state: member.state,
      postal_code: member.zip,
    },
    custom_fields: [
      {
        custom_field_id: 'membership_type',
        value: member.membership_type || 'unknown'
      },
      {
        custom_field_id: 'status',
        value: member.status || 'unknown'
      },
      {
        custom_field_id: 'joined_date',
        value: member.joined_date || member.created_at || ''
      }
    ].filter(field => field.value && field.value !== 'unknown')
  };
};

// Sync function to reconcile database with Constant Contact
export const syncMembersToConstantContact = async (
  members: any[],
  api: ConstantContactAPI
): Promise<{ added: number; updated: number; errors: string[] }> => {
  const results = {
    added: 0,
    updated: 0,
    errors: [] as string[]
  };

  try {
    // Get current list members
    const existingContacts = await api.getListMembers();
    const existingEmails = new Set(existingContacts.map(c => c.email_address.toLowerCase()));

    for (const member of members) {
      try {
        const contactData = convertMemberToContact(member);
        if (existingEmails.has(member.email.toLowerCase())) {
          // Find existing contact and update
          const existingContact = existingContacts.find(c =>
            c.email_address.toLowerCase() === member.email.toLowerCase()
          );
          if (existingContact) {
            await api.updateContact(existingContact.contact_id, contactData);
            results.updated++;
          }
        } else {
          // Add new contact (upsert)
          await api.addOrUpdateContactWithList(contactData);
          results.added++;
        }
      } catch (error) {
        const errorMessage = `Failed to sync member ${member.email}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMessage);
        console.error(errorMessage);
      }
    }
  } catch (error) {
    const errorMessage = `Failed to sync members: ${error instanceof Error ? error.message : 'Unknown error'}`;
    results.errors.push(errorMessage);
    console.error(errorMessage);
  }

  return results;
}; 
import { getSupabaseClient } from '../config/supabase.config';

export interface User {
  id: string;
  email: string;
  password_hash?: string; // Don't return in API responses
  role: 'instructor' | 'student';
  first_name?: string;
  last_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserDto {
  email: string;
  password_hash: string;
  role: 'instructor' | 'student';
  first_name?: string;
  last_name?: string;
}

class UserModel {
  private readonly table = 'users';

  /**
   * Create a new user
   */
  async create(userData: CreateUserDto): Promise<User> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from(this.table)
      .insert([userData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return this.sanitizeUser(data);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from(this.table)
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return null;
    }

    return data as User;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.sanitizeUser(data);
  }

  /**
   * Update user profile
   */
  async update(id: string, updates: Partial<User>): Promise<User> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from(this.table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return this.sanitizeUser(data);
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from(this.table)
      .delete()
      .eq('id', id);

    return !error;
  }

  /**
   * Get all users by role
   */
  async findByRole(role: 'instructor' | 'student'): Promise<User[]> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from(this.table)
      .select('*')
      .eq('role', role);

    if (error || !data) {
      return [];
    }

    return data.map(user => this.sanitizeUser(user));
  }

  /**
   * Remove password_hash from user object for API responses
   */
  private sanitizeUser(user: any): User {
    const { password_hash, ...sanitized } = user;
    return sanitized;
  }
}

export default new UserModel();


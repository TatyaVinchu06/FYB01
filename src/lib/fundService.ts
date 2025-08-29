import { supabase } from './supabaseClient';

export const fundService = {
  // Get all members
  async getMembers() {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('joinDate', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Add a new member
  async addMember(newMember) {
    const { error } = await supabase.from('members').insert([newMember]);
    if (error) throw error;
  },

  // Update member
  async updateMember(id, updates) {
    const { error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  // Delete member
  async deleteMember(id) {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Get gang fund
  async getGangFund() {
    const { data, error } = await supabase
      .from('fund')
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  // Update gang fund
  async updateGangFund(amount) {
    const { error } = await supabase
      .from('fund')
      .update({
        baseAmount: amount,
        lastUpdated: new Date().toISOString()
      })
      .eq('id', 1); // assuming single row
    if (error) throw error;
  }
};

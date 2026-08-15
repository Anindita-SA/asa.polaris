import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export const useContactReminders = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true);

    if (error) {
      console.error('Error fetching contacts:', error);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const processedContacts = data.map((contact) => {
      let daysSince = Infinity;
      let isOverdue = true;

      if (contact.last_contacted_at) {
        const lastContactDate = new Date(contact.last_contacted_at);
        lastContactDate.setHours(0, 0, 0, 0);
        
        // Calculate difference in days
        const diffTime = today - lastContactDate;
        daysSince = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        isOverdue = daysSince >= contact.frequency_days;
      }

      return {
        ...contact,
        daysSince,
        isOverdue
      };
    });

    // Sorted: overdue first by most overdue, then by soonest upcoming
    processedContacts.sort((a, b) => {
      // Overdue comes first
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;

      if (a.isOverdue && b.isOverdue) {
        // Both overdue: sort by most overdue
        const aOverdueBy = a.daysSince - a.frequency_days;
        const bOverdueBy = b.daysSince - b.frequency_days;
        return bOverdueBy - aOverdueBy; 
      }

      // Neither overdue: sort by soonest upcoming
      const aUpcomingIn = a.frequency_days - a.daysSince;
      const bUpcomingIn = b.frequency_days - b.daysSince;
      return aUpcomingIn - bUpcomingIn;
    });

    setContacts(processedContacts);
  }, [user]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const markReachedOut = async (id) => {
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    const { error } = await supabase
      .from('contacts')
      .update({ last_contacted_at: today })
      .eq('id', id);

    if (error) {
      console.error('Error updating contact:', error);
    } else {
      await fetchContacts();
    }
  };

  return { contacts, markReachedOut, fetchContacts };
};

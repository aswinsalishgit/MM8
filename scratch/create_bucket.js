const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qfevhmpomoacjqjitrrf.supabase.co';
const supabaseAnonKey = 'sb_publishable_iohlkEQz1Q_InZeQw3_E0g_dpdU6Wu5';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createBucket() {
  const { data, error } = await supabase.storage.createBucket('avatars', {
    public: true
  });
  if (error) {
    console.error('Error creating bucket:', error);
  } else {
    console.log('Bucket created:', data);
  }
}

createBucket();

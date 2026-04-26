const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qfevhmpomoacjqjitrrf.supabase.co';
const supabaseAnonKey = 'sb_publishable_iohlkEQz1Q_InZeQw3_E0g_dpdU6Wu5';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkBuckets() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Error listing buckets:', error);
  } else {
    console.log('Buckets:', data);
  }
}

checkBuckets();

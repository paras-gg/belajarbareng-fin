import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  paket: 'monthly' | 'yearly';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check required environment variables
    const midtransServerKey = Deno.env.get("MIDTRANS_SERVER_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!midtransServerKey) {
      console.error('MIDTRANS_SERVER_KEY environment variable is not set');
      throw new Error('Midtrans server key not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase environment variables are not set');
      throw new Error('Supabase configuration not found');
    }

    console.log('Environment variables check passed');

    // Create Supabase client for authentication check (using anon key first)
    const supabaseAuth = createClient(
      supabaseUrl, 
      Deno.env.get("SUPABASE_ANON_KEY") || ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error("Authorization header required");
    }

    const token = authHeader.replace("Bearer ", "");
    console.log('Token length:', token.length, 'Token prefix:', token.substring(0, 20));
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Authentication error:", authError);
      throw new Error("User not authenticated");
    }

    // Create Supabase client with service role key for database operations
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const { paket }: PaymentRequest = await req.json();

    // Validate paket
    if (!paket || !['monthly', 'yearly'].includes(paket)) {
      throw new Error("Invalid paket. Must be 'monthly' or 'yearly'");
    }

    // Get pricing from premium_packages table
    const { data: packageData, error: packageError } = await supabaseClient
      .from('premium_packages')
      .select('price, duration_months, name')
      .eq('is_active', true)
      .eq('duration_months', paket === 'monthly' ? 1 : 12)
      .order('is_popular', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let amount: number;
    let packageName: string;
    if (packageError || !packageData) {
      console.error('Package fetch error:', packageError);
      // Fallback to default pricing
      amount = paket === 'monthly' ? 40000 : 400000;
      packageName = `Premium Membership ${paket === 'monthly' ? '1 Bulan' : '1 Tahun'}`;
    } else {
      amount = packageData.price;
      packageName = packageData.name;
    }

    console.log(`Using package: ${packageName} with price: ${amount}`);
    
    // Generate unique order ID (shortened for Midtrans compatibility)
    const timestamp = Date.now().toString();
    const userIdShort = user.id.substring(0, 8); // Take first 8 chars of UUID
    const orderId = `prem-${userIdShort}-${timestamp}`;

    // Get user profile for customer details
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('nama')
      .eq('id', user.id)
      .single();

    // Create transaction record
    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: user.id,
        paket,
        amount,
        midtrans_order_id: orderId,
        status: 'pending'
      });

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      throw new Error('Failed to create transaction record');
    }

    // Prepare Midtrans Snap transaction
    const snapTransaction = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      credit_card: {
        secure: true
      },
      customer_details: {
        first_name: profile?.nama || 'User',
        email: user.email,
      },
      item_details: [{
        id: `premium-${paket}`,
        price: amount,
        quantity: 1,
        name: packageName
      }]
    };

    // Create Snap transaction with Midtrans (using sandbox for testing)
    console.log('Creating Midtrans Snap transaction...');
    const midtransResponse = await fetch('https://app.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(midtransServerKey + ":")}`
      },
      body: JSON.stringify(snapTransaction)
    });

    if (!midtransResponse.ok) {
      const errorText = await midtransResponse.text();
      console.error('Midtrans API error status:', midtransResponse.status);
      console.error('Midtrans API error response:', errorText);
      throw new Error(`Midtrans API Error (${midtransResponse.status}): ${errorText}`);
    }

    const midtransData = await midtransResponse.json();

    return new Response(JSON.stringify({
      token: midtransData.token,
      order_id: orderId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to create payment session' 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

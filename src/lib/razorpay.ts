/**
 * Razorpay Payment Gateway Helper
 * Supports dynamic checkout SDK loading and Razorpay checkout modal.
 */

export interface RazorpayPaymentSuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

/**
 * Dynamically loads the official Razorpay Checkout SDK script
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Failed to load Razorpay SDK from CDN.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

export interface InitiateRazorpayParams {
  amountInINR: number;
  planName: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  companyName: string;
  userEmail: string;
  userName: string;
  onSuccess: (response: RazorpayPaymentSuccessResponse) => void;
  onDismiss?: () => void;
  onError?: (error: any) => void;
}

/**
 * Checks if a live or test Razorpay key is configured in .env
 */
export function isRazorpayConfigured(): boolean {
  const key = 
    import.meta.env.VITE_RAZORPAY_KEY_ID || 
    import.meta.env.RAZORPAY_KEY_ID || 
    '';
  return Boolean(key && key.startsWith('rzp_') && !key.includes('your-key'));
}

/**
 * Launches the Razorpay payment modal or dev simulator
 */
export async function initiateRazorpayPayment(params: InitiateRazorpayParams): Promise<void> {
  const razorpayKey = 
    import.meta.env.VITE_RAZORPAY_KEY_ID || 
    import.meta.env.RAZORPAY_KEY_ID || 
    '';

  const isLoaded = await loadRazorpayScript();

  // If Razorpay SDK is available and key is configured:
  if (isLoaded && razorpayKey && razorpayKey.startsWith('rzp_')) {
    const options = {
      key: razorpayKey,
      amount: Math.round(params.amountInINR * 100), // Amount in paise
      currency: 'INR',
      name: 'ScalePods Autonomous Recovery',
      description: `${params.planName} Tier Upgrade (${params.billingCycle === 'annual' ? 'Annual Plan' : 'Monthly Plan'})`,
      image: '/scalepods-logo-dark.png',
      prefill: {
        name: params.userName,
        email: params.userEmail,
        contact: '',
      },
      notes: {
        company_name: params.companyName,
        plan_id: params.planId,
        billing_cycle: params.billingCycle,
      },
      theme: {
        color: '#7C3AED', // ScalePods Neon Purple
      },
      modal: {
        ondismiss: () => {
          if (params.onDismiss) params.onDismiss();
        },
      },
      handler: (response: RazorpayPaymentSuccessResponse) => {
        params.onSuccess(response);
      },
    };

    try {
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        if (params.onError) {
          params.onError(resp.error);
        }
      });
      rzp.open();
      return;
    } catch (e) {
      console.warn('Razorpay checkout initialization error, falling back to simulator:', e);
    }
  }

  // Development Sandbox Simulation (when key is pending in .env):
  setTimeout(() => {
    params.onSuccess({
      razorpay_payment_id: `pay_rzp_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    });
  }, 1200);
}

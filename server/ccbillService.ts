import crypto from 'crypto';

interface CCBillConfig {
  accountNumber: string;
  subAccountNumber: string;
  formName: string;
  salt: string;
  flexFormsUrl: string;
}

interface CCBillFormDigest {
  formDigest: string;
  currencyCode: string;
  initialPeriod: string;
  initialPrice: string;
  recurringPeriod: string;
  recurringPrice: string;
}

export class CCBillService {
  private config: CCBillConfig;

  constructor() {
    this.config = {
      accountNumber: process.env.CCBILL_ACCOUNT_NUMBER || '',
      subAccountNumber: process.env.CCBILL_SUBACCOUNT_NUMBER || '',
      formName: process.env.CCBILL_FORM_NAME || '',
      salt: process.env.CCBILL_SALT || '',
      flexFormsUrl: 'https://api.ccbill.com/wap-frontflex/flexforms',
    };
  }

  private generateFormDigest(params: {
    initialPrice: string;
    initialPeriod: string;
    recurringPrice: string;
    recurringPeriod: string;
    rebills: string;
    currencyCode: string;
  }): string {
    const digestString = `${params.initialPrice}${params.initialPeriod}${params.recurringPrice}${params.recurringPeriod}${params.rebills}${params.currencyCode}${this.config.salt}`;
    return crypto.createHash('md5').update(digestString).digest('hex');
  }

  getMembershipPricing(tier: 'premium' | 'platinum'): CCBillFormDigest {
    if (tier === 'platinum') {
      return {
        formDigest: this.generateFormDigest({
          initialPrice: '49.99',
          initialPeriod: '30',
          recurringPrice: '49.99',
          recurringPeriod: '30',
          rebills: '99',
          currencyCode: '840',
        }),
        currencyCode: '840',
        initialPeriod: '30',
        initialPrice: '49.99',
        recurringPeriod: '30',
        recurringPrice: '49.99',
      };
    }
    return {
      formDigest: this.generateFormDigest({
        initialPrice: '19.99',
        initialPeriod: '30',
        recurringPrice: '19.99',
        recurringPeriod: '30',
        rebills: '99',
        currencyCode: '840',
      }),
      currencyCode: '840',
      initialPeriod: '30',
      initialPrice: '19.99',
      recurringPeriod: '30',
      recurringPrice: '19.99',
    };
  }

  generatePaymentUrl(params: {
    tier: 'premium' | 'platinum';
    userId: string;
    email: string;
  }): string {
    const pricing = this.getMembershipPricing(params.tier);
    
    const queryParams = new URLSearchParams({
      clientAccnum: this.config.accountNumber,
      clientSubacc: this.config.subAccountNumber,
      formName: this.config.formName,
      formDigest: pricing.formDigest,
      initialPrice: pricing.initialPrice,
      initialPeriod: pricing.initialPeriod,
      recurringPrice: pricing.recurringPrice,
      recurringPeriod: pricing.recurringPeriod,
      rebills: '99',
      currencyCode: pricing.currencyCode,
      email: params.email,
      'X-userId': params.userId,
      'X-tier': params.tier,
    });

    return `${this.config.flexFormsUrl}/${this.config.formName}?${queryParams.toString()}`;
  }

  verifyWebhookDigest(params: {
    subscriptionId: string;
    eventType: string;
    timestamp: string;
    receivedDigest: string;
  }): boolean {
    const expectedDigest = crypto
      .createHash('md5')
      .update(`${params.subscriptionId}${params.eventType}${params.timestamp}${this.config.salt}`)
      .digest('hex');
    
    return expectedDigest === params.receivedDigest;
  }

  isConfigured(): boolean {
    return !!(
      this.config.accountNumber &&
      this.config.subAccountNumber &&
      this.config.formName &&
      this.config.salt
    );
  }

  getConfig() {
    return {
      isConfigured: this.isConfigured(),
      accountNumber: this.config.accountNumber ? '****' + this.config.accountNumber.slice(-4) : null,
    };
  }
}

export const ccbillService = new CCBillService();

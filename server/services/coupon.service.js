export class CouponService {
  constructor(repository) { this.repository = repository; }

  validate(code, plan, now = new Date()) {
    if (!code) return null;
    const coupon = this.repository.findCoupon(code);
    if (!coupon || coupon.active === false) throw new Error("COUPON_INVALID");
    if (coupon.expiresAt && new Date(coupon.expiresAt) <= now) throw new Error("COUPON_EXPIRED");
    if (coupon.maxUses !== null && coupon.maxUses !== undefined && coupon.usageCount >= coupon.maxUses) throw new Error("COUPON_EXHAUSTED");
    if (coupon.planCode && coupon.planCode !== plan.code) throw new Error("COUPON_NOT_APPLICABLE");
    const discountCents = Math.floor(plan.priceCents * Number(coupon.discountPercent) / 100);
    return { coupon, discountCents, amountCents: Math.max(0, plan.priceCents - discountCents) };
  }

  redeem({ coupon, payment, discountCents }) {
    if (this.repository.findRedemption(coupon.id, payment.userId, payment.workspaceId)) return;
    coupon.usageCount = Number(coupon.usageCount || 0) + 1;
    this.repository.saveCoupon(coupon);
    this.repository.saveRedemption({ id: crypto.randomUUID(), couponId: coupon.id, userId: payment.userId, workspaceId: payment.workspaceId, paymentId: payment.id, discountPercent: coupon.discountPercent, discountCents });
  }
}

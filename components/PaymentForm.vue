<template>
	<view class="payment-form">
		<text class="payment-help">{{ existing ? '此订单已退回收钱节点，可直接修改原收款金额；保存后近 7 日台账会同步更新。' : '填写实际收到的金额，支持多种方式；未使用的渠道留空。' }}</text>
		<view v-for="channel in channels" :key="channel.key" class="payment-field">
			<view class="payment-label"><text>{{ channel.label }}</text><text v-if="channel.key === 'online'" class="online-note">不计入合计</text></view>
			<view class="payment-input"><text>¥</text><input v-model="amounts[channel.key]" type="digit" maxlength="10" placeholder="0.00" :aria-label="channel.label + '收款金额'" /></view>
		</view>
		<view class="payment-total"><text>本单收款（含线上）</text><text>¥{{ total }}</text></view>
		<text v-if="error" class="payment-error">{{ error }}</text>
		<button class="payment-submit" @click="submit">{{ existing ? '保存金额并重新确认收钱' : '确认收钱' }}</button>
		<text class="payment-help payment-footnote">仅登记已收款金额，不会发起微信或支付宝支付。</text>
	</view>
</template>

<script>
import { PAYMENT_CHANNELS, parsePaymentAmounts, amountToCents, formatMoney } from '../services/payment-rules.js'
export default {
	props: { existing: { type: Object, default: null } }, emits: ['submit'],
	data() { return { channels: PAYMENT_CHANNELS, amounts: this.valuesFromReceipt(this.existing), error: '' } },
	computed: { total() { try { return formatMoney(Object.values(this.amounts).reduce((sum, value) => sum + amountToCents(value), 0)) } catch { return '待校验' } } },
	watch: { amounts: { deep: true, handler() { this.error = '' } }, existing: { deep: true, handler(value) { this.amounts = this.valuesFromReceipt(value) } } },
	methods: {
		valuesFromReceipt(receipt) { return Object.fromEntries(PAYMENT_CHANNELS.map(channel => [channel.key, receipt ? formatMoney(receipt.amounts?.[channel.key] || 0) : ''])) },
		submit() { try { parsePaymentAmounts(this.amounts); this.error = ''; this.$emit('submit', { ...this.amounts }) } catch (error) { this.error = error.message } }
	}
}
</script>

<style scoped>
.payment-form{margin-top:12px}.payment-help{display:block;color:var(--muted);font-size:11px;line-height:1.7;overflow-wrap:anywhere}.payment-field{margin-top:12px}.payment-label{display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-bottom:7px}.online-note{color:var(--muted);font-size:10px}.payment-input{display:flex;align-items:center;gap:8px;padding:0 12px;background:var(--surface-soft);border:1px solid var(--line);border-radius:12px;color:var(--muted)}.payment-input:focus-within{border-color:var(--accent)}.payment-input input{flex:1;min-width:0;height:46px;width:100%;padding:0;color:var(--text);background:transparent;border:0;font-size:14px}.payment-total{display:flex;justify-content:space-between;gap:8px;margin:16px 0;font-size:12px;flex-wrap:wrap}.payment-total text:last-child{color:var(--accent);font-weight:700}.payment-error{display:block;color:var(--danger);font-size:12px;line-height:1.6;margin-bottom:10px}.payment-submit{display:flex;align-items:center;justify-content:center;min-height:44px;border-radius:12px;background:var(--accent);color:#2a2216;font-size:13px;font-weight:700;border:0;margin:12px 0 0;padding:8px 12px;line-height:1.5}.payment-submit::after{border:0}.payment-submit:active{opacity:.8}.payment-submit:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.payment-footnote{font-size:10px;margin-top:8px}
</style>

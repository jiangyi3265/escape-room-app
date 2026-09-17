<script>
	export default {
		onLaunch: function() {
			// #ifdef MP-WEIXIN
			if (typeof wx !== 'undefined' && wx.cloud) wx.cloud.init({ traceUser: true })
			// #endif
			console.log('零零谷九汇城店启动')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	page {
		background: #171816;
		background: oklch(20.5% 0.005 110);
		color: #f3f0e8;
		color: oklch(95.4% 0.012 88);
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
	}

	view, text, input, textarea, button {
		box-sizing: border-box;
	}

	button {
		font-family: inherit;
	}
</style>
